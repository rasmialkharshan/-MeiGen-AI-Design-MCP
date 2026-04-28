/**
 * Misbar AI Analysis Engine
 * Claude-powered intelligence — replaces rule-based heuristics with real LLM reasoning
 */

import { analyzeWithClaudeJSON, type StreamCallbacks } from '../claude-client.js'
import type {
  RawArticle,
  NormalizedArticle,
  CoverageGapMatrix,
  FramingAnalysis,
  NarrativeAnalysis,
  TrendAnalysis,
  ReputationAnalysis,
  InsightSynthesis,
  TimeRange,
} from '../../misbar/types.js'

function articlesToContext(articles: RawArticle[], maxChars = 12000): string {
  const texts = articles.map((a, i) =>
    `[${i + 1}] SOURCE: ${a.source} (${a.source_camp}, ${a.language})\n` +
    `TITLE: ${a.title}\n` +
    `DATE: ${a.published_at}\n` +
    `BODY: ${a.body.slice(0, 800)}\n`
  )
  // Fit within token budget
  let combined = ''
  for (const t of texts) {
    if (combined.length + t.length > maxChars) break
    combined += t + '\n---\n'
  }
  return combined
}

// ─── Normalization ─────────────────────────────────────────────────────────

export async function aiNormalizeArticles(
  articles: RawArticle[],
  callbacks?: StreamCallbacks
): Promise<NormalizedArticle[]> {
  if (articles.length === 0) return []

  const context = articlesToContext(articles)

  const schema = `{
  "articles": [
    {
      "id": "string (preserve original)",
      "url": "string",
      "title": "string",
      "body": "string",
      "source": "string",
      "source_camp": "arabic|western|global|think_tank",
      "language": "ar|en|fr|other",
      "published_at": "string",
      "author": "string or null",
      "tags": ["string"],
      "translated_title": "English translation if Arabic/French, else null",
      "translated_body": "English summary (2-3 sentences) if non-English, else null",
      "entities": [{"name":"string","type":"person|country|organization|location|concept","mentions":1,"sentiment":{"positive":0.0,"negative":0.0,"neutral":1.0,"overall":"neutral"}}],
      "topics": ["string"],
      "sentiment": {"positive":0.0,"negative":0.0,"neutral":1.0,"overall":"neutral|positive|negative|mixed"},
      "word_count": 0,
      "key_terms": ["string"]
    }
  ]
}`

  const result = await analyzeWithClaudeJSON<{ articles: NormalizedArticle[] }>(
    `Normalize these ${articles.length} news articles. For each article:\n` +
    `- Extract named entities (people, countries, organizations) with mention counts and sentiment\n` +
    `- Identify 3-5 topic tags\n` +
    `- Score sentiment (positive/negative/neutral proportions summing to 1.0)\n` +
    `- Extract 5-10 key terms\n` +
    `- Translate title and provide body summary for non-English articles\n\n` +
    `ARTICLES:\n${context}`,
    schema,
    callbacks
  )

  // Merge with original article data (id, url, source_camp, etc.)
  return result.articles.map((normalized, i) => ({
    ...articles[i],
    ...normalized,
    id: articles[i].id,
    url: articles[i].url,
    source: articles[i].source,
    source_camp: articles[i].source_camp,
    language: articles[i].language,
  }))
}

// ─── Coverage Gap Analysis ──────────────────────────────────────────────────

