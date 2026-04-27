/**
 * Tool: misbar_synthesize_insights
 * Insight Synthesis Layer — Insight Generator + Strategic Interpreter + Scenario Builder
 */

import { z } from 'zod'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import type {
  InsightSynthesis,
  Insight,
  StrategicImplication,
  MediaScenario,
  InsightPriority,
} from '../misbar/types.js'
import { randomUUID } from 'crypto'

const GapMatrixSchema = z.object({
  topic: z.string(),
  gap_score: z.number(),
  underreported_by_arabic: z.array(z.string()),
  underreported_by_western: z.array(z.string()),
  exclusive_arabic_angles: z.array(z.string()),
  exclusive_western_angles: z.array(z.string()),
  shared_angles: z.array(z.string()),
  summary: z.string(),
}).optional()

const FramingSchema = z.object({
  topic: z.string(),
  overall_divergence: z.enum(['low', 'medium', 'high', 'critical']),
  key_finding: z.string(),
  narrative_tone: z.object({
    arabic: z.string(),
    western: z.string(),
  }),
  angle_map: z.object({
    arabic_angles: z.array(z.string()),
    western_angles: z.array(z.string()),
    shared_angles: z.array(z.string()),
  }),
}).optional()

const NarrativeSchema = z.object({
  topic: z.string(),
  dominant_narratives: z.array(z.object({
    title: z.string(),
    strength: z.number(),
    emotional_register: z.string(),
    dominant_in: z.array(z.string()),
  })),
  contested_claims: z.array(z.string()),
  narrative_evolution_summary: z.string(),
}).optional()

const TrendSchema = z.object({
  topic: z.string(),
  trend_direction: z.string(),
  velocity: z.number(),
  forecast_note: z.string(),
}).optional()

const ReputationSchema = z.object({
  entity: z.string(),
  reputation_risk: z.string(),
  alert_triggered: z.boolean(),
  alert_reason: z.string().optional(),
}).optional()

const schema = {
  topic: z.string().describe('The research topic'),
  gap_analysis: GapMatrixSchema.describe('Output from misbar_analyze_coverage'),
  framing_analysis: FramingSchema.describe('Output from misbar_analyze_framing'),
  narrative_analysis: NarrativeSchema.describe('Output from misbar_analyze_narratives'),
  trend_analysis: TrendSchema.describe('Optional output from misbar_analyze_trends'),
  reputation_analysis: ReputationSchema.describe('Optional output from misbar_analyze_reputation'),
  mode: z.enum(['A', 'B', 'C', 'D', 'E', 'F']).describe('Analysis mode from task object'),
}

