import type {
  NormalizedArticle,
  FramingAnalysis,
  TerminologyDivergence,
  FramingDimension,
} from '../types.js'

const FRAMING_DIMENSIONS = [
  'victim/perpetrator framing',
  'cause attribution',
  'solution framing',
  'moral judgment',
  'urgency framing',
  'international responsibility',
  'historical context',
  'humanitarian angle',
]

function detectTerminologyDivergence(
  arabicTerms: string[],
  westernTerms: string[],
  concept: string,
): TerminologyDivergence {
  const aSet = new Set(arabicTerms.map(t => t.toLowerCase()))
  const wSet = new Set(westernTerms.map(t => t.toLowerCase()))

  const overlap = [...aSet].filter(t => wSet.has(t)).length
  const totalUnique = new Set([...aSet, ...wSet]).size
  const overlapRatio = totalUnique > 0 ? overlap / totalUnique : 1

  let divergenceLevel: TerminologyDivergence['divergence_level']
  if (overlapRatio >= 0.7) divergenceLevel = 'low'
  else if (overlapRatio >= 0.4) divergenceLevel = 'medium'
  else if (overlapRatio >= 0.15) divergenceLevel = 'high'
  else divergenceLevel = 'critical'

  return {
    concept,
    arabic_terms: arabicTerms,
    western_terms: westernTerms,
    divergence_level: divergenceLevel,
  }
}

function extractKeyTerms(articles: NormalizedArticle[]): string[] {
  const freq: Record<string, number> = {}
  for (const article of articles) {
    for (const term of article.key_terms) {
      freq[term] = (freq[term] ?? 0) + 1
    }
  }
  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([term]) => term)
}

function inferNarrativeTone(
  articles: NormalizedArticle[],
): FramingAnalysis['narrative_tone']['arabic'] {
  if (articles.length === 0) return 'neutral'

  const avgPositive = articles.reduce((s, a) => s + a.sentiment.positive, 0) / articles.length
  const avgNegative = articles.reduce((s, a) => s + a.sentiment.negative, 0) / articles.length
  const avgNeutral = articles.reduce((s, a) => s + a.sentiment.neutral, 0) / articles.length

  if (avgNegative > 0.6) return 'critical'
  if (avgNegative > 0.45 && avgPositive < 0.2) return 'alarmist'
  if (avgPositive > 0.5) return 'sympathetic'
  if (avgNeutral > 0.55) return 'analytical'
  return 'neutral'
}

function buildFramingDimensions(
  arabicTopics: string[],
  westernTopics: string[],
): FramingDimension[] {
  const aSet = new Set(arabicTopics)
  const wSet = new Set(westernTopics)

  return FRAMING_DIMENSIONS.map(dim => {
    const arabicStance = aSet.has(dim) ? 'prominent in coverage' : 'largely absent'
    const westernStance = wSet.has(dim) ? 'prominent in coverage' : 'largely absent'
    const divergenceNote =
      arabicStance === westernStance
        ? 'Both camps align on this dimension'
        : `Divergence: Arabic media ${arabicStance}, Western media ${westernStance}`

    return { dimension: dim, arabic_stance: arabicStance, western_stance: westernStance, divergence_note: divergenceNote }
  })
}

export function runFramingEngine(
  topic: string,
  arabicArticles: NormalizedArticle[],
  westernArticles: NormalizedArticle[],
): FramingAnalysis {
  const arabicTerms = extractKeyTerms(arabicArticles)
  const westernTerms = extractKeyTerms(westernArticles)

  const arabicTopics = [...new Set(arabicArticles.flatMap(a => a.topics))]
  const westernTopics = [...new Set(westernArticles.flatMap(a => a.topics))]

  const sharedAngles = arabicTopics.filter(t => westernTopics.includes(t))
  const arabicOnly = arabicTopics.filter(t => !westernTopics.includes(t))
  const westernOnly = westernTopics.filter(t => !arabicTopics.includes(t))

  const arabicTone = inferNarrativeTone(arabicArticles)
  const westernTone = inferNarrativeTone(westernArticles)

  const terminologyDivergences: TerminologyDivergence[] = [
    detectTerminologyDivergence(arabicTerms.slice(0, 10), westernTerms.slice(0, 10), topic),
  ]

  const framingDimensions = buildFramingDimensions(arabicTopics, westernTopics)

  const divergentDimensions = framingDimensions.filter(
    d => !d.divergence_note.startsWith('Both camps align')
  )
  const overallDivergence: FramingAnalysis['overall_divergence'] =
    divergentDimensions.length >= 6 ? 'critical'
    : divergentDimensions.length >= 4 ? 'high'
    : divergentDimensions.length >= 2 ? 'medium'
    : 'low'

  const keyFinding =
    overallDivergence === 'critical'
      ? `Arabic and Western media portray "${topic}" through fundamentally different lenses. Tone: ${arabicTone} (Arabic) vs ${westernTone} (Western). ${divergentDimensions.length} of ${FRAMING_DIMENSIONS.length} framing dimensions diverge.`
      : overallDivergence === 'high'
      ? `Significant framing gap on "${topic}". ${arabicOnly.length} angles exclusive to Arabic media, ${westernOnly.length} exclusive to Western media.`
      : `Moderate alignment on "${topic}" with ${sharedAngles.length} shared angles. Tonal differences remain (${arabicTone} vs ${westernTone}).`

  return {
    topic,
    terminology_divergences: terminologyDivergences,
    framing_dimensions: framingDimensions,
    angle_map: {
      arabic_angles: arabicOnly,
      western_angles: westernOnly,
      shared_angles: sharedAngles,
    },
    narrative_tone: { arabic: arabicTone, western: westernTone },
    overall_divergence: overallDivergence,
    key_finding: keyFinding,
  }
}
