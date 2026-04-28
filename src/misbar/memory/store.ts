import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs'
import { join } from 'path'
import { homedir } from 'os'
import { randomUUID } from 'crypto'
import type {
  MemoryStore,
  HistoricalEntry,
  SourceProfile,
  NarrativeEvolution,
  MisbarMode,
} from '../types.js'

const STORE_DIR = join(homedir(), '.config', 'misbar')
const STORE_PATH = join(STORE_DIR, 'memory.json')

const DEFAULT_STORE: MemoryStore = {
  version: '3.0',
  last_updated: new Date().toISOString(),
  historical_entries: [],
  source_profiles: {},
  narrative_evolutions: {},
  feedback: [],
}

// Known source profiles seeded with real-world knowledge
const SEED_SOURCE_PROFILES: Record<string, Omit<SourceProfile, 'last_analyzed'>> = {
  'Al Jazeera': {
    source_name: 'Al Jazeera',
    camp: 'arabic',
    language: 'ar',
    known_bias: 'independent',
    reliability_score: 78,
    topic_specializations: ['Middle East', 'Palestine', 'Qatar', 'Arab Spring'],
    historical_framing_tendencies: ['humanitarian angle', 'Palestinian cause emphasis', 'Gulf state sympathetic'],
  },
  'BBC Arabic': {
    source_name: 'BBC Arabic',
    camp: 'arabic',
    language: 'ar',
    known_bias: 'center',
    reliability_score: 85,
    topic_specializations: ['Middle East', 'international affairs', 'UK foreign policy'],
    historical_framing_tendencies: ['balanced reporting', 'Western institutional framing'],
  },
  'Al Arabiya': {
    source_name: 'Al Arabiya',
    camp: 'arabic',
    language: 'ar',
    known_bias: 'state',
    reliability_score: 68,
    topic_specializations: ['Saudi Arabia', 'Gulf region', 'Iran relations'],
    historical_framing_tendencies: ['pro-Saudi framing', 'anti-Iran narrative'],
  },
  'Reuters': {
    source_name: 'Reuters',
    camp: 'western',
    language: 'en',
    known_bias: 'center',
    reliability_score: 92,
    topic_specializations: ['global finance', 'geopolitics', 'breaking news'],
    historical_framing_tendencies: ['neutral factual', 'market-focused'],
  },
  'BBC': {
    source_name: 'BBC',
    camp: 'western',
    language: 'en',
    known_bias: 'center',
    reliability_score: 88,
    topic_specializations: ['UK politics', 'international affairs', 'science'],
    historical_framing_tendencies: ['institutional framing', 'Western perspective'],
  },
  'The New York Times': {
    source_name: 'The New York Times',
    camp: 'western',
    language: 'en',
    known_bias: 'left',
    reliability_score: 86,
    topic_specializations: ['US politics', 'international affairs', 'culture'],
    historical_framing_tendencies: ['liberal editorial angle', 'US-centric framing'],
  },
  'The Guardian': {
    source_name: 'The Guardian',
    camp: 'western',
    language: 'en',
    known_bias: 'left',
    reliability_score: 84,
    topic_specializations: ['climate change', 'human rights', 'UK politics'],
    historical_framing_tendencies: ['progressive framing', 'human rights emphasis'],
  },
  'Fox News': {
    source_name: 'Fox News',
    camp: 'western',
    language: 'en',
    known_bias: 'right',
    reliability_score: 62,
    topic_specializations: ['US politics', 'conservative commentary'],
    historical_framing_tendencies: ['conservative framing', 'anti-establishment narrative'],
  },
}

export function loadStore(): MemoryStore {
  try {
    if (!existsSync(STORE_PATH)) return initializeStore()
    const raw = readFileSync(STORE_PATH, 'utf-8')
    return JSON.parse(raw) as MemoryStore
  } catch {
    return initializeStore()
  }
}

function initializeStore(): MemoryStore {
  const now = new Date().toISOString()
  const profiles: Record<string, SourceProfile> = {}
  for (const [key, profile] of Object.entries(SEED_SOURCE_PROFILES)) {
    profiles[key] = { ...profile, last_analyzed: now }
  }
  const store: MemoryStore = { ...DEFAULT_STORE, source_profiles: profiles, last_updated: now }
  saveStore(store)
  return store
}

export function saveStore(store: MemoryStore): void {
  try {
    if (!existsSync(STORE_DIR)) mkdirSync(STORE_DIR, { recursive: true })
    store.last_updated = new Date().toISOString()
    writeFileSync(STORE_PATH, JSON.stringify(store, null, 2), 'utf-8')
  } catch {
    // Graceful degradation — memory is not critical to tool operation
  }
}

export function addHistoricalEntry(
  store: MemoryStore,
  entry: Omit<HistoricalEntry, 'entry_id'>,
): HistoricalEntry {
  const full: HistoricalEntry = { entry_id: randomUUID(), ...entry }
  store.historical_entries.push(full)
  // Keep last 500 entries
  if (store.historical_entries.length > 500) {
    store.historical_entries = store.historical_entries.slice(-500)
  }
  return full
}

export function getTopicHistory(
  store: MemoryStore,
  topic: string,
  limit = 10,
): HistoricalEntry[] {
  const lc = topic.toLowerCase()
  return store.historical_entries
    .filter(e => e.topic.toLowerCase().includes(lc))
    .slice(-limit)
}

export function upsertSourceProfile(
  store: MemoryStore,
  profile: SourceProfile,
): void {
  store.source_profiles[profile.source_name] = {
    ...profile,
    last_analyzed: new Date().toISOString(),
  }
}

export function getSourceProfile(
  store: MemoryStore,
  sourceName: string,
): SourceProfile | null {
  return store.source_profiles[sourceName] ?? null
}

export function updateNarrativeEvolution(
  store: MemoryStore,
  topic: string,
  snapshot: string,
  shiftDetected: boolean,
): void {
  if (!store.narrative_evolutions[topic]) {
    store.narrative_evolutions[topic] = { topic, timeline: [] }
  }
  store.narrative_evolutions[topic].timeline.push({
    date: new Date().toISOString().substring(0, 10),
    narrative_snapshot: snapshot,
    shift_detected: shiftDetected,
  })
  // Keep last 100 snapshots per topic
  const ev = store.narrative_evolutions[topic]
  if (ev.timeline.length > 100) ev.timeline = ev.timeline.slice(-100)
}

export function getNarrativeEvolution(
  store: MemoryStore,
  topic: string,
): NarrativeEvolution | null {
  return store.narrative_evolutions[topic] ?? null
}

export function addFeedback(
  store: MemoryStore,
  analysisId: string,
  rating: number,
  notes: string,
): void {
  store.feedback.push({
    analysis_id: analysisId,
    rating,
    notes,
    date: new Date().toISOString(),
  })
  if (store.feedback.length > 200) store.feedback = store.feedback.slice(-200)
}
