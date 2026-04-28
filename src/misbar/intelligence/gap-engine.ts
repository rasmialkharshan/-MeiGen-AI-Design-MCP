import type {
  NormalizedArticle,
  CoverageMetrics,
  CoverageGapMatrix,
} from '../types.js'

function computeMetrics(articles: NormalizedArticle[]): CoverageMetrics {
  if (articles.length === 0) {
    return {
      article_count: 0,
      source_count: 0,
      avg_word_count: 0,
      depth_score: 0,
      angle_diversity: 0,
      time_distribution: {},
    }
  }

  const sources = new Set(articles.map(a => a.source))
  const avgWords = articles.reduce((s, a) => s + a.word_count, 0) / articles.length

  // depth_score: combination of avg word count (>800 = deep) and source diversity
  const depthScore = Math.min(100,
    (avgWords / 1200) * 60 + (sources.size / Math.max(articles.length, 1)) * 40
  )

  // angle_diversity: how many distinct topics appear across articles
  const allTopics = new Set(articles.flatMap(a => a.topics))
  const angleDiversity = Math.min(100, (allTopics.size / Math.max(articles.length * 0.5, 1)) * 100)

  // time_distribution: count articles per date (YYYY-MM-DD)
  const timeDistribution: Record<string, number> = {}
  for (const a of articles) {
    const day = a.published_at.substring(0, 10)
    timeDistribution[day] = (timeDistribution[day] ?? 0) + 1
  }

  return {
    article_count: articles.length,
    source_count: sources.size,
    avg_word_count: Math.round(avgWords),
    depth_score: Math.round(depthScore),
    angle_diversity: Math.round(angleDiversity),
    time_distribution: timeDistribution,
  }
}

function extractAngles(articles: NormalizedArticle[]): string[] {
  const angleSet = new Set<string>()
  for (const a of articles) {
    for (const t of a.topics) angleSet.add(t)
  }
  return [...angleSet]
}

export function runGapEngine(
  topic: string,
  arabicArticles: NormalizedArticle[],
  westernArticles: NormalizedArticle[],
): CoverageGapMatrix {
  const arabicMetrics = computeMetrics(arabicArticles)
  const westernMetrics = computeMetrics(westernArticles)

  const arabicAngles = new Set(extractAngles(arabicArticles))
  const westernAngles = new Set(extractAngles(westernArticles))

  const sharedAngles = [...arabicAngles].filter(a => westernAngles.has(a))
  const exclusiveArabic = [...arabicAngles].filter(a => !westernAngles.has(a))
  const exclusiveWestern = [...westernAngles].filter(a => !arabicAngles.has(a))

  // Underreported: angles present in one camp but absent in the other
  const underreportedByArabic = exclusiveWestern.slice(0, 10)
  const underreportedByWestern = exclusiveArabic.slice(0, 10)

  // Gap score: weighted difference in depth + angle coverage
  const countGap = Math.abs(arabicMetrics.article_count - westernMetrics.article_count) /
    Math.max(arabicMetrics.article_count + westernMetrics.article_count, 1)
  const depthGap = Math.abs(arabicMetrics.depth_score - westernMetrics.depth_score) / 100
  const angleGap = (exclusiveArabic.length + exclusiveWestern.length) /
    Math.max(arabicAngles.size + westernAngles.size, 1)

  const gapScore = Math.min(100, Math.round((countGap * 30 + depthGap * 40 + angleGap * 30) * 100))

  const dominantCamp = arabicMetrics.article_count >= westernMetrics.article_count ? 'Arabic' : 'Western'
  const summary = gapScore >= 60
    ? `Critical coverage gap detected. ${dominantCamp} media dominates with ${exclusiveArabic.length + exclusiveWestern.length} exclusive angles unaddressed by the opposing camp.`
    : gapScore >= 30
    ? `Moderate coverage divergence. ${sharedAngles.length} shared angles exist but ${exclusiveArabic.length + exclusiveWestern.length} angles remain in silos.`
    : `Coverage is relatively balanced with ${sharedAngles.length} shared angles. Minor gaps in depth exist.`

  return {
    topic,
    arabic_metrics: arabicMetrics,
    western_metrics: westernMetrics,
    gap_score: gapScore,
    underreported_by_arabic: underreportedByArabic,
    underreported_by_western: underreportedByWestern,
    exclusive_arabic_angles: exclusiveArabic,
    exclusive_western_angles: exclusiveWestern,
    shared_angles: sharedAngles,
    summary,
  }
}
