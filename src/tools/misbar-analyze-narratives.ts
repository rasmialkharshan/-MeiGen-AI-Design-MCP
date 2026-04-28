/**
 * Tool: misbar_analyze_narratives
 * Intelligence Engine — Narrative Engine
 */

import { z } from 'zod'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { runNarrativeEngine } from '../misbar/intelligence/narrative-engine.js'
import type { NormalizedArticle } from '../misbar/types.js'

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
}

export function registerMisbarAnalyzeNarratives(server: McpServer) {
  server.tool(
    'misbar_analyze_narratives',
    [
      'Narrative Engine: maps dominant and competing narratives across Arabic and Western media.',
      'Identifies: narrative clusters by strength, emotional register (fear/hope/anger/grief/pride),',
      'turning points where coverage surged or shifted, and contested claims between camps.',
      'Essential for understanding the STORY each media ecosystem is telling about the topic.',
    ].join(' '),
    schema,
    { readOnlyHint: true },
    async ({ topic, normalized_articles }) => {
      const arabic = normalized_articles.filter(a => a.source_camp === 'arabic') as NormalizedArticle[]
      const western = normalized_articles.filter(a => a.source_camp === 'western') as NormalizedArticle[]

      const narrativeAnalysis = runNarrativeEngine(topic, arabic, western)

      const hasNarrativeConflict = narrativeAnalysis.contested_claims.length > 0
      const hasTurningPoint = narrativeAnalysis.turning_points.length > 0

      const topNarrative = narrativeAnalysis.dominant_narratives[0]

      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({
            narrative_analysis: narrativeAnalysis,
            insights: {
              dominant_narrative_summary: topNarrative
                ? `"${topNarrative.title}" — strength ${topNarrative.strength}/100, emotional register: ${topNarrative.emotional_register}`
                : 'No dominant narrative detected',
              narrative_conflict_detected: hasNarrativeConflict,
              contested_claims_count: narrativeAnalysis.contested_claims.length,
              narrative_shift_detected: hasTurningPoint,
              shift_events: narrativeAnalysis.turning_points.map(tp => `${tp.date}: ${tp.event}`),
            },
            next_steps: [
              'Call misbar_analyze_trends to map how these narratives evolved over time',
              'Call misbar_synthesize_insights to convert all analysis into actionable intelligence',
              hasNarrativeConflict ? '→ Contested claims detected: include in final report as "disputed dimensions"' : '',
            ].filter(Boolean),
          }, null, 2),
        }],
      }
    }
  )
}
