import type {
  NormalizedArticle,
  TrendAnalysis,
  TrendDataPoint,
  TrendDirection,
  TimeRange,
} from '../types.js'

function groupByDate(articles: NormalizedArticle[]): Map<string, NormalizedArticle[]> {
  const map = new Map<string, NormalizedArticle[]>()
  for (const a of articles) {
    const day = a.published_at.substring(0, 10)
    if (!map.has(day)) map.set(day, [])
    map.get(day)!.push(a)
  }
  return map
}

function avgSentiment(articles: NormalizedArticle[]): number {
  if (articles.length === 0) return 0
  return articles.reduce((s, a) => s + a.sentiment.positive - a.sentiment.negative, 0) / articles.length
}

function detectDirection(counts: number[]): TrendDirection {
  if (counts.length < 2) return 'stable'

  const first = counts.slice(0, Math.ceil(counts.length / 2))
  const second = counts.slice(Math.floor(counts.length / 2))

  const firstAvg = first.reduce((s, c) => s + c, 0) / first.length
  const secondAvg = second.reduce((s, c) => s + c, 0) / second.length

  const max = Math.max(...counts)
  const min = Math.min(...counts)
  const volatility = (max - min) / Math.max(firstAvg, 1)

  if (volatility > 2) return 'volatile'

  const peak = counts.indexOf(max)
  if (peak > 0 && peak < counts.length - 1 && max > firstAvg * 2) return 'spike'

  const change = (secondAvg - firstAvg) / Math.max(firstAvg, 1)
  if (change > 0.3) return 'rising'
  if (change < -0.3) return 'falling'
  return 'stable'
}

function computeVelocity(counts: number[]): number {
  if (counts.length < 2) return 0
  const recentWindow = counts.slice(-3)
  const earlierWindow = counts.slice(0, 3)
  const recentAvg = recentWindow.reduce((s, c) => s + c, 0) / recentWindow.length
  const earlierAvg = earlierWindow.reduce((s, c) => s + c, 0) / Math.max(earlierWindow.length, 1)
  return Math.round(((recentAvg - earlierAvg) / Math.max(earlierAvg, 1)) * 100)
}

export function runTrendEngine(
  topic: string,
  articles: NormalizedArticle[],
  timeWindow: TimeRange,
): TrendAnalysis {
  const byDate = groupByDate(articles)
  const sortedDates = [...byDate.keys()].sort()

  const dataPoints: TrendDataPoint[] = sortedDates.map(date => {
    const dayArticles = byDate.get(date)!
    const dominantTopics = dayArticles.flatMap(a => a.topics)
    const topicFreq: Record<string, number> = {}
    for (const t of dominantTopics) topicFreq[t] = (topicFreq[t] ?? 0) + 1
    const dominantAngle = Object.entries(topicFreq).sort((a, b) => b[1] - a[1])[0]?.[0] ?? topic

    return {
      date,
      article_count: dayArticles.length,
      sentiment_avg: Math.round(avgSentiment(dayArticles) * 100) / 100,
      dominant_angle: dominantAngle,
    }
  })

  const counts = dataPoints.map(p => p.article_count)
  const trendDirection = detectDirection(counts)
  const velocity = computeVelocity(counts)

  // Peak moment: date with most articles
  let peakMoment: TrendAnalysis['peak_moment'] = null
  if (dataPoints.length > 0) {
    const peak = dataPoints.reduce((a, b) => a.article_count >= b.article_count ? a : b)
    if (peak.article_count > 1) {
      const peakDate = byDate.get(peak.date)!
      const triggerSource = peakDate[0]?.source ?? 'multiple sources'
      peakMoment = {
        date: peak.date,
        trigger: `${peak.article_count} articles from ${triggerSource} and others covering "${peak.dominant_angle}"`,
      }
    }
  }

  const forecastNote = trendDirection === 'rising'
    ? `Coverage is accelerating (+${velocity}%). Expect continued growth in the next cycle.`
    : trendDirection === 'falling'
    ? `Coverage is declining (${velocity}%). Topic may be losing media salience.`
    : trendDirection === 'spike'
    ? `Coverage spiked then receded. Monitor for secondary wave or follow-up coverage.`
    : trendDirection === 'volatile'
    ? `Highly volatile coverage pattern. Topic sensitivity is elevated.`
    : `Coverage is stable. No major trend acceleration detected.`

  return {
    topic,
    time_window: timeWindow,
    data_points: dataPoints,
    trend_direction: trendDirection,
    peak_moment: peakMoment,
    velocity,
    forecast_note: forecastNote,
  }
}
