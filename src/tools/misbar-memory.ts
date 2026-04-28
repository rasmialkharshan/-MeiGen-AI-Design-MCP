/**
 * Tool: misbar_save_analysis + misbar_query_memory
 * Memory & Learning Layer — Historical Database, Narrative Tracker, Source Profiles, Feedback Loop
 */

import { z } from 'zod'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import {
  loadStore,
  saveStore,
  addHistoricalEntry,
  getTopicHistory,
  upsertSourceProfile,
  getSourceProfile,
  updateNarrativeEvolution,
  getNarrativeEvolution,
  addFeedback,
} from '../misbar/memory/store.js'
import type { MisbarMode, SourceProfile } from '../misbar/types.js'

// ─── misbar_save_analysis ───────────────────────────────────────────

const saveSchema = {
  topic: z.string().describe('Research topic'),
  mode: z.enum(['A', 'B', 'C', 'D', 'E', 'F']).describe('Analysis mode used'),
  gap_score: z.number().min(0).max(100).describe('Gap score from coverage analysis (0–100)'),
  framing_divergence: z.enum(['low', 'medium', 'high', 'critical']).describe('Framing divergence level'),
  dominant_narratives: z.array(z.string()).describe('Titles of dominant narratives identified'),
  report_id: z.string().optional().describe('ID of the generated report'),
  narrative_snapshot: z.string().optional().describe('Brief narrative summary for evolution tracking'),
}

export function registerMisbarSaveAnalysis(server: McpServer) {
  server.tool(
    'misbar_save_analysis',
    [
      'Memory Layer: saves analysis results to the historical database for learning and trend tracking.',
      'Updates narrative evolution tracker to detect long-term narrative shifts.',
      'Call this after misbar_generate_report to complete the feedback loop.',
      'Enables future analyses to reference historical coverage patterns for the same topic.',
    ].join(' '),
    saveSchema,
    async ({ topic, mode, gap_score, framing_divergence, dominant_narratives, report_id, narrative_snapshot }) => {
      const store = loadStore()

      const entry = addHistoricalEntry(store, {
        topic,
        date: new Date().toISOString().substring(0, 10),
        mode: mode as MisbarMode,
        gap_score,
        framing_divergence,
        dominant_narratives,
        report_id,
      })

      if (narrative_snapshot) {
        const prevEvolution = getNarrativeEvolution(store, topic)
        const prevSnapshot = prevEvolution?.timeline.at(-1)?.narrative_snapshot ?? ''
        const shiftDetected = prevSnapshot !== '' && prevSnapshot !== narrative_snapshot

        updateNarrativeEvolution(store, topic, narrative_snapshot, shiftDetected)
      }

      saveStore(store)

      const history = getTopicHistory(store, topic, 5)
      const avgGapScore = history.length > 0
        ? Math.round(history.reduce((s, e) => s + e.gap_score, 0) / history.length)
        : gap_score

      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({
            saved: true,
            entry_id: entry.entry_id,
            topic_history_count: history.length,
            avg_gap_score_historical: avgGapScore,
            narrative_shift_detected: narrative_snapshot
              ? getNarrativeEvolution(store, topic)?.timeline.at(-1)?.shift_detected ?? false
              : null,
            message: `Analysis saved. ${history.length} historical entries for "${topic}". Average gap score: ${avgGapScore}/100.`,
          }, null, 2),
        }],
      }
    }
  )
}

// ─── misbar_query_memory ───────────────────────────────────────────

const querySchema = {
  topic: z.string().describe('Topic to query historical data for'),
  query_type: z.enum(['history', 'narrative_evolution', 'source_bias', 'all']).describe(
    'history: past analyses. narrative_evolution: how narratives changed. source_bias: known source profiles. all: everything.'
  ),
  source_name: z.string().optional().describe('Source name for source_bias query (e.g. "Al Jazeera", "BBC")'),
  limit: z.number().int().min(1).max(50).optional().default(10).describe('Max historical entries to return'),
}

