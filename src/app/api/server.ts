/**
 * Misbar Intelligence System — Express REST API
 * POST /api/analyze   — full pipeline analysis
 * GET  /api/report/:id — retrieve saved report
 * GET  /api/memory/:topic — query topic history
 * GET  /api/health    — health check
 */

import express, { type Request, type Response, type NextFunction } from 'express'
import { collectArticles } from '../feeds/rss-collector.js'
import {
  aiNormalizeArticles,
  aiAnalyzeCoverage,
  aiAnalyzeFraming,
  aiAnalyzeNarratives,
  aiAnalyzeTrends,
  aiAnalyzeReputation,
  aiSynthesizeInsights,
} from '../analysis/ai-analyzer.js'
import { loadStore, addHistoricalEntry, getTopicHistory, saveStore, getNarrativeEvolution } from '../../misbar/memory/store.js'
import type { MisbarMode, TimeRange, NormalizedArticle } from '../../misbar/types.js'
import { randomUUID } from 'crypto'

const reports = new Map<string, object>()

export function createApiServer(port = 3737): express.Express {
  const app = express()
  app.use(express.json({ limit: '2mb' }))

  // ── Health ──────────────────────────────────────────────────────────────
  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({
      status: 'ok',
      service: 'Misbar Intelligence System v3.0',
      timestamp: new Date().toISOString(),
      anthropic_key_set: !!process.env.ANTHROPIC_API_KEY,
    })
  })

  // ── Analyze ─────────────────────────────────────────────────────────────
  app.post('/api/analyze', async (req: Request, res: Response) => {
    const {
      topic,
      mode = 'B',
      time_range = '7d',
      entity,
      include_think_tanks = false,
    } = req.body as {
      topic: string
      mode?: MisbarMode
      time_range?: TimeRange
      entity?: string
      include_think_tanks?: boolean
    }

    if (!topic) {
      res.status(400).json({ error: 'topic is required' })
      return
    }

    try {
      // Step 1: Collect articles from RSS feeds
      const collection = await collectArticles(topic, {
        includeArabic: true,
        includeWestern: true,
        includeThinkTanks: include_think_tanks,
        articlesPerSource: mode === 'A' ? 5 : 10,
      })

      if (collection.articles.length < 3) {
        res.status(422).json({
          error: 'Insufficient articles collected',
          sources_attempted: collection.sources_attempted,
          sources_succeeded: collection.sources_succeeded,
          feed_errors: collection.errors.slice(0, 5),
        })
        return
      }

      // Step 2: AI Normalization
      const normalized = await aiNormalizeArticles(collection.articles)
      const arabic = normalized.filter(a => a.source_camp === 'arabic') as NormalizedArticle[]
      const western = normalized.filter(a => a.source_camp === 'western') as NormalizedArticle[]

      // Step 3: Parallel intelligence engines
      const [coverage, framing, narratives] = await Promise.all([
        aiAnalyzeCoverage(topic, arabic, western),
        aiAnalyzeFraming(topic, arabic, western),
        aiAnalyzeNarratives(topic, arabic, western),
      ])

      // Optional engines
      const trends = (mode === 'E' || mode === 'C')
        ? await aiAnalyzeTrends(topic, normalized, time_range)
        : undefined

      const reputation = (mode === 'D' && entity)
        ? await aiAnalyzeReputation(entity, topic, arabic, western)
        : undefined

      // Step 4: Synthesis
      const synthesis = await aiSynthesizeInsights(topic, coverage, framing, narratives, trends, reputation)

      // Step 5: Build report
      const reportId = randomUUID()
      const report = {
        report_id: reportId,
        topic,
        mode,
        time_range,
        generated_at: new Date().toISOString(),
        sources: {
          total: collection.articles.length,
          arabic: arabic.length,
          western: western.length,
          sources_reached: collection.sources_succeeded,
        },
        coverage_gap: coverage,
        framing_analysis: framing,
        narrative_analysis: narratives,
        trend_analysis: trends ?? null,
        reputation_analysis: reputation ?? null,
        synthesis,
        decision_alerts: buildAlerts(coverage.gap_score, framing.overall_divergence, reputation),
      }

      reports.set(reportId, report)

      // Step 6: Save to memory
      const store = loadStore()
      addHistoricalEntry(store, {
        topic,
        date: new Date().toISOString().substring(0, 10),
        mode: mode as MisbarMode,
        gap_score: coverage.gap_score,
        framing_divergence: framing.overall_divergence,
        dominant_narratives: narratives.dominant_narratives.map(n => n.title),
        report_id: reportId,
      })
      saveStore(store)

      res.json(report)
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      res.status(500).json({ error: message })
    }
  })

  // ── Get Report ──────────────────────────────────────────────────────────
  app.get('/api/report/:id', (req: Request, res: Response) => {
    const report = reports.get(req.params['id'] as string)
    if (!report) {
      res.status(404).json({ error: 'Report not found. Reports are session-scoped — start the server and analyze first.' })
      return
    }
    res.json(report)
  })

  // ── Memory ──────────────────────────────────────────────────────────────
  app.get('/api/memory/:topic', (req: Request, res: Response) => {
    const topic = decodeURIComponent(req.params['topic'] as string)
    const store = loadStore()
    const history = getTopicHistory(store, topic, 20)
    const evolution = getNarrativeEvolution(store, topic)

    res.json({
      topic,
      history,
      narrative_evolution: evolution ?? null,
      memory_stats: {
        total_entries: store.historical_entries.length,
        sources_profiled: Object.keys(store.source_profiles).length,
        topics_tracked: Object.keys(store.narrative_evolutions).length,
      },
    })
  })

  // ── Sources ─────────────────────────────────────────────────────────────
  app.get('/api/sources', (_req: Request, res: Response) => {
    const { ARABIC_SOURCES, WESTERN_SOURCES, THINK_TANK_SOURCES } = require('../feeds/sources.js')
    res.json({
      arabic: ARABIC_SOURCES.map((s: { name: string; camp: string; language: string; bias: string; reliability: number }) => ({ name: s.name, camp: s.camp, language: s.language, bias: s.bias, reliability: s.reliability })),
      western: WESTERN_SOURCES.map((s: { name: string; camp: string; language: string; bias: string; reliability: number }) => ({ name: s.name, camp: s.camp, language: s.language, bias: s.bias, reliability: s.reliability })),
      think_tank: THINK_TANK_SOURCES.map((s: { name: string; camp: string; language: string; bias: string; reliability: number }) => ({ name: s.name, camp: s.camp, language: s.language, bias: s.bias, reliability: s.reliability })),
    })
  })

  // ── Error handler ────────────────────────────────────────────────────────
  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    res.status(500).json({ error: err.message })
  })

  return app
}