export async function aiAnalyzeCoverage(
  topic: string,
  arabicArticles: NormalizedArticle[],
  westernArticles: NormalizedArticle[],
  callbacks?: StreamCallbacks
): Promise<CoverageGapMatrix> {
  const arabicContext = articlesToContext(arabicArticles, 6000)
  const westernContext = articlesToContext(westernArticles, 6000)

  const schema = `{
  "topic": "string",
  "arabic_metrics": {
    "article_count": 0,
    "source_count": 0,
    "avg_word_count": 0,
    "depth_score": 0,
    "angle_diversity": 0,
    "time_distribution": {}
  },
  "western_metrics": {
    "article_count": 0,
    "source_count": 0,
    "avg_word_count": 0,
    "depth_score": 0,
    "angle_diversity": 0,
    "time_distribution": {}
  },
  "gap_score": 0,
  "underreported_by_arabic": ["string"],
  "underreported_by_western": ["string"],
  "exclusive_arabic_angles": ["string"],
  "exclusive_western_angles": ["string"],
  "shared_angles": ["string"],
  "summary": "string"
}`

  return analyzeWithClaudeJSON<CoverageGapMatrix>(
    `Analyze coverage gaps for topic: "${topic}"\n\n` +
    `ARABIC MEDIA (${arabicArticles.length} articles):\n${arabicContext}\n\n` +
    `WESTERN MEDIA (${westernArticles.length} articles):\n${westernContext}\n\n` +
    `Compute:\n` +
    `- depth_score (0-100): how deeply each camp covers the topic\n` +
    `- angle_diversity (0-100): how many different angles/perspectives are covered\n` +
    `- gap_score (0-100): 0=identical coverage, 100=complete blind spot in one camp\n` +
    `- What angles does Arabic media cover that Western ignores, and vice versa?\n` +
    `- What shared angles do both cover?\n` +
    `- article_count and source_count from the actual articles provided`,
    schema,
    callbacks
  )
}

// ─── Framing Analysis ──────────────────────────────────────────────────────

export async function aiAnalyzeFraming(
  topic: string,
  arabicArticles: NormalizedArticle[],
  westernArticles: NormalizedArticle[],
  callbacks?: StreamCallbacks
): Promise<FramingAnalysis> {
  const arabicContext = articlesToContext(arabicArticles, 6000)
  const westernContext = articlesToContext(westernArticles, 6000)

  const schema = `{
  "topic": "string",
  "terminology_divergences": [
    {"concept":"string","arabic_terms":["string"],"western_terms":["string"],"divergence_level":"low|medium|high|critical"}
  ],
  "framing_dimensions": [
    {"dimension":"string","arabic_stance":"string","western_stance":"string","divergence_note":"string"}
  ],
  "angle_map": {
    "arabic_angles": ["string"],
    "western_angles": ["string"],
    "shared_angles": ["string"]
  },
  "narrative_tone": {
    "arabic": "sympathetic|critical|neutral|alarmist|analytical",
    "western": "sympathetic|critical|neutral|alarmist|analytical"
  },
  "overall_divergence": "low|medium|high|critical",
  "key_finding": "string"
}`

  return analyzeWithClaudeJSON<FramingAnalysis>(
    `Analyze media framing for topic: "${topic}"\n\n` +
    `ARABIC MEDIA (${arabicArticles.length} articles):\n${arabicContext}\n\n` +
    `WESTERN MEDIA (${westernArticles.length} articles):\n${westernContext}\n\n` +
    `Analyze:\n` +
    `- Terminology divergences: same concept, different words in each camp (e.g., "terrorist" vs "militant")\n` +
    `- Framing dimensions: victim/perpetrator framing, cause framing, solution framing, agency attribution\n` +
    `- Narrative tone per camp: is coverage sympathetic, critical, neutral, alarmist, or analytical?\n` +
    `- Overall divergence level based on the cumulative framing differences`,
    schema,
    callbacks
  )
}

// ─── Narrative Analysis ────────────────────────────────────────────────────

