const BASE = '/api'

export interface AnalyzeRequest {
  topic: string
  mode?: 'A' | 'B' | 'C' | 'D' | 'E' | 'F'
  time_range?: '24h' | '7d' | '30d' | '90d'
  entity?: string
  include_think_tanks?: boolean
}

export interface SentimentScore {
  positive: number
  negative: number
  neutral: number
  overall: 'positive' | 'negative' | 'neutral' | 'mixed'
}

export interface CoverageGapMatrix {
  topic: string
  arabic_metrics: { article_count: number; source_count: number; depth_score: number; angle_diversity: number }
  western_metrics: { article_count: number; source_count: number; depth_score: number; angle_diversity: number }
  gap_score: number
  exclusive_arabic_angles: string[]
  exclusive_western_angles: string[]
  shared_angles: string[]
  summary: string
}

export interface FramingAnalysis {
  topic: string
  terminology_divergences: Array<{ concept: string; arabic_terms: string[]; western_terms: string[]; divergence_level: string }>
  framing_dimensions: Array<{ dimension: string; arabic_stance: string; western_stance: string; divergence_note: string }>
  angle_map: { arabic_angles: string[]; western_angles: string[]; shared_angles: string[] }
  narrative_tone: { arabic: string; western: string }
  overall_divergence: 'low' | 'medium' | 'high' | 'critical'
  key_finding: string
}

export interface NarrativeAnalysis {
  topic: string
  dominant_narratives: Array<{ id: string; title: string; description: string; dominant_in: string[]; key_claims: string[]; emotional_register: string; strength: number }>
  competing_narratives: Array<{ id: string; title: string; description: string; dominant_in: string[]; strength: number }>
  turning_points: Array<{ date: string; event: string; narrative_shift: string }>
  narrative_evolution_summary: string
  contested_claims: string[]
}

export interface Insight {
  id: string
  title: string
  description: string
  priority: 'critical' | 'high' | 'medium' | 'low'
  category: string
  actionable: boolean
  recommended_action?: string
}

export interface InsightSynthesis {
  topic: string
  generated_at: string
  executive_summary: string
  confidence_level: number
  key_insights: Insight[]
  strategic_implications: Array<{ area: string; implication: string; urgency: string }>
  scenarios: Array<{ id: string; title: string; probability: string; description: string; recommended_response: string }>
}

export interface AnalysisReport {
  report_id: string
  topic: string
  mode: string
  time_range: string
  generated_at: string
  sources: { total: number; arabic: number; western: number; sources_reached: number }
  coverage_gap: CoverageGapMatrix
  framing_analysis: FramingAnalysis
  narrative_analysis: NarrativeAnalysis
  trend_analysis: null | object
  reputation_analysis: null | object
  synthesis: InsightSynthesis
  decision_alerts: Array<{ type: string; severity: string; message: string; recommended_action: string }>
}

export interface MemoryEntry {
  entry_id: string
  topic: string
  date: string
  mode: string
  gap_score: number
  framing_divergence: string
  dominant_narratives: string[]
  report_id?: string
}

export async function analyze(req: AnalyzeRequest): Promise<AnalysisReport> {
  const res = await fetch(`${BASE}/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error((err as { error: string }).error ?? res.statusText)
  }
  return res.json()
}

export async function getMemory(topic: string): Promise<{ history: MemoryEntry[]; topic: string }> {
  const res = await fetch(`${BASE}/memory/${encodeURIComponent(topic)}`)
  if (!res.ok) throw new Error(res.statusText)
  return res.json()
}

export async function getSources(): Promise<{ arabic: object[]; western: object[]; think_tank: object[] }> {
  const res = await fetch(`${BASE}/sources`)
  if (!res.ok) throw new Error(res.statusText)
  return res.json()
}

export async function healthCheck(): Promise<{ status: string; anthropic_key_set: boolean }> {
  const res = await fetch(`${BASE}/health`)
  if (!res.ok) throw new Error(res.statusText)
  return res.json()
}
