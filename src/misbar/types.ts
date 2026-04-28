/**
 * Misbar Intelligence System v3.0 — Core Type Definitions
 * نظام مصدر للذكاء الإعلامي المقارن
 */

// ─────────────────────────────────────────────
// Input Layer Types
// ─────────────────────────────────────────────

export type MisbarMode =
  | 'A' // Daily Pulse — quick scan
  | 'B' // Deep Analysis — full pipeline
  | 'C' // Crisis Mode — rapid response
  | 'D' // Reputation Watch — entity focus
  | 'E' // Trend Tracker — temporal analysis
  | 'F' // Comparative Framing — Arabic vs Western

export type DepthLevel = 'surface' | 'moderate' | 'deep'

export type TimeRange =
  | '24h'
  | '7d'
  | '30d'
  | '90d'
  | 'custom'

export interface TaskObject {
  topic: string
  time_range: TimeRange
  mode: MisbarMode
  priority_sources: string[]
  depth_level: DepthLevel
  geographic_scope?: string[]
  entity_focus?: string
  custom_from?: string
  custom_to?: string
}

// ─────────────────────────────────────────────
// Data Acquisition Types
// ─────────────────────────────────────────────

export type MediaCamp = 'arabic' | 'western' | 'global' | 'think_tank'

export type ArticleLanguage = 'ar' | 'en' | 'fr' | 'other'

export interface RawArticle {
  id: string
  url: string
  title: string
  body: string
  source: string
  source_camp: MediaCamp
  language: ArticleLanguage
  published_at: string
  author?: string
  tags?: string[]
}

// ─────────────────────────────────────────────
// Processing & Normalization Types
// ─────────────────────────────────────────────

export interface Entity {
  name: string
  type: 'person' | 'country' | 'organization' | 'location' | 'concept'
  mentions: number
  sentiment?: SentimentScore
}

export interface NormalizedArticle extends RawArticle {
  translated_title?: string
  translated_body?: string
  entities: Entity[]
  topics: string[]
  sentiment: SentimentScore
  word_count: number
  key_terms: string[]
}

// ─────────────────────────────────────────────
// Intelligence Engine Types
// ─────────────────────────────────────────────

export interface CoverageMetrics {
  article_count: number
  source_count: number
  avg_word_count: number
  depth_score: number       // 0–100
  angle_diversity: number   // 0–100
  time_distribution: Record<string, number>
}

export interface CoverageGapMatrix {
  topic: string
  arabic_metrics: CoverageMetrics
  western_metrics: CoverageMetrics
  gap_score: number           // 0–100, higher = bigger gap
  underreported_by_arabic: string[]
  underreported_by_western: string[]
  exclusive_arabic_angles: string[]
  exclusive_western_angles: string[]
  shared_angles: string[]
  summary: string
}

export interface TerminologyDivergence {
  concept: string
  arabic_terms: string[]
  western_terms: string[]
  divergence_level: 'low' | 'medium' | 'high' | 'critical'
}

export interface FramingDimension {
  dimension: string      // e.g., "victim/perpetrator", "cause framing", "solution framing"
  arabic_stance: string
  western_stance: string
  divergence_note: string
}

export interface FramingAnalysis {
  topic: string
  terminology_divergences: TerminologyDivergence[]
  framing_dimensions: FramingDimension[]
  angle_map: {
    arabic_angles: string[]
    western_angles: string[]
    shared_angles: string[]
  }
  narrative_tone: {
    arabic: 'sympathetic' | 'critical' | 'neutral' | 'alarmist' | 'analytical'
    western: 'sympathetic' | 'critical' | 'neutral' | 'alarmist' | 'analytical'
  }
  overall_divergence: 'low' | 'medium' | 'high' | 'critical'
  key_finding: string
}

export interface Narrative {
  id: string
  title: string
  description: string
  dominant_in: MediaCamp[]
  supporting_sources: string[]
  key_claims: string[]
  emotional_register: 'fear' | 'hope' | 'anger' | 'neutral' | 'pride' | 'grief'
  strength: number           // 0–100
}

export interface NarrativeTurningPoint {
  date: string
  event: string
  narrative_shift: string
  triggered_by: string
}

export interface NarrativeAnalysis {
  topic: string
  dominant_narratives: Narrative[]
  competing_narratives: Narrative[]
  turning_points: NarrativeTurningPoint[]
  narrative_evolution_summary: string
  contested_claims: string[]
}

export interface TrendDataPoint {
  date: string
  article_count: number
  sentiment_avg: number
  dominant_angle: string
}

export type TrendDirection = 'rising' | 'falling' | 'stable' | 'volatile' | 'spike'

export interface TrendAnalysis {
  topic: string
  time_window: TimeRange
  data_points: TrendDataPoint[]
  trend_direction: TrendDirection
  peak_moment: { date: string; trigger: string } | null
  velocity: number           // rate of change
  forecast_note: string
}

