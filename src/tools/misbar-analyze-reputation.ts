/**
 * Tool: misbar_analyze_reputation
 * Intelligence Engine — Reputation Engine (Mode D: Reputation Watch)
 */

import { z } from 'zod'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { runReputationEngine } from '../misbar/intelligence/reputation-engine.js'
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
  entity: z.string().describe(
    'The entity to track (person, country, organization, or brand). e.g. "Saudi Arabia", "UNRWA", "Elon Musk"'
  ),
  topic: z.string().describe('The topic context in which the entity appears'),
  normalized_articles: z.array(ArticleSchema).min(1).describe(
    'Normalized articles from misbar_normalize_articles.'
  ),
}

export function registerMisbarAnalyzeReputation(server: McpServer) {
  server.tool(
    'misbar_analyze_reputation',
    [
      'Reputation Engine: tracks how an entity (person, country, org) is portrayed across Arabic and Western media.',
      'Computes: overall sentiment, reach score, reputation risk (low/medium/high/critical),',
      'camp-specific reputation divergence, and dominant narrative drivers.',
      'Triggers automatic alerts when negative sentiment spikes above threshold.',
      'Use in Mode D (Reputation Watch) or when an entity is at the center of a coverage gap.',
    ].join(' '),
    schema,
    { readOnlyHint: true },
    async ({ entity, topic, normalized_articles }) => {
      const arabic = normalized_articles.filter(a => a.source_camp === 'arabic') as NormalizedArticle[]
      const western = normalized_articles.filter(a => a.source_camp === 'western') as NormalizedArticle[]

      const reputation = runReputationEngine(entity, topic, arabic, western)

      const sentimentContrast =
        reputation.arabic_reputation.overall !== reputation.western_reputation.overall
          ? `DIVERGENCE: Arabic portrayal is ${reputation.arabic_reputation.overall}, Western portrayal is ${reputation.western_reputation.overall}`
          : `ALIGNED: Both camps view "${entity}" as ${reputation.sentiment.overall}`

      const decisionLogic = reputation.alert_triggered
        ? `negative sentiment spike → REPUTATION ALERT TRIGGERED (risk: ${reputation.reputation_risk})`
        : `sentiment within normal range (risk: ${reputation.reputation_risk})`

      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({
            reputation_analysis: reputation,
            decision_logic: decisionLogic,
            sentiment_contrast: sentimentContrast,
            alert: reputation.alert_triggered ? {
              severity: reputation.reputation_risk === 'critical' ? 'CRITICAL' : 'WARNING',
              message: reputation.alert_reason,
              recommended_action: 'Prepare counter-narrative strategy. Escalate to Mode C (Crisis) if spread continues.',
            } : null,
            dashboard_summary: {
              entity,
              overall_sentiment: reputation.sentiment.overall,
              negative_pct: Math.round(reputation.sentiment.negative * 100),
              positive_pct: Math.round(reputation.sentiment.positive * 100),
              reach_score: reputation.reach_score,
              reputation_risk: reputation.reputation_risk,
              top_driver: reputation.reputation_drivers[0] ?? 'N/A',
            },
          }, null, 2),
        }],
      }
    }
  )
}
