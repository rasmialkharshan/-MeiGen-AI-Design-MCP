/**
 * Tool: misbar_normalize_articles
 * Processing & Normalization Layer — converts raw articles into structured NormalizedArticle[]
 */

import { z } from 'zod'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { RawArticle, NormalizedArticle, Entity, SentimentScore, ArticleLanguage, MediaCamp } from '../misbar/types.js'
import { randomUUID } from 'crypto'

const RawArticleSchema = z.object({
  title: z.string(),
  body: z.string(),
  source: z.string(),
  url: z.string().optional().default(''),
  published_at: z.string().describe('ISO date string, e.g. 2024-01-15'),
  author: z.string().optional(),
  tags: z.array(z.string()).optional(),
  source_camp: z.enum(['arabic', 'western', 'global', 'think_tank']).optional(),
  language: z.enum(['ar', 'en', 'fr', 'other']).optional(),
})

const schema = {
  articles: z.array(RawArticleSchema).min(1).max(200).describe(
    'Array of raw articles collected from media sources. Each needs at minimum: title, body, source, published_at.'
  ),
  topic: z.string().describe('The research topic — used to score relevance and extract entities'),
}

function detectLanguage(text: string): ArticleLanguage {
  const arabicChars = (text.match(/[؀-ۿ]/g) ?? []).length
  const total = text.length
  if (arabicChars / total > 0.3) return 'ar'
  if (/[àâçèéêëîïôùûüÿœæ]/i.test(text)) return 'fr'
  return 'en'
}

function inferCamp(source: string, language: ArticleLanguage): MediaCamp {
  const arabicSources = ['al jazeera', 'al arabiya', 'bbc arabic', 'asharq', 'al-monitor', 'arab news', 'middle east eye', 'sky news arabia']
  const lc = source.toLowerCase()
  if (language === 'ar' || arabicSources.some(s => lc.includes(s.split(' ')[0]))) return 'arabic'
  if (lc.includes('brookings') || lc.includes('rand') || lc.includes('carnegie') || lc.includes('csis') || lc.includes('wilson')) return 'think_tank'
  return 'western'
}

