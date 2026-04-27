import type {
  NormalizedArticle,
  NarrativeAnalysis,
  Narrative,
  NarrativeTurningPoint,
  MediaCamp,
} from '../types.js'
import { randomUUID } from 'crypto'

const EMOTIONAL_REGISTERS = [
  'fear', 'hope', 'anger', 'neutral', 'pride', 'grief',
] as const

function detectEmotionalRegister(
  articles: NormalizedArticle[],
): Narrative['emotional_register'] {
  if (articles.length === 0) return 'neutral'

  const avgNeg = articles.reduce((s, a) => s + a.sentiment.negative, 0) / articles.length
  const avgPos = articles.reduce((s, a) => s + a.sentiment.positive, 0) / articles.length

  if (avgNeg > 0.5) return avgNeg > 0.7 ? 'grief' : 'anger'
  if (avgPos > 0.5) return 'hope'
  if (avgNeg > 0.3 && avgPos < 0.2) return 'fear'
  return 'neutral'
}

function clusterByTopic(
  articles: NormalizedArticle[],
): Map<string, NormalizedArticle[]> {
  const clusters = new Map<string, NormalizedArticle[]>()
  for (const article of articles) {
    const primaryTopic = article.topics[0] ?? 'general'
    if (!clusters.has(primaryTopic)) clusters.set(primaryTopic, [])
    clusters.get(primaryTopic)!.push(article)
  }
  return clusters
}

function buildNarrative(
  topic: string,
  articles: NormalizedArticle[],
  camp: MediaCamp,
): Narrative {
  const sources = [...new Set(articles.map(a => a.source))].slice(0, 5)
  const entities = articles
    .flatMap(a => a.entities)
    .filter(e => e.type !== 'concept')
    .sort((a, b) => b.mentions - a.mentions)
    .slice(0, 3)
    .map(e => e.name)

  const keyClaims = [
    `Coverage concentrated around: ${sources.slice(0, 3).join(', ')}`,
    entities.length > 0 ? `Key actors: ${entities.join(', ')}` : null,
    `${articles.length} articles form this narrative cluster`,
  ].filter(Boolean) as string[]

  const strength = Math.min(100, articles.length * 10 + sources.length * 5)

  return {
    id: randomUUID(),
    title: topic,
    description: `Narrative cluster around "${topic}" sourced primarily from ${camp} media`,
    dominant_in: [camp],
    supporting_sources: sources,
    key_claims: keyClaims,
    emotional_register: detectEmotionalRegister(articles),
    strength,
  }
}

function detectTurningPoints(articles: NormalizedArticle[]): NarrativeTurningPoint[] {
  if (articles.length < 2) return []

  // Sort by date
  const sorted = [...articles].sort(
    (a, b) => new Date(a.published_at).getTime() - new Date(b.published_at).getTime()
  )

  const turningPoints: NarrativeTurningPoint[] = []
  let prevDay = ''
  let prevCount = 0

  const byDay: Record<string, NormalizedArticle[]> = {}
  for (const a of sorted) {
    const day = a.published_at.substring(0, 10)
    if (!byDay[day]) byDay[day] = []
    byDay[day].push(a)
  }

  for (const [day, dayArticles] of Object.entries(byDay)) {
    const count = dayArticles.length
    if (prevCount > 0 && count >= prevCount * 2.5) {
      const topicSnapshot = dayArticles[0]?.topics[0] ?? 'unknown'
      turningPoints.push({
        date: day,
        event: `Coverage surge: ${count} articles (${Math.round((count / prevCount) * 100)}% increase from ${prevDay})`,
        narrative_shift: `Narrative focus shifted toward "${topicSnapshot}"`,
        triggered_by: dayArticles[0]?.source ?? 'unknown source',
      })
    }
    prevDay = day
    prevCount = count
  }

  return turningPoints.slice(0, 5)
}

export function runNarrativeEngine(
  topic: string,
  arabicArticles: NormalizedArticle[],
  westernArticles: NormalizedArticle[],
): NarrativeAnalysis {
  const arabicClusters = clusterByTopic(arabicArticles)
  const westernClusters = clusterByTopic(westernArticles)

  // Build narratives from top clusters
  const allNarratives: Narrative[] = []

  for (const [clusterTopic, articles] of arabicClusters) {
    if (articles.length >= 2) {
      allNarratives.push(buildNarrative(clusterTopic, articles, 'arabic'))
    }
  }
  for (const [clusterTopic, articles] of westernClusters) {
    if (articles.length >= 2) {
      allNarratives.push(buildNarrative(clusterTopic, articles, 'western'))
    }
  }

  const sorted = allNarratives.sort((a, b) => b.strength - a.strength)
  const dominant = sorted.slice(0, 3)
  const competing = sorted.slice(3, 7)

  const allArticles = [...arabicArticles, ...westernArticles]
  const turningPoints = detectTurningPoints(allArticles)

  const contestedClaims: string[] = []
  for (const an of dominant) {
    for (const cn of competing) {
      if (an.dominant_in[0] !== cn.dominant_in[0]) {
        contestedClaims.push(
          `"${an.title}" (${an.dominant_in[0]}) vs "${cn.title}" (${cn.dominant_in[0]})`
        )
      }
    }
  }

  const evolutionSummary = turningPoints.length > 0
    ? `Narrative evolved through ${turningPoints.length} key shift(s). Most significant: ${turningPoints[0]?.event ?? 'surge in coverage'}.`
    : `Narrative around "${topic}" remained relatively stable with no major turning points detected.`

  return {
    topic,
    dominant_narratives: dominant,
    competing_narratives: competing,
    turning_points: turningPoints,
    narrative_evolution_summary: evolutionSummary,
    contested_claims: contestedClaims.slice(0, 5),
  }
}