export async function aiAnalyzeNarratives(
  topic: string,
  arabicArticles: NormalizedArticle[],
  westernArticles: NormalizedArticle[],
  callbacks?: StreamCallbacks
): Promise<NarrativeAnalysis> {
  const context = articlesToContext([...arabicArticles, ...westernArticles], 12000)

  const schema = `{
  "topic": "string",
  "dominant_narratives": [
    {
      "id": "string",
      "title": "string",
      "description": "string",
      "dominant_in": ["arabic|western|global|think_tank"],
      "supporting_sources": ["string"],
      "key_claims": ["string"],
      "emotional_register": "fear|hope|anger|neutral|pride|grief",
      "strength": 0
    }
  ],
  "competing_narratives": [
    {
      "id": "string",
      "title": "string",
      "description": "string",
      "dominant_in": ["arabic|western|global|think_tank"],
      "supporting_sources": ["string"],
      "key_claims": ["string"],
      "emotional_register": "fear|hope|anger|neutral|pride|grief",
      "strength": 0
    }
  ],
  "turning_points": [
    {"date":"string","event":"string","narrative_shift":"string","triggered_by":"string"}
  ],
  "narrative_evolution_summary": "string",
  "contested_claims": ["string"]
}`

  return analyzeWithClaudeJSON<NarrativeAnalysis>(
    `Identify narrative clusters for topic: "${topic}"\n\n` +
    `ALL ARTICLES (${arabicArticles.length + westernArticles.length} total):\n${context}\n\n` +
    `Identify:\n` +
    `- 2-4 dominant narratives (story frameworks that multiple articles share)\n` +
    `- 1-3 competing/minority narratives that challenge the dominant ones\n` +
    `- narrative strength (0-100) based on how many sources support it\n` +
    `- turning points: moments where the narrative visibly shifted\n` +
    `- contested claims: specific factual claims that Arabic and Western media dispute`,
    schema,
    callbacks
  )
}

// ─── Trend Analysis ────────────────────────────────────────────────────────

export async function aiAnalyzeTrends(
  topic: string,
  articles: NormalizedArticle[],
  timeWindow: TimeRange,
  callbacks?: StreamCallbacks
): Promise<TrendAnalysis> {
  const context = articlesToContext(articles, 10000)

  const schema = `{
  "topic": "string",
  "time_window": "string",
  "data_points": [
    {"date":"YYYY-MM-DD","article_count":0,"sentiment_avg":0.0,"dominant_angle":"string"}
  ],
  "trend_direction": "rising|falling|stable|volatile|spike",
  "peak_moment": {"date":"string","trigger":"string"},
  "velocity": 0.0,
  "forecast_note": "string"
}`

  return analyzeWithClaudeJSON<TrendAnalysis>(
    `Analyze temporal trends for topic: "${topic}" over ${timeWindow}\n\n` +
    `ARTICLES (${articles.length} total, sorted by date):\n${context}\n\n` +
    `Analyze:\n` +
    `- Group articles by date, compute article_count and sentiment_avg per day\n` +
    `- Identify trend_direction: is coverage rising, falling, stable, volatile, or spiking?\n` +
    `- velocity: rate of change (0-100, higher = faster change)\n` +
    `- peak_moment: when did coverage peak and what triggered it?\n` +
    `- forecast_note: brief projection of where coverage is heading`,
    schema,
    callbacks
  )
}

// ─── Reputation Analysis ───────────────────────────────────────────────────

