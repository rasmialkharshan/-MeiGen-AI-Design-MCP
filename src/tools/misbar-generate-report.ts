/**
 * Tool: misbar_generate_report
 * Output Layer — Template Engine + Report Formatter
 */

import { z } from 'zod'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { MisbarReport, ReportType, ReportSection, MisbarMode, TimeRange } from '../misbar/types.js'
import { randomUUID } from 'crypto'

const SynthesisSchema = z.object({
  topic: z.string(),
  generated_at: z.string(),
  executive_summary: z.string(),
  confidence_level: z.number(),
  key_insights: z.array(z.object({
    title: z.string(),
    description: z.string(),
    priority: z.string(),
    category: z.string(),
    actionable: z.boolean(),
    recommended_action: z.string().optional(),
  })),
  strategic_implications: z.array(z.object({
    area: z.string(),
    implication: z.string(),
    urgency: z.string(),
  })),
  scenarios: z.array(z.object({
    title: z.string(),
    probability: z.string(),
    description: z.string(),
    recommended_response: z.string(),
  })),
})

const schema = {
  synthesis: SynthesisSchema.describe('Output from misbar_synthesize_insights'),
  report_type: z.enum(['daily_pulse', 'weekly_report', 'crisis_report', 'reputation_dashboard', 'editorial_article', 'comparative_brief']).describe(
    'Report format. daily_pulse: quick 1-pager. weekly_report: full weekly digest. crisis_report: urgent rapid-response. reputation_dashboard: entity focus. editorial_article: publishable piece. comparative_brief: concise Arabic/Western comparison.'
  ),
  topic: z.string().describe('Research topic'),
  time_range: z.enum(['24h', '7d', '30d', '90d', 'custom']).describe('Coverage time window'),
  mode: z.enum(['A', 'B', 'C', 'D', 'E', 'F']).describe('Analysis mode'),
  arabic_article_count: z.number().optional().default(0).describe('Number of Arabic articles analyzed'),
  western_article_count: z.number().optional().default(0).describe('Number of Western articles analyzed'),
  additional_context: z.string().optional().describe('Any additional context to include in the report'),
}

function formatPriority(priority: string): string {
  const icons: Record<string, string> = { critical: '🔴', high: '🟠', medium: '🟡', low: '🟢' }
  return `${icons[priority] ?? '⚪'} ${priority.toUpperCase()}`
}

function buildDailyPulse(synthesis: z.infer<typeof SynthesisSchema>, topic: string, timeRange: TimeRange): ReportSection[] {
  const topInsights = synthesis.key_insights.slice(0, 3)
  return [
    {
      title: '📡 Daily Pulse',
      content: `**Topic:** ${topic}\n**Generated:** ${new Date().toLocaleDateString('en-GB')}\n\n${synthesis.executive_summary}`,
    },
    {
      title: '⚡ Top Signals',
      content: topInsights.map(i => `**${formatPriority(i.priority)}: ${i.title}**\n${i.description}`).join('\n\n'),
    },
    {
      title: '🎯 Immediate Actions',
      content: synthesis.key_insights
        .filter(i => i.actionable && i.recommended_action)
        .slice(0, 3)
        .map(i => `→ ${i.recommended_action}`)
        .join('\n') || 'No immediate actions required.',
    },
  ]
}

function buildWeeklyReport(synthesis: z.infer<typeof SynthesisSchema>, topic: string): ReportSection[] {
  return [
    {
      title: '📊 Executive Summary',
      content: synthesis.executive_summary + `\n\n**Analysis Confidence:** ${synthesis.confidence_level}%`,
    },
    {
      title: '🔍 Key Intelligence Findings',
      content: synthesis.key_insights
        .map(i => `### ${formatPriority(i.priority)}: ${i.title}\n${i.description}${i.recommended_action ? `\n\n**Recommended Action:** ${i.recommended_action}` : ''}`)
        .join('\n\n---\n\n'),
    },
    {
      title: '♟ Strategic Implications',
      content: synthesis.strategic_implications
        .map(imp => `**[${imp.urgency.toUpperCase()}] ${imp.area.toUpperCase()}:** ${imp.implication}`)
        .join('\n\n'),
    },
    {
      title: '🔮 Media Scenarios',
      content: synthesis.scenarios
        .map(s => `### ${s.title} *(${s.probability})*\n${s.description}\n\n**Response:** ${s.recommended_response}`)
        .join('\n\n---\n\n'),
    },
  ]
}