export type SentimentScore = {
  positive: number
  negative: number
  neutral: number
  overall: 'positive' | 'negative' | 'neutral' | 'mixed'
}

export interface ReputationAnalysis {
  entity: string
  topic: string
  sentiment: SentimentScore
  reach_score: number        // 0–100, estimated spread
  reputation_risk: 'low' | 'medium' | 'high' | 'critical'
  arabic_reputation: SentimentScore
  western_reputation: SentimentScore
  key_narratives_about_entity: string[]
  reputation_drivers: string[]
  alert_triggered: boolean
  alert_reason?: string
}

// ─────────────────────────────────────────────
// Insight Synthesis Types
// ─────────────────────────────────────────────

export type InsightPriority = 'critical' | 'high' | 'medium' | 'low'

export interface Insight {
  id: string
  title: string
  description: string
  priority: InsightPriority
  category: 'gap' | 'framing' | 'narrative' | 'trend' | 'reputation' | 'strategic'
  actionable: boolean
  recommended_action?: string
}

export interface MediaScenario {
  id: string
  title: string
  probability: 'likely' | 'possible' | 'unlikely'
  description: string
  trigger_conditions: string[]
  implications: string[]
  recommended_response: string
}

export interface StrategicImplication {
  area: 'editorial' | 'reputation' | 'policy' | 'audience' | 'narrative'
  implication: string
  urgency: 'immediate' | 'short_term' | 'long_term'
}

export interface InsightSynthesis {
  topic: string
  generated_at: string
  key_insights: Insight[]
  strategic_implications: StrategicImplication[]
  scenarios: MediaScenario[]
  executive_summary: string
  confidence_level: number   // 0–100
}

// ─────────────────────────────────────────────
// Output / Report Types
// ─────────────────────────────────────────────

export type ReportType =
  | 'daily_pulse'
  | 'weekly_report'
  | 'crisis_report'
  | 'reputation_dashboard'
  | 'editorial_article'
  | 'comparative_brief'

export interface ReportSection {
  title: string
  content: string
  data?: Record<string, unknown>
}

export interface MisbarReport {
  report_id: string
  report_type: ReportType
  topic: string
  generated_at: string
  time_range: TimeRange
  sections: ReportSection[]
  full_text: string
  metadata: {
    sources_analyzed: number
    arabic_sources: number
    western_sources: number
    mode: MisbarMode
    confidence: number
  }
}

// ─────────────────────────────────────────────
// Memory & Learning Types
// ─────────────────────────────────────────────

export interface SourceProfile {
  source_name: string
  camp: MediaCamp
  language: ArticleLanguage
  known_bias: 'left' | 'right' | 'center' | 'state' | 'independent' | 'unknown'
  reliability_score: number  // 0–100
  topic_specializations: string[]
  historical_framing_tendencies: string[]
  last_analyzed: string
}

export interface HistoricalEntry {
  entry_id: string
  topic: string
  date: string
  mode: MisbarMode
  gap_score: number
  framing_divergence: 'low' | 'medium' | 'high' | 'critical'
  dominant_narratives: string[]
  report_id?: string
}

export interface NarrativeEvolution {
  topic: string
  timeline: {
    date: string
    narrative_snapshot: string
    shift_detected: boolean
  }[]
}

export interface MemoryStore {
  version: string
  last_updated: string
  historical_entries: HistoricalEntry[]
  source_profiles: Record<string, SourceProfile>
  narrative_evolutions: Record<string, NarrativeEvolution>
  feedback: Array<{
    analysis_id: string
    rating: number
    notes: string
    date: string
  }>
}

// ─────────────────────────────────────────────
// Multi-Agent Types
// ─────────────────────────────────────────────

export type AgentRole =
  | 'scout'
  | 'verifier'
  | 'classifier'
  | 'framing_analyst'
  | 'gap_analyst'
  | 'narrative_analyst'
  | 'strategist'
  | 'editor'

export interface AgentTask {
  agent: AgentRole
  input: unknown
  status: 'pending' | 'running' | 'done' | 'failed'
  output?: unknown
  error?: string
}

export interface OrchestrationPlan {
  task_id: string
  topic: string
  mode: MisbarMode
  steps: AgentTask[]
  search_queries: {
    arabic: string[]
    western: string[]
    think_tank: string[]
  }
  estimated_sources: number
  parallel_groups: AgentRole[][]
}

// ─────────────────────────────────────────────
// Decision Engine Types
// ─────────────────────────────────────────────

export interface DecisionAlert {
  type: 'coverage_gap' | 'framing_divergence' | 'reputation_spike' | 'crisis_mode' | 'narrative_shift'
  severity: 'info' | 'warning' | 'critical'
  message: string
  triggered_at: string
  recommended_action: string
}
