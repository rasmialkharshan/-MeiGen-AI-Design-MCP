/**
 * Tool: misbar_analyze_coverage
 * Intelligence Engine — Gap Detection Engine (Coverage Gap Matrix)
 */

import { z } from 'zod'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { runGapEngine } from '../misbar/intelligence/gap-engine.js'
import type { NormalizedArticle } from '../misbar/types.js'

const NormalizedArticleSchema = z.object({
  id: z.string(),
  url: z.string(),
  title: z.string(),
  body: z.string(),
  source: z.string(),
  source_camp: z.enum(['arabic', 'western', 'global', 'think_tank']),
  language: z.enum(['ar', 'en', 'fr', 'other']),
  published_at: z.string(),
  author: z.string().optional(),
  tags: z.array(z.string()).optional(),
  translated_title: z.string().optional(),
  translated_body: z.string().optional(),
  entities: z.array(z.object({
    name: z.string(),
    type: z.enum(['person', 'country', 'organization', 'location', 'concept']),
    mentions: z.number(),
    sentiment: z.object({
      positive: z.number(),
      negative: z.number(),
      neutral: z.number(),
      overall: z.enum(['positive', 'negative', 'neutral', 'mixed']),
    }).optional(),
  })),
  topics: z.array(z.string()),
  sentiment: z.object({
    positive: z.number(),
    negative: z.number(),
    neutral: z.number(),
    overall: z.enum(['positive', 'negative', 'neutral', 'mixed']),
  }),
  word_count: z.number(),
  key_terms: z.array(z.string()),
})

const schema = {
  topic: z.string().describe('The research topic being analyzed'),
  normalized_articles: z.array(NormalizedArticleSchema).min(1).describe(
    'Normalized articles from misbar_normalize_articles. Will be automatically split by source_camp.'
  ),
}

export function registerMisbarAnalyzeCoverage(server: McpServer) {
  server.tool(
    'misbar_analyze_coverage',
    [
      'Gap Detection Engine: analyzes coverage asymmetries between Arabic and Western media.',
      'Computes: article density, depth scores, angle diversity, and exclusive angles per camp.',
      'Produces a Coverage Gap Matrix with a gap_score (0–100).',
      'Use this to identify what each camp is ignoring or underreporting about the topic.',
    ].join(' '),
    schema,
    { readOnlyHint: true },
    async ({ topic, normalized_articles }) => {
      const arabic = normalized_articles.filter(a => a.source_camp === 'arabic') as NormalizedArticle[]
      const western = normalized_articles.filter(a => a.source_camp === 'western') as NormalizedArticle[]
      const thinkTank = normalized_articles.filter(a => a.source_camp === 'think_tank') as NormalizedArticle[]

      const gapMatrix = runGapEngine(topic, arabic, western)

      const gapLevel =
        gapMatrix.gap_score >= 70 ? 'CRITICAL'
        : gapMatrix.gap_score >= 45 ? 'HIGH'
        : gapMatrix.gap_score >= 20 ? 'MODERATE'
        : 'LOW'

      const decisionLogic =
        gapMatrix.gap_score >= 45
          ? `coverage_arabic ≠ coverage_western → GAP DETECTED (score: ${gapMatrix.gap_score}/100)`
          : `coverage_arabic ≈ coverage_western → Coverage balanced (score: ${gapMatrix.gap_score}/100)`

      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({
            gap_matrix: gapMatrix,
            gap_level: gapLevel,
            decision_logic: decisionLogic,
            think_tank_articles: thinkTank.length,
            analysis_note: thinkTank.length > 0
              ? `${thinkTank.length} think tank sources available for deeper context`
              : 'No think tank sources found — consider adding policy/research documents',
            next_steps: [
              gapMatrix.gap_score >= 45 ? '→ PRIORITY: Call misbar_analyze_framing to understand WHY the gap exists' : '→ Call misbar_analyze_framing for terminology comparison',
              'Call misbar_analyze_narratives to map dominant vs competing narratives',
              'Call misbar_analyze_trends if temporal pattern is important for this topic',
            ],
          }, null, 2),
        }],
      }
    }
  )
}
