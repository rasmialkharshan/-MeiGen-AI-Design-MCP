/**
 * Tool: misbar_analyze_framing
 * Intelligence Engine — Framing Engine (Semantic Comparison, Keyword Divergence, Narrative Pattern Detection)
 */

import { z } from 'zod'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { runFramingEngine } from '../misbar/intelligence/framing-engine.js'
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
    'Normalized articles from misbar_normalize_articles. Split by source_camp automatically.'
  ),
}

export function registerMisbarAnalyzeFraming(server: McpServer) {
  server.tool(
    'misbar_analyze_framing',
    [
      'Framing Engine: compares HOW Arabic and Western media frame the same topic.',
      'Analyzes: terminology divergence, angle selection, narrative tone, framing dimensions',
      '(victim/perpetrator, cause attribution, urgency, moral judgment, etc.).',
      'Produces a FramingAnalysis with overall_divergence (low/medium/high/critical).',
      'Core to understanding WHY coverage gaps exist — not just THAT they exist.',
    ].join(' '),
    schema,
    { readOnlyHint: true },
    async ({ topic, normalized_articles }) => {
      const arabic = normalized_articles.filter(a => a.source_camp === 'arabic') as NormalizedArticle[]
      const western = normalized_articles.filter(a => a.source_camp === 'western') as NormalizedArticle[]

      const framing = runFramingEngine(topic, arabic, western)

      const decisionLogic =
        framing.overall_divergence === 'critical' || framing.overall_divergence === 'high'
          ? `terminology divergence > threshold → FRAMING DIFFERENCE FLAGGED (${framing.overall_divergence.toUpperCase()})`
          : `terminology divergence within acceptable range → Framing alignment (${framing.overall_divergence})`

      const criticalDivergences = framing.terminology_divergences.filter(
        d => d.divergence_level === 'critical' || d.divergence_level === 'high'
      )

      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({
            framing_analysis: framing,
            decision_logic: decisionLogic,
            critical_divergences_count: criticalDivergences.length,
            tone_contrast: `Arabic: ${framing.narrative_tone.arabic} | Western: ${framing.narrative_tone.western}`,
            exclusive_angles_summary: {
              arabic_only: framing.angle_map.arabic_angles.length,
              western_only: framing.angle_map.western_angles.length,
              shared: framing.angle_map.shared_angles.length,
            },
            next_steps: [
              'Call misbar_analyze_narratives to map narrative structures behind these framing differences',
              framing.overall_divergence === 'critical'
                ? '→ ALERT: Consider misbar_analyze_reputation if this framing affects a specific entity'
                : 'Call misbar_synthesize_insights when all engines have run',
            ],
          }, null, 2),
        }],
      }
    }
  )
}