export function registerMisbarQueryMemory(server: McpServer) {
  server.tool(
    'misbar_query_memory',
    [
      'Memory Layer: query historical analysis data, narrative evolution, and source bias profiles.',
      'Use at the START of an analysis to understand past coverage patterns for a topic.',
      'Source bias profiles include known reliability scores and historical framing tendencies',
      'for major Arabic and Western media outlets.',
    ].join(' '),
    querySchema,
    { readOnlyHint: true },
    async ({ topic, query_type, source_name, limit }) => {
      const store = loadStore()
      const result: Record<string, unknown> = { topic, query_type }

      if (query_type === 'history' || query_type === 'all') {
        const history = getTopicHistory(store, topic, limit ?? 10)
        result.history = {
          entries: history,
          total_entries: history.length,
          avg_gap_score: history.length > 0
            ? Math.round(history.reduce((s, e) => s + e.gap_score, 0) / history.length)
            : null,
          most_common_framing: history.length > 0
            ? history.reduce((acc, e) => {
                acc[e.framing_divergence] = (acc[e.framing_divergence] ?? 0) + 1
                return acc
              }, {} as Record<string, number>)
            : null,
        }
      }

      if (query_type === 'narrative_evolution' || query_type === 'all') {
        const evolution = getNarrativeEvolution(store, topic)
        result.narrative_evolution = evolution
          ? {
              topic: evolution.topic,
              timeline_length: evolution.timeline.length,
              recent_snapshots: evolution.timeline.slice(-5),
              shifts_detected: evolution.timeline.filter(t => t.shift_detected).length,
            }
          : { message: `No narrative evolution data for "${topic}" yet.` }
      }

      if (query_type === 'source_bias' || query_type === 'all') {
        if (source_name) {
          const profile = getSourceProfile(store, source_name)
          result.source_profile = profile ?? { message: `No profile found for "${source_name}"` }
        } else {
          // Return all known profiles overview
          result.source_profiles_overview = Object.values(store.source_profiles).map(p => ({
            source: p.source_name,
            camp: p.camp,
            bias: p.known_bias,
            reliability: p.reliability_score,
            specializations: p.topic_specializations.slice(0, 2),
          }))
        }
      }

      result.memory_stats = {
        total_historical_entries: store.historical_entries.length,
        total_sources_profiled: Object.keys(store.source_profiles).length,
        topics_tracked: Object.keys(store.narrative_evolutions).length,
        last_updated: store.last_updated,
      }

      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify(result, null, 2),
        }],
      }
    }
  )
}

// ─── misbar_submit_feedback ────────────────────────────────────────

const feedbackSchema = {
  analysis_id: z.string().describe('The entry_id or report_id of the analysis to rate'),
  rating: z.number().int().min(1).max(5).describe('Quality rating 1–5 (5 = excellent)'),
  notes: z.string().optional().default('').describe('Optional feedback notes'),
}

export function registerMisbarFeedback(server: McpServer) {
  server.tool(
    'misbar_submit_feedback',
    [
      'Feedback Loop: submit quality rating for a completed analysis.',
      'Used by the Memory & Learning Layer to improve future analyses over time.',
      'Rating 1–5: 1=poor, 3=acceptable, 5=excellent.',
    ].join(' '),
    feedbackSchema,
    async ({ analysis_id, rating, notes }) => {
      const store = loadStore()
      addFeedback(store, analysis_id, rating, notes ?? '')
      saveStore(store)

      const avgRating = store.feedback.length > 0
        ? (store.feedback.reduce((s, f) => s + f.rating, 0) / store.feedback.length).toFixed(1)
        : rating.toFixed(1)

      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({
            feedback_saved: true,
            analysis_id,
            rating,
            total_feedback_count: store.feedback.length,
            avg_system_rating: avgRating,
          }, null, 2),
        }],
      }
    }
  )
}