function buildCrisisReport(synthesis: z.infer<typeof SynthesisSchema>, topic: string): ReportSection[] {
  const critical = synthesis.key_insights.filter(i => i.priority === 'critical' || i.priority === 'high')
  const immediate = synthesis.strategic_implications.filter(i => i.urgency === 'immediate')

  return [
    {
      title: '🚨 CRISIS INTELLIGENCE BRIEF',
      content: `**TOPIC:** ${topic}\n**STATUS:** ACTIVE MONITORING\n**TIME:** ${new Date().toISOString()}\n\n${synthesis.executive_summary}`,
    },
    {
      title: '🔴 Critical Alerts',
      content: critical.length > 0
        ? critical.map(i => `⚠️ **${i.title}**\n${i.description}`).join('\n\n')
        : 'No critical alerts at this time.',
    },
    {
      title: '⚡ Immediate Response Required',
      content: immediate.length > 0
        ? immediate.map(i => `**[${i.area.toUpperCase()}]** ${i.implication}`).join('\n\n')
        : 'No immediate actions triggered.',
    },
    {
      title: '📈 Likely Scenario',
      content: synthesis.scenarios.find(s => s.probability === 'likely')
        ? `**${synthesis.scenarios.find(s => s.probability === 'likely')!.title}**\n${synthesis.scenarios.find(s => s.probability === 'likely')!.description}\n\n**Action:** ${synthesis.scenarios.find(s => s.probability === 'likely')!.recommended_response}`
        : 'No high-probability scenario projected.',
    },
  ]
}

function buildReputationDashboard(synthesis: z.infer<typeof SynthesisSchema>, topic: string): ReportSection[] {
  const repInsights = synthesis.key_insights.filter(i => i.category === 'reputation')

  return [
    {
      title: '📈 Reputation Dashboard',
      content: `**Subject:** ${topic}\n**Report Date:** ${new Date().toLocaleDateString()}\n\n${synthesis.executive_summary}`,
    },
    {
      title: '🎭 Reputation Signals',
      content: repInsights.length > 0
        ? repInsights.map(i => `**${i.title}**\n${i.description}`).join('\n\n')
        : synthesis.key_insights.slice(0, 2).map(i => `**${i.title}**\n${i.description}`).join('\n\n'),
    },
    {
      title: '♟ Strategic Recommendations',
      content: synthesis.strategic_implications
        .map(imp => `**${imp.area.toUpperCase()} [${imp.urgency}]:** ${imp.implication}`)
        .join('\n\n'),
    },
  ]
}

function buildEditorialArticle(synthesis: z.infer<typeof SynthesisSchema>, topic: string): ReportSection[] {
  const topInsight = synthesis.key_insights[0]
  const topScenario = synthesis.scenarios[0]

  return [
    {
      title: 'ARTICLE DRAFT',
      content: `# The ${topic} Coverage Divide: What Each Media World Is Missing\n\n*Analysis | ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}*`,
    },
    {
      title: 'Introduction',
      content: synthesis.executive_summary,
    },
    {
      title: 'Analysis',
      content: synthesis.key_insights
        .slice(0, 4)
        .map(i => `## ${i.title}\n\n${i.description}`)
        .join('\n\n'),
    },
    {
      title: 'Strategic Outlook',
      content: topScenario
        ? `Looking ahead, the most likely scenario is **"${topScenario.title}"**: ${topScenario.description}\n\n${topScenario.recommended_response}`
        : '',
    },
    {
      title: 'Conclusion',
      content: topInsight
        ? `The central finding of this analysis is: **${topInsight.title}** — ${topInsight.description}${topInsight.recommended_action ? ` The recommended response: ${topInsight.recommended_action}` : ''}`
        : synthesis.executive_summary,
    },
  ]
}