function extractEntities(text: string, topic: string): Entity[] {
  const entities: Entity[] = []
  const seen = new Set<string>()

  // Topic itself as a concept
  if (!seen.has(topic)) {
    seen.add(topic)
    const mentions = (text.match(new RegExp(topic.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi')) ?? []).length
    entities.push({ name: topic, type: 'concept', mentions: Math.max(mentions, 1) })
  }

  // Simple pattern: capitalized words that repeat (likely proper nouns)
  const words = text.split(/\s+/)
  const freq: Record<string, number> = {}
  for (const w of words) {
    if (w.length > 3 && /^[A-Z]/.test(w)) {
      const clean = w.replace(/[^a-zA-Z]/g, '')
      if (clean.length > 3) freq[clean] = (freq[clean] ?? 0) + 1
    }
  }

  const topEntities = Object.entries(freq)
    .filter(([, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)

  const stopWords = new Set(['This', 'That', 'They', 'Their', 'There', 'With', 'From', 'When', 'What', 'Where'])
  for (const [name, mentions] of topEntities) {
    if (!seen.has(name) && !stopWords.has(name)) {
      seen.add(name)
      entities.push({ name, type: 'person', mentions })
    }
  }

  return entities.slice(0, 10)
}

function scoreSentiment(text: string): SentimentScore {
  const positiveWords = ['peace', 'success', 'growth', 'agreement', 'progress', 'support', 'aid', 'hope', 'سلام', 'نجاح', 'تقدم', 'دعم', 'أمل']
  const negativeWords = ['war', 'conflict', 'crisis', 'attack', 'death', 'violence', 'terror', 'kill', 'bomb', 'حرب', 'صراع', 'أزمة', 'هجوم', 'موت', 'قتل', 'قصف']

  const lc = text.toLowerCase()
  const posCount = positiveWords.filter(w => lc.includes(w)).length
  const negCount = negativeWords.filter(w => lc.includes(w)).length
  const total = posCount + negCount

  if (total === 0) return { positive: 0.1, negative: 0.1, neutral: 0.8, overall: 'neutral' }

  const pos = Math.round((posCount / (total + 3)) * 100) / 100
  const neg = Math.round((negCount / (total + 3)) * 100) / 100
  const neu = Math.round((1 - pos - neg) * 100) / 100

  const overall: SentimentScore['overall'] =
    pos > neg && pos > 0.35 ? 'positive'
    : neg > pos && neg > 0.35 ? 'negative'
    : pos > 0.2 && neg > 0.2 ? 'mixed'
    : 'neutral'

  return { positive: pos, negative: neg, neutral: Math.max(neu, 0), overall }
}

function extractTopics(text: string, globalTopic: string): string[] {
  const topics: string[] = [globalTopic]

  const TOPIC_KEYWORDS: Record<string, string[]> = {
    'humanitarian crisis': ['humanitarian', 'refugees', 'displacement', 'aid', 'إنساني', 'لاجئين'],
    'military conflict': ['military', 'troops', 'offensive', 'ceasefire', 'عسكري', 'هجوم', 'هدنة'],
    'diplomatic relations': ['diplomacy', 'sanctions', 'treaty', 'negotiations', 'دبلوماسي', 'مفاوضات'],
    'economic impact': ['economy', 'trade', 'sanctions', 'oil', 'اقتصاد', 'تجارة', 'نفط'],
    'human rights': ['human rights', 'civilians', 'violations', 'حقوق الإنسان', 'مدنيون'],
    'international response': ['UN', 'NATO', 'international', 'دولي', 'الأمم المتحدة'],
    'media framing': ['coverage', 'media', 'narrative', 'تغطية', 'إعلام', 'رواية'],
    'political context': ['government', 'parliament', 'election', 'حكومة', 'انتخابات'],
  }

  const lc = text.toLowerCase()
  for (const [topic, keywords] of Object.entries(TOPIC_KEYWORDS)) {
    if (keywords.some(kw => lc.includes(kw))) {
      topics.push(topic)
    }
  }

  return [...new Set(topics)].slice(0, 6)
}

function extractKeyTerms(title: string, body: string): string[] {
  const text = `${title} ${body}`.toLowerCase()
  const words = text.split(/\W+/).filter(w => w.length > 5)
  const freq: Record<string, number> = {}
  for (const w of words) freq[w] = (freq[w] ?? 0) + 1

  const stopWords = new Set(['about', 'after', 'before', 'between', 'during', 'their', 'there', 'which', 'would', 'could', 'should', 'through', 'these'])
  return Object.entries(freq)
    .filter(([w, c]) => c >= 2 && !stopWords.has(w))
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .map(([w]) => w)
}

export function registerMisbarNormalize(server: McpServer) {
  server.tool(
    'misbar_normalize_articles',
    [
      'Process and normalize raw articles into structured NormalizedArticle[] ready for intelligence analysis.',
      'Performs: language detection, camp inference (arabic/western), entity extraction,',
      'topic clustering, sentiment scoring, and noise filtering.',
      'Pass the output directly to misbar_analyze_coverage, misbar_analyze_framing, and misbar_analyze_narratives.',
    ].join(' '),
    schema,
    { readOnlyHint: true },
    async ({ articles, topic }) => {
      const normalized: NormalizedArticle[] = articles.map(a => {
        const language = a.language ?? detectLanguage(`${a.title} ${a.body}`)
        const source_camp = a.source_camp ?? inferCamp(a.source, language as ArticleLanguage)
        const entities = extractEntities(`${a.title} ${a.body}`, topic)
        const topics = extractTopics(`${a.title} ${a.body}`, topic)
        const sentiment = scoreSentiment(`${a.title} ${a.body}`)
        const key_terms = extractKeyTerms(a.title, a.body)
        const word_count = a.body.split(/\s+/).length

        return {
          id: randomUUID(),
          url: a.url ?? '',
          title: a.title,
          body: a.body,
          source: a.source,
          source_camp: source_camp as MediaCamp,
          language: language as ArticleLanguage,
          published_at: a.published_at,
          author: a.author,
          tags: a.tags,
          entities,
          topics,
          sentiment,
          word_count,
          key_terms,
        }
      })

      const arabicCount = normalized.filter(a => a.source_camp === 'arabic').length
      const westernCount = normalized.filter(a => a.source_camp === 'western').length
      const thinkTankCount = normalized.filter(a => a.source_camp === 'think_tank').length

      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({
            normalized_articles: normalized,
            summary: {
              total: normalized.length,
              arabic: arabicCount,
              western: westernCount,
              think_tank: thinkTankCount,
              avg_word_count: Math.round(normalized.reduce((s, a) => s + a.word_count, 0) / normalized.length),
            },
            next_steps: [
              'Pass normalized_articles to misbar_analyze_coverage',
              'Pass normalized_articles to misbar_analyze_framing',
              'Pass normalized_articles to misbar_analyze_narratives',
            ],
          }, null, 2),
        }],
      }
    }
  )
}