function buildAlerts(
  gapScore: number,
  framingDivergence: string,
  reputation?: { alert_triggered?: boolean; reputation_risk?: string; alert_reason?: string }
): object[] {
  const alerts = []

  if (gapScore >= 45) {
    alerts.push({
      type: 'coverage_gap',
      severity: gapScore >= 70 ? 'critical' : 'warning',
      message: `Coverage gap score ${gapScore}/100 — significant underreporting detected`,
      recommended_action: 'Flag for editorial coverage. Assign reporters to underreported angles.',
    })
  }

  if (framingDivergence === 'high' || framingDivergence === 'critical') {
    alerts.push({
      type: 'framing_divergence',
      severity: framingDivergence === 'critical' ? 'critical' : 'warning',
      message: `${framingDivergence.toUpperCase()} framing divergence — Arabic and Western media using incompatible frameworks`,
      recommended_action: 'Prepare bilingual explainer. Bridge terminology gap in editorial content.',
    })
  }

  if (reputation?.alert_triggered) {
    alerts.push({
      type: 'reputation_spike',
      severity: reputation.reputation_risk === 'critical' ? 'critical' : 'warning',
      message: reputation.alert_reason ?? 'Negative sentiment spike detected',
      recommended_action: 'Activate reputation response strategy. Monitor spread every 6 hours.',
    })
  }

  return alerts
}

export function startApiServer(port = 3737): void {
  const app = createApiServer(port)
  app.listen(port, () => {
    console.log(`Misbar Intelligence API running on http://localhost:${port}`)
    console.log(`  POST /api/analyze   — analyze a topic`)
    console.log(`  GET  /api/report/:id — retrieve report`)
    console.log(`  GET  /api/memory/:topic — topic history`)
    console.log(`  GET  /api/sources   — list news sources`)
    console.log(`  GET  /api/health    — health check`)
  })
}