function buildComparativeBrief(synthesis: z.infer<typeof SynthesisSchema>, topic: string): ReportSection[] {
  return [
    {
      title: '⚖️ Comparative Media Brief',
      content: `**Topic:** ${topic} | **Date:** ${new Date().toLocaleDateString()}\n\n${synthesis.executive_summary}`,
    },
    {
      title: '🌐 Arabic Media vs Western Media',
      content: synthesis.key_insights
        .filter(i => i.category === 'gap' || i.category === 'framing')
        .map(i => `**${i.title}:** ${i.description}`)
        .join('\n\n') || 'No significant divergence detected.',
    },
    {
      title: '📌 Key Takeaway',
      content: synthesis.key_insights[0]
        ? `${synthesis.key_insights[0].description}${synthesis.key_insights[0].recommended_action ? `\n\n**Action:** ${synthesis.key_insights[0].recommended_action}` : ''}`
        : synthesis.executive_summary,
    },
  ]
}

const REPORT_TYPE_MAP: Record<ReportType, (s: z.infer<typeof SynthesisSchema>, t: string, tr: TimeRange) => ReportSection[]> = {
  daily_pulse: buildDailyPulse,
  weekly_report: (s, t) => buildWeeklyReport(s, t),
  crisis_report: (s, t) => buildCrisisReport(s, t),
  reputation_dashboard: (s, t) => buildReputationDashboard(s, t),
  editorial_article: (s, t) => buildEditorialArticle(s, t),
  comparative_brief: (s, t) => buildComparativeBrief(s, t),
}

export function registerMisbarGenerateReport(server: McpServer) {
  server.tool(
    'misbar_generate_report',
    [
      'Output Layer: formats the final Misbar intelligence report.',
      'Supports 6 report types: daily_pulse, weekly_report, crisis_report, reputation_dashboard,',
      'editorial_article, comparative_brief.',
      'Takes the synthesis from misbar_synthesize_insights and produces a formatted MisbarReport.',
      'This is the final step in the pipeline.',
    ].join(' '),
    schema,
    { readOnlyHint: true },
    async ({ synthesis, report_type, topic, time_range, mode, arabic_article_count, western_article_count, additional_context }) => {
      const buildSections = REPORT_TYPE_MAP[report_type as ReportType]
      const sections = buildSections(synthesis, topic, time_range as TimeRange)

      if (additional_context) {
        sections.push({ title: 'Additional Context', content: additional_context })
      }

      const fullText = sections
        .map(s => `## ${s.title}\n\n${s.content}`)
        .join('\n\n---\n\n')

      const report: MisbarReport = {
        report_id: randomUUID(),
        report_type: report_type as ReportType,
        topic,
        generated_at: new Date().toISOString(),
        time_range: time_range as TimeRange,
        sections,
        full_text: fullText,
        metadata: {
          sources_analyzed: (arabic_article_count ?? 0) + (western_article_count ?? 0),
          arabic_sources: arabic_article_count ?? 0,
          western_sources: western_article_count ?? 0,
          mode: mode as MisbarMode,
          confidence: synthesis.confidence_level,
        },
      }

      return {
        content: [{
          type: 'text' as const,
          text: [
            `# MISBAR INTELLIGENCE REPORT`,
            `**ID:** ${report.report_id}`,
            `**Type:** ${report_type.replace(/_/g, ' ').toUpperCase()}`,
            `**Topic:** ${topic}`,
            `**Generated:** ${new Date().toLocaleString()}`,
            `**Sources:** ${report.metadata.sources_analyzed} (${report.metadata.arabic_sources} Arabic, ${report.metadata.western_sources} Western)`,
            `**Confidence:** ${report.metadata.confidence}%`,
            '',
            '---',
            '',
            fullText,
            '',
            '---',
            `*Report ID: ${report.report_id} | Misbar Intelligence System v3.0*`,
            '',
            'To save this analysis to memory, call misbar_save_analysis with this report.',
          ].join('\n'),
        }],
      }
    }
  )
}
