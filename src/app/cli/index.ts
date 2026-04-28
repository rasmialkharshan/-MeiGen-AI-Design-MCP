#!/usr/bin/env node
/**
 * Misbar Intelligence System — Professional CLI
 * Usage: misbar <command> [options]
 */

import { Command } from 'commander'
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
import { loadStore, addHistoricalEntry, saveStore, getTopicHistory } from '../../misbar/memory/store.js'
import { startApiServer } from '../api/server.js'
import type { MisbarMode, TimeRange, NormalizedArticle } from '../../misbar/types.js'
import { randomUUID } from 'crypto'

const program = new Command()

program
  .name('misbar')
  .description('Misbar Intelligence System v3.0 — Comparative Media Analysis CLI')
  .version('3.0.0')

// ─── analyze ────────────────────────────────────────────────────────────────

program
  .command('analyze <topic>')
  .description('Run full pipeline analysis on a topic')
  .option('-m, --mode <mode>', 'Analysis mode (A=Daily, B=Deep, C=Crisis, D=Reputation, E=Trend, F=Framing)', 'B')
  .option('-t, --time-range <range>', 'Time window (24h, 7d, 30d, 90d)', '7d')
  .option('-e, --entity <entity>', 'Entity to track (for Mode D reputation analysis)')
  .option('--think-tanks', 'Include think tank sources', false)
  .option('--json', 'Output raw JSON instead of formatted report', false)
  .action(async (topic: string, options: {
    mode: string
    timeRange: string
    entity?: string
    thinkTanks: boolean
    json: boolean
  }) => {
    const mode = options.mode.toUpperCase() as MisbarMode
    const timeRange = options.timeRange as TimeRange

    console.log(`\nMisbar Intelligence System v3.0`)
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
    console.log(`Topic:  ${topic}`)
    console.log(`Mode:   ${mode} | Time: ${timeRange}`)
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`)

    try {
      // Step 1: Collect
      process.stdout.write('Collecting articles from RSS feeds...')
      const collection = await collectArticles(topic, {
        includeArabic: true,
        includeWestern: true,
        includeThinkTanks: options.thinkTanks,
        articlesPerSource: mode === 'A' ? 5 : 10,
        onProgress: (source, count) => process.stdout.write(`.`),
      })
      console.log(` ${collection.articles.length} articles from ${collection.sources_succeeded} sources`)

      if (collection.articles.length < 3) {
        console.error(`\nInsufficient articles collected (${collection.articles.length}). Check network connectivity.`)
        process.exit(1)
      }

      // Step 2: Normalize
      process.stdout.write('Normalizing articles with Claude AI...')
      const normalized = await aiNormalizeArticles(collection.articles)
      const arabic = normalized.filter(a => a.source_camp === 'arabic') as NormalizedArticle[]
      const western = normalized.filter(a => a.source_camp === 'western') as NormalizedArticle[]
      console.log(` done (${arabic.length} Arabic, ${western.length} Western)`)

      // Step 3: Parallel analysis
      console.log('Running intelligence engines (parallel)...')
      const [coverage, framing, narratives] = await Promise.all([
        (async () => { process.stdout.write('  Coverage gap... '); const r = await aiAnalyzeCoverage(topic, arabic, western); console.log(`gap=${r.gap_score}`); return r })(),
        (async () => { process.stdout.write('  Framing... '); const r = await aiAnalyzeFraming(topic, arabic, western); console.log(`divergence=${r.overall_divergence}`); return r })(),
        (async () => { process.stdout.write('  Narratives... '); const r = await aiAnalyzeNarratives(topic, arabic, western); console.log(`${r.dominant_narratives.length} narratives`); return r })(),
      ])

      const trends = (mode === 'E' || mode === 'C')
        ? await (async () => { process.stdout.write('  Trends... '); const r = await aiAnalyzeTrends(topic, normalized, timeRange); console.log(r.trend_direction); return r })()
        : undefined

      const reputation = (mode === 'D' && options.entity)
        ? await (async () => { process.stdout.write(`  Reputation (${options.entity})... `); const r = await aiAnalyzeReputation(options.entity!, topic, arabic, western); console.log(`risk=${r.reputation_risk}`); return r })()
        : undefined

      // Step 4: Synthesis
      process.stdout.write('Synthesizing insights...')
      const synthesis = await aiSynthesizeInsights(topic, coverage, framing, narratives, trends, reputation)
      console.log(' done')

      // Step 5: Output
      const reportId = randomUUID()

      if (options.json) {
        console.log(JSON.stringify({ report_id: reportId, topic, mode, coverage, framing, narratives, trends, reputation, synthesis }, null, 2))
      } else {
        printReport(topic, mode, timeRange, reportId, synthesis, coverage, framing, narratives, collection.sources_succeeded)
      }

      // Step 6: Save to memory
      const store = loadStore()
      addHistoricalEntry(store, {
        topic,
        date: new Date().toISOString().substring(0, 10),
        mode,
        gap_score: coverage.gap_score,
        framing_divergence: framing.overall_divergence,
        dominant_narratives: narratives.dominant_narratives.map(n => n.title),
        report_id: reportId,
      })
      saveStore(store)
      console.log(`\nReport saved: ${reportId}`)

    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      console.error(`\nError: ${message}`)
      process.exit(1)
    }
  })

// ─── memory ─────────────────────────────────────────────────────────────────

program
  .command('memory <topic>')
  .description('Query historical analysis data for a topic')
  .option('-n, --limit <n>', 'Max entries to return', '10')
  .action((topic: string, options: { limit: string }) => {
    const store = loadStore()
    const history = getTopicHistory(store, topic, parseInt(options.limit, 10))

    console.log(`\nMemory: "${topic}"`)
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)

    if (history.length === 0) {
      console.log('No historical entries found.')
      return
    }

    history.forEach((entry, i) => {
      console.log(`\n[${i + 1}] ${entry.date} — Mode ${entry.mode}`)
      console.log(`  Gap score:  ${entry.gap_score}/100`)
      console.log(`  Framing:    ${entry.framing_divergence}`)
      console.log(`  Narratives: ${entry.dominant_narratives.slice(0, 2).join(', ')}`)
      if (entry.report_id) console.log(`  Report ID:  ${entry.report_id}`)
    })

    const avgGap = Math.round(history.reduce((s, e) => s + e.gap_score, 0) / history.length)
    console.log(`\n─ ${history.length} entries | Avg gap score: ${avgGap}/100`)
  })

// ─── sources ────────────────────────────────────────────────────────────────

program
  .command('sources')
  .description('List all configured news sources')
  .option('--camp <camp>', 'Filter by camp (arabic, western, think_tank)')
  .action(async (options: { camp?: string }) => {
    const { ARABIC_SOURCES, WESTERN_SOURCES, THINK_TANK_SOURCES } = await import('../feeds/sources.js')
    const all = [...ARABIC_SOURCES, ...WESTERN_SOURCES, ...THINK_TANK_SOURCES]
    const filtered = options.camp ? all.filter(s => s.camp === options.camp) : all

    console.log(`\nConfigured Sources (${filtered.length})`)
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
    filtered.forEach(s => {
      console.log(`  ${s.camp.padEnd(10)} ${s.language}  ${String(s.reliability).padEnd(4)} ${s.name}`)
    })
  })

// ─── serve ───────────────────────────────────────────────────────────────────

program
  .command('serve')
  .description('Start the Misbar REST API server')
  .option('-p, --port <port>', 'Port to listen on', '3737')
  .action((options: { port: string }) => {
    const port = parseInt(options.port, 10)
    startApiServer(port)
  })

// ─── Report Printer ──────────────────────────────────────────────────────────

function printReport(
  topic: string,
  mode: string,
  timeRange: string,
  reportId: string,
  synthesis: import('../../misbar/types.js').InsightSynthesis,
  coverage: import('../../misbar/types.js').CoverageGapMatrix,
  framing: import('../../misbar/types.js').FramingAnalysis,
  narratives: import('../../misbar/types.js').NarrativeAnalysis,
  sourcesReached: number
): void {
  const divider = '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
  const thin = '──────────────────────────────────────────────────────────────'

  console.log(`\n${divider}`)
  console.log(`  MISBAR INTELLIGENCE REPORT`)
  console.log(`  Topic: ${topic} | Mode: ${mode} | ${timeRange} | ${sourcesReached} sources`)
  console.log(divider)

  console.log(`\n EXECUTIVE SUMMARY\n${thin}`)
  console.log(synthesis.executive_summary)
  console.log(`\nConfidence: ${synthesis.confidence_level}%`)

  console.log(`\n COVERAGE GAP  [score: ${coverage.gap_score}/100]\n${thin}`)
  if (coverage.exclusive_arabic_angles.length) {
    console.log(`Arabic-only angles:`)
    coverage.exclusive_arabic_angles.forEach(a => console.log(`  • ${a}`))
  }
  if (coverage.exclusive_western_angles.length) {
    console.log(`Western-only angles:`)
    coverage.exclusive_western_angles.forEach(a => console.log(`  • ${a}`))
  }

  console.log(`\n FRAMING  [divergence: ${framing.overall_divergence}]\n${thin}`)
  console.log(framing.key_finding)
  if (framing.terminology_divergences.length) {
    console.log(`\nTerminology divergences:`)
    framing.terminology_divergences.slice(0, 3).forEach(t => {
      console.log(`  "${t.concept}": Arabic=[${t.arabic_terms.join(', ')}] Western=[${t.western_terms.join(', ')}]`)
    })
  }

  console.log(`\n NARRATIVES\n${thin}`)
  narratives.dominant_narratives.slice(0, 3).forEach((n, i) => {
    console.log(`[${i + 1}] ${n.title} (strength: ${n.strength}) — ${n.dominant_in.join(', ')}`)
    console.log(`    ${n.description}`)
  })

  console.log(`\n KEY INSIGHTS\n${thin}`)
  synthesis.key_insights.forEach((insight, i) => {
    const icon = { critical: '🔴', high: '🟠', medium: '🟡', low: '🟢' }[insight.priority] ?? '⚪'
    console.log(`${icon} [${insight.priority.toUpperCase()}] ${insight.title}`)
    console.log(`   ${insight.description}`)
    if (insight.recommended_action) console.log(`   → ${insight.recommended_action}`)
    if (i < synthesis.key_insights.length - 1) console.log()
  })

  console.log(`\n SCENARIOS\n${thin}`)
  synthesis.scenarios.forEach(s => {
    console.log(`${s.probability.toUpperCase()}: ${s.title}`)
    console.log(`  ${s.description}`)
    console.log(`  Response: ${s.recommended_response}`)
    console.log()
  })

  console.log(divider)
  console.log(`Report ID: ${reportId}`)
  console.log(divider)
}

// ─── Run ─────────────────────────────────────────────────────────────────────

program.parse(process.argv)