function buildInsights(
  topic: string,
  gap: z.infer<typeof GapMatrixSchema>,
  framing: z.infer<typeof FramingSchema>,
  narrative: z.infer<typeof NarrativeSchema>,
  trend: z.infer<typeof TrendSchema>,
  reputation: z.infer<typeof ReputationSchema>,
): Insight[] {
  const insights: Insight[] = []

  if (gap) {
    const priority: InsightPriority = gap.gap_score >= 70 ? 'critical' : gap.gap_score >= 45 ? 'high' : gap.gap_score >= 20 ? 'medium' : 'low'
    insights.push({
      id: randomUUID(),
      title: `Coverage Gap: ${gap.gap_score}/100`,
      description: gap.summary,
      priority,
      category: 'gap',
      actionable: gap.gap_score >= 30,
      recommended_action: gap.gap_score >= 45
        ? `Produce editorial content covering these underreported angles: ${gap.underreported_by_western.slice(0, 3).join(', ')}`
        : 'Monitor for widening gap over next 7 days',
    })
  }

  if (framing) {
    const priority: InsightPriority = framing.overall_divergence === 'critical' ? 'critical' : framing.overall_divergence === 'high' ? 'high' : 'medium'
    insights.push({
      id: randomUUID(),
      title: `Framing Divergence: ${framing.overall_divergence.toUpperCase()}`,
      description: framing.key_finding,
      priority,
      category: 'framing',
      actionable: framing.overall_divergence !== 'low',
      recommended_action: framing.overall_divergence !== 'low'
        ? `Address terminology divergence in editorial guidelines. Tone contrast: ${framing.narrative_tone.arabic} (Arabic) vs ${framing.narrative_tone.western} (Western)`
        : undefined,
    })
  }

  if (narrative && narrative.dominant_narratives.length > 0) {
    const top = narrative.dominant_narratives[0]
    insights.push({
      id: randomUUID(),
      title: `Dominant Narrative: "${top.title}"`,
      description: `Strength ${top.strength}/100 — emotional register: ${top.emotional_register}. ${narrative.narrative_evolution_summary}`,
      priority: top.strength >= 70 ? 'high' : 'medium',
      category: 'narrative',
      actionable: narrative.contested_claims.length > 0,
      recommended_action: narrative.contested_claims.length > 0
        ? `Counter contested claims: ${narrative.contested_claims[0]}`
        : undefined,
    })
  }

  if (trend) {
    const isUrgent = trend.trend_direction === 'spike' || (trend.trend_direction === 'rising' && trend.velocity > 50)
    insights.push({
      id: randomUUID(),
      title: `Trend: ${trend.trend_direction} (velocity: ${trend.velocity}%)`,
      description: trend.forecast_note,
      priority: isUrgent ? 'high' : 'medium',
      category: 'trend',
      actionable: isUrgent,
      recommended_action: isUrgent ? 'Activate crisis monitoring. Increase publication frequency.' : undefined,
    })
  }

  if (reputation?.alert_triggered) {
    insights.push({
      id: randomUUID(),
      title: `Reputation Alert: ${reputation.entity}`,
      description: reputation.alert_reason ?? 'Negative sentiment spike detected',
      priority: reputation.reputation_risk === 'critical' ? 'critical' : 'high',
      category: 'reputation',
      actionable: true,
      recommended_action: 'Deploy counter-narrative strategy. Engage with sympathetic sources.',
    })
  }

  return insights.sort((a, b) => {
    const order: Record<InsightPriority, number> = { critical: 0, high: 1, medium: 2, low: 3 }
    return order[a.priority] - order[b.priority]
  })
}

function buildStrategicImplications(
  insights: Insight[],
  framing: z.infer<typeof FramingSchema>,
): StrategicImplication[] {
  const implications: StrategicImplication[] = []

  const hasGap = insights.some(i => i.category === 'gap' && i.priority !== 'low')
  const hasFraming = insights.some(i => i.category === 'framing' && i.priority !== 'low')
  const hasReputation = insights.some(i => i.category === 'reputation')

  if (hasGap) {
    implications.push({
      area: 'editorial',
      implication: 'Coverage gap creates opportunity for first-mover editorial advantage on underreported angles',
      urgency: 'short_term',
    })
  }
  if (hasFraming && framing) {
    implications.push({
      area: 'narrative',
      implication: `Framing divergence (${framing.overall_divergence}) risks audience perception split. Arabic and Western audiences may be forming incompatible mental models of this topic.`,
      urgency: framing.overall_divergence === 'critical' ? 'immediate' : 'short_term',
    })
    implications.push({
      area: 'policy',
      implication: 'Framing gaps may complicate cross-cultural policy dialogue. Common terminology framework recommended.',
      urgency: 'long_term',
    })
  }
  if (hasReputation) {
    implications.push({
      area: 'reputation',
      implication: 'Entity reputation under threat from coordinated negative coverage. Rapid response window is 24–72 hours.',
      urgency: 'immediate',
    })
  }

  return implications
}

