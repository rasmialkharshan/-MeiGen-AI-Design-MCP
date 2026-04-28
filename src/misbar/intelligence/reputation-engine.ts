import type {
  NormalizedArticle,
  ReputationAnalysis,
  SentimentScore,
  MediaCamp,
} from '../types.js'

function aggregateSentiment(articles: NormalizedArticle[]): SentimentScore {
  if (articles.length === 0) {
    return { positive: 0, negative: 0, neutral: 1, overall: 'neutral' }
  }

  const avg = {
    positive: articles.reduce((s, a) => s + a.sentiment.positive, 0) / articles.length,
    negative: articles.reduce((s, a) => s + a.sentiment.negative, 0) / articles.length,
    neutral: articles.reduce((s, a) => s + a.sentiment.neutral, 0) / articles.length,
  }

  const roundTo2 = (n: number) => Math.round(n * 100) / 100

  const overall: SentimentScore['overall'] =
    avg.positive > 0.5 ? 'positive'
    : avg.negative > 0.5 ? 'negative'
    : avg.positive > 0.3 && avg.negative > 0.3 ? 'mixed'
    : 'neutral'

  return {
    positive: roundTo2(avg.positive),
    negative: roundTo2(avg.negative),
    neutral: roundTo2(avg.neutral),
    overall,
  }
}

function computeReachScore(articles: NormalizedArticle[]): number {
  const sources = new Set(articles.map(a => a.source))
  // Proxy: source diversity * article volume relative to a normalization factor
  const raw = sources.size * 15 + articles.length * 3
  return Math.min(100, Math.round(raw))
}

function extractEntityNarratives(entity: string, articles: NormalizedArticle[]): string[] {
  const narratives: string[] = []
  for (const article of articles) {
    const entityMention = article.entities.find(
      e => e.name.toLowerCase().includes(entity.toLowerCase())
    )
    if (entityMention) {
      const sentimentLabel = entityMention.sentiment?.overall ?? article.sentiment.overall
      narratives.push(
        `${article.source}: ${sentimentLabel} portrayal — "${article.title.slice(0, 80)}"`
      )
    }
  }
  return narratives.slice(0, 6)
}

function computeReputationRisk(
  sentiment: SentimentScore,
  reachScore: number,
): ReputationAnalysis['reputation_risk'] {
  if (sentiment.negative > 0.6 && reachScore > 60) return 'critical'
  if (sentiment.negative > 0.5 && reachScore > 40) return 'high'
  if (sentiment.negative > 0.35 || reachScore > 70) return 'medium'
  return 'low'
}

function extractReputationDrivers(
  entity: string,
  articles: NormalizedArticle[],
): string[] {
  const topics = articles.flatMap(a => a.topics)
  const freq: Record<string, number> = {}
  for (const t of topics) freq[t] = (freq[t] ?? 0) + 1
  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([t]) => t)
}

export function runReputationEngine(
  entity: string,
  topic: string,
  arabicArticles: NormalizedArticle[],
  westernArticles: NormalizedArticle[],
): ReputationAnalysis {
  const allArticles = [...arabicArticles, ...westernArticles]

  const overallSentiment = aggregateSentiment(allArticles)
  const arabicSentiment = aggregateSentiment(arabicArticles)
  const westernSentiment = aggregateSentiment(westernArticles)
  const reachScore = computeReachScore(allArticles)
  const reputationRisk = computeReputationRisk(overallSentiment, reachScore)

  const keyNarratives = extractEntityNarratives(entity, allArticles)
  const reputationDrivers = extractReputationDrivers(entity, allArticles)

  const alertTriggered =
    reputationRisk === 'critical' ||
    (reputationRisk === 'high' && overallSentiment.negative > 0.55)

  const alertReason = alertTriggered
    ? `${reputationRisk.toUpperCase()} reputation risk: ${Math.round(overallSentiment.negative * 100)}% negative sentiment across ${allArticles.length} articles from ${new Set(allArticles.map(a => a.source)).size} sources.`
    : undefined

  return {
    entity,
    topic,
    sentiment: overallSentiment,
    reach_score: reachScore,
    reputation_risk: reputationRisk,
    arabic_reputation: arabicSentiment,
    western_reputation: westernSentiment,
    key_narratives_about_entity: keyNarratives,
    reputation_drivers: reputationDrivers,
    alert_triggered: alertTriggered,
    alert_reason: alertReason,
  }
}
