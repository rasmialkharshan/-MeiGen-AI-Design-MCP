/**
 * Tool: misbar_analyze_trends
 * Intelligence Engine — Trend Engine (7d / 30d / 90d temporal analysis)
 */

import { z } from 'zod'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { runTrendEngine } from '../misbar/intelligence/trend-engine.js'
import type { NormalizedArticle, TimeRange } from '../misbar/types.js'

const ArticleSchema = z.object({
  id: z.string(),
  url: z.string(),
  title: z.string(),
  body: z.string(),
  source: z.string(),
  source_camp: z.enum(['arabic', 'western', 'global', 'think_tank']),
  language: z.enum(['ar', 'en', 'fr', 'other']),
  published_at: z.string(),
  author: z.string().optional(),
  tags: z.array(z.string()).optional(),
  translated_title: z.string().optional(),
  translated_body: z.string().optional(),
  entities: z.array(z.object({
    name: z.string(),
    type: z.enum(['person', 'country', 'organization', 'location', 'concept']),
    mentions: z.number(),
    sentiment: z.object({
      positive: z.number(), negative: z.number(), neutral: z.number(),
      overall: z.enum(['positive', 'negative', 'neutral', 'mixed']),
    }).optional(),
  })),
  topics: z.array(z.string()),
  sentiment: z.object({
    positive: z.number(), negative: z.number(), neutral: z.number(),
    overall: z.enum(['positive', 'negative', 'neutral', 'mixed']),
  }),
  word_count: z.number(),
  key_terms: z.array(z.string()),
})

const schema = {
  topic: z.string().describe('The research topic'),
  normalized_articles: z.array(ArticleSchema).min(1).describe(
    'Normalized articles from misbar_normalize_articles.'
  ),
  time_window: z.enum(['24h', '7d', '30d', '90d', 'custom']).describe(
    'Time window for trend analysis. Use 7d for weekly, 30d for monthly, 90d for quarterly.'
  ),
  split_by_camp: z.boolean().optional().default(false).describe(
    'If true, returns separate trend analyses for Arabic and Western media. Useful for Mode E (Trend Tracker).'
  ),
}

export function registerMisbarAnalyzeTrends(server: McpServer) {
  server.tool(
    'misbar_analyze_trends',
    [
      'Trend Engine: performs temporal analysis of media coverage over 7d, 30d, or 90d windows.',
      'Detects: trend direction (rising/falling/stable/volatile/spike), peak moments, velocity of change.',
      'Can split analysis by Arabic vs Western camp to compare trend synchronization.',
      'Use in Mode E (Trend Tracker) or when a topic has shifted rapidly over time.',
    ].join(' '),
    schema,
    { readOnlyHint: true },
    async ({ topic, normalized_articles, time_window, split_by_camp }) => {
      const all = normalized_articles as NormalizedArticle[]

      const overallTrend = runTrendEngine(topic, all, time_window as TimeRange)

      let campTrends = null
      if (split_by_camp) {
        const arabic = all.filter(a => a.source_camp === 'arabic')
        const western = all.filter(a => a.source_camp === 'western')
        campTrends = {
          arabic: arabic.length >= 2 ? runTrendEngine(topic, arabic, time_window as TimeRange) : null,
          western: western.length >= 2 ? runTrendEngine(topic, western, time_window as TimeRange) : null,
        }
      }

      const isSpiking = overallTrend.trend_direction === 'spike' || overallTrend.trend_direction === 'volatile'
      const isRising = overallTrend.trend_direction === 'rising'

      const alertNote = isSpiking
        ? `ALERT: rapid spread detected → potential crisis mode trigger. Velocity: ${overallTrend.velocity}%`
        : isRising && overallTrend.velocity > 50
        ? `WARNING: fast-rising coverage (velocity +${overallTrend.velocity}%). Monitor for escalation.`
        : null

      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({
            trend_analysis: overallTrend,
            camp_trends: campTrends,
            alert: alertNote,
            decision_logic: isSpiking
              ? 'rapid spread detected → Trigger Crisis Mode (Mode C)'
              : 'normal trend pattern',
            data_points_summary: `${overallTrend.data_points.length} days of data | Direction: ${overallTrend.trend_direction} | Velocity: ${overallTrend.velocity}%`,
            peak: overallTrend.peak_moment
              ? `Peak on ${overallTrend.peak_moment.date}: ${overallTrend.peak_moment.trigger}`
              : 'No clear peak detected',
            next_steps: [
              'Call misbar_synthesize_insights with all engine results',
              isSpiking ? '→ Consider switching to Crisis Mode (C) report format' : '',
            ].filter(Boolean),
          }, null, 2),
        }],
      }
    }
  )
}