function buildScenarios(
  insights: Insight[],
  trend: z.infer<typeof TrendSchema>,
): MediaScenario[] {
  const scenarios: MediaScenario[] = []

  const hasCritical = insights.some(i => i.priority === 'critical')
  const isRising = trend?.trend_direction === 'rising' || trend?.trend_direction === 'spike'

  if (hasCritical && isRising) {
    scenarios.push({
      id: randomUUID(),
      title: 'Full Media Crisis',
      probability: 'likely',
      description: 'Coverage spike combined with high framing divergence creates conditions for a full media crisis with competing international narratives',
      trigger_conditions: ['Coverage velocity exceeds 100% in 48h', 'Major Western outlet publishes critical investigation'],
      implications: ['Rapid audience polarization', 'Pressure for official response', 'Secondary narrative amplification on social media'],
      recommended_response: 'Activate crisis communications protocol. Pre-position counter-narrative. Engage trusted intermediary sources.',
    })
  }

  scenarios.push({
    id: randomUUID(),
    title: 'Narrative Stabilization',
    probability: hasCritical ? 'possible' : 'likely',
    description: 'Coverage normalizes as the news cycle moves on, reducing framing pressure',
    trigger_conditions: ['New competing story dominates media', 'Official statement or development clarifies ambiguity'],
    implications: ['Topic loses media salience', 'Gap persists but becomes less acute'],
    recommended_response: 'Use window to publish in-depth analytical pieces that will shape the next coverage wave.',
  })

  scenarios.push({
    id: randomUUID(),
    title: 'Camp Echo Chambers',
    probability: 'possible',
    description: 'Arabic and Western media continue covering the topic in parallel without cross-pollination, deepening the gap',
    trigger_conditions: ['No major bridging publication', 'No international body produces joint assessment'],
    implications: ['Long-term perception gap widens', 'Audience polarization becomes structural'],
    recommended_response: 'Commission multilingual comparative analysis. Partner with bridging media organizations.',
  })

  return scenarios
}

export function registerMisbarSynthesize(server: McpServer) {
  server.tool(
    'misbar_synthesize_insights',
    [
      'Insight Synthesis Layer: converts all engine outputs into actionable intelligence.',
      'Generates: prioritized key insights (critical/high/medium/low),',
      'strategic implications per domain (editorial/reputation/policy/narrative),',
      'and media scenarios with probability estimates.',
      'This is the penultimate step before misbar_generate_report.',
    ].join(' '),
    schema,
    { readOnlyHint: true },
    async ({ topic, gap_analysis, framing_analysis, narrative_analysis, trend_analysis, reputation_analysis, mode }) => {
      const insights = buildInsights(topic, gap_analysis, framing_analysis, narrative_analysis, trend_analysis, reputation_analysis)
      const implications = buildStrategicImplications(insights, framing_analysis)
      const scenarios = buildScenarios(insights, trend_analysis)

      const criticalCount = insights.filter(i => i.priority === 'critical').length
      const highCount = insights.filter(i => i.priority === 'high').length
      const confidence = Math.min(100, 40
        + (gap_analysis ? 15 : 0)
        + (framing_analysis ? 15 : 0)
        + (narrative_analysis ? 15 : 0)
        + (trend_analysis ? 10 : 0)
        + (reputation_analysis ? 5 : 0))

      const execSummary = [
        `Analysis of "${topic}" reveals ${criticalCount} critical and ${highCount} high-priority intelligence items.`,
        gap_analysis ? `Coverage Gap Score: ${gap_analysis.gap_score}/100.` : '',
        framing_analysis ? `Framing Divergence: ${framing_analysis.overall_divergence}.` : '',
        narrative_analysis ? `${narrative_analysis.dominant_narratives.length} narrative clusters identified.` : '',
        trend_analysis ? `Trend: ${trend_analysis.trend_direction} (velocity ${trend_analysis.velocity}%).` : '',
        `${implications.filter(i => i.urgency === 'immediate').length} immediate-action implications identified.`,
        `Analysis confidence: ${confidence}%.`,
      ].filter(Boolean).join(' ')

      const synthesis: InsightSynthesis = {
        topic,
        generated_at: new Date().toISOString(),
        key_insights: insights,
        strategic_implications: implications,
        scenarios,
        executive_summary: execSummary,
        confidence_level: confidence,
      }

      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({
            synthesis,
            summary_stats: {
              total_insights: insights.length,
              critical: criticalCount,
              high: highCount,
              actionable: insights.filter(i => i.actionable).length,
              immediate_actions: implications.filter(i => i.urgency === 'immediate').length,
              confidence_pct: confidence,
            },
            next_step: `Call misbar_generate_report with this synthesis and report_type for mode ${mode}.`,
          }, null, 2),
        }],
      }
    }
  )
}