export async function aiAnalyzeReputation(
  entity: string,
  topic: string,
  arabicArticles: NormalizedArticle[],
  westernArticles: NormalizedArticle[],
  callbacks?: StreamCallbacks
): Promise<ReputationAnalysis> {
  const arabicContext = articlesToContext(arabicArticles, 5000)
  const westernContext = articlesToContext(westernArticles, 5000)

  const schema = `{
  "entity": "string",
  "topic": "string",
  "sentiment": {"positive":0.0,"negative":0.0,"neutral":0.0,"overall":"positive|negative|neutral|mixed"},
  "reach_score": 0,
  "reputation_risk": "low|medium|high|critical",
  "arabic_reputation": {"positive":0.0,"negative":0.0,"neutral":0.0,"overall":"positive|negative|neutral|mixed"},
  "western_reputation": {"positive":0.0,"negative":0.0,"neutral":0.0,"overall":"positive|negative|neutral|mixed"},
  "key_narratives_about_entity": ["string"],
  "reputation_drivers": ["string"],
  "alert_triggered": false,
  "alert_reason": "string or null"
}`

  return analyzeWithClaudeJSON<ReputationAnalysis>(
    `Analyze reputation of "${entity}" in context of topic: "${topic}"\n\n` +
    `ARABIC MEDIA (${arabicArticles.length} articles):\n${arabicContext}\n\n` +
    `WESTERN MEDIA (${westernArticles.length} articles):\n${westernContext}\n\n` +
    `Analyze:\n` +
    `- Sentiment scores (proportions summing to 1.0) per camp and overall\n` +
    `- reach_score (0-100): estimated media reach/spread of coverage about the entity\n` +
    `- reputation_risk: low/medium/high/critical based on negative coverage intensity\n` +
    `- Key narratives about the entity in each camp\n` +
    `- reputation_drivers: main factors pushing sentiment positive or negative\n` +
    `- alert_triggered: true if negative > 0.5 AND reach_score > 40`,
    schema,
    callbacks
  )
}

// ─── Insight Synthesis ─────────────────────────────────────────────────────

export async function aiSynthesizeInsights(
  topic: string,
  coverage: CoverageGapMatrix,
  framing: FramingAnalysis,
  narratives: NarrativeAnalysis,
  trends?: TrendAnalysis,
  reputation?: ReputationAnalysis,
  callbacks?: StreamCallbacks
): Promise<InsightSynthesis> {
  const engineOutputs = JSON.stringify({
    coverage_gap: { gap_score: coverage.gap_score, summary: coverage.summary, exclusive_arabic: coverage.exclusive_arabic_angles, exclusive_western: coverage.exclusive_western_angles },
    framing: { divergence: framing.overall_divergence, key_finding: framing.key_finding, terminology_count: framing.terminology_divergences.length },
    narratives: { dominant: narratives.dominant_narratives.map(n => n.title), contested_claims: narratives.contested_claims },
    trends: trends ? { direction: trends.trend_direction, velocity: trends.velocity, forecast: trends.forecast_note } : null,
    reputation: reputation ? { risk: reputation.reputation_risk, alert: reputation.alert_triggered } : null,
  }, null, 2)

  const schema = `{
  "topic": "string",
  "generated_at": "ISO string",
  "executive_summary": "string (2-3 sentences)",
  "confidence_level": 0,
  "key_insights": [
    {
      "id": "string",
      "title": "string",
      "description": "string",
      "priority": "critical|high|medium|low",
      "category": "gap|framing|narrative|trend|reputation|strategic",
      "actionable": true,
      "recommended_action": "string"
    }
  ],
  "strategic_implications": [
    {
      "area": "editorial|reputation|policy|audience|narrative",
      "implication": "string",
      "urgency": "immediate|short_term|long_term"
    }
  ],
  "scenarios": [
    {
      "id": "string",
      "title": "string",
      "probability": "likely|possible|unlikely",
      "description": "string",
      "trigger_conditions": ["string"],
      "implications": ["string"],
      "recommended_response": "string"
    }
  ]
}`

  return analyzeWithClaudeJSON<InsightSynthesis>(
    `Synthesize intelligence findings for topic: "${topic}"\n\n` +
    `ENGINE OUTPUTS:\n${engineOutputs}\n\n` +
    `FRAMING KEY FINDING: ${framing.key_finding}\n\n` +
    `NARRATIVE EVOLUTION: ${narratives.narrative_evolution_summary}\n\n` +
    `Produce:\n` +
    `- 4-7 prioritized key insights (most actionable first)\n` +
    `- 3-5 strategic implications across editorial, reputation, policy areas\n` +
    `- 2-3 future scenarios with probability and recommended response\n` +
    `- executive_summary: 2-3 sentence briefing for a senior editor\n` +
    `- confidence_level (0-100): based on evidence quality and article count`,
    schema,
    callbacks
  )
}
