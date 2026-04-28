import type { AgentRole, AgentTask, OrchestrationPlan, TaskObject, MisbarMode } from '../types.js'
import { randomUUID } from 'crypto'

/**
 * Agent system definitions for Misbar Intelligence System v3.0
 *
 * Each agent has a role, prompt template, and expected I/O contract.
 * The orchestrator sequences these agents into a parallel execution plan.
 */

export interface AgentDefinition {
  role: AgentRole
  name: string
  arabic_name: string
  description: string
  responsibilities: string[]
  input_type: string
  output_type: string
  can_run_parallel_with: AgentRole[]
}

export const AGENT_DEFINITIONS: Record<AgentRole, AgentDefinition> = {
  scout: {
    role: 'scout',
    name: 'Scout Agent',
    arabic_name: 'وكيل الاستطلاع',
    description: 'Discovers and collects raw articles from Arabic and Western media sources',
    responsibilities: [
      'Search Arabic media sources for the topic',
      'Search Western media sources for the topic',
      'Collect Think Tank publications',
      'Apply deduplication filter',
      'Return RawArticles[]',
    ],
    input_type: 'TaskObject',
    output_type: 'RawArticle[]',
    can_run_parallel_with: [],
  },
  verifier: {
    role: 'verifier',
    name: 'Verifier Agent',
    arabic_name: 'وكيل التحقق',
    description: 'Validates source credibility and filters low-quality content',
    responsibilities: [
      'Check source reliability scores from memory',
      'Flag satire, opinion, and unverified claims',
      'Cross-reference entity mentions across sources',
      'Assign credibility scores to articles',
    ],
    input_type: 'RawArticle[]',
    output_type: 'RawArticle[] (verified)',
    can_run_parallel_with: ['classifier'],
  },
  classifier: {
    role: 'classifier',
    name: 'Classifier Agent',
    arabic_name: 'وكيل التصنيف',
    description: 'Detects language, extracts entities, clusters topics, normalizes content',
    responsibilities: [
      'Detect article language',
      'Translate non-English/Arabic articles if needed',
      'Extract named entities (persons, orgs, countries)',
      'Cluster articles by topic',
      'Filter noise and low-signal content',
    ],
    input_type: 'RawArticle[]',
    output_type: 'NormalizedArticle[]',
    can_run_parallel_with: ['verifier'],
  },
  framing_analyst: {
    role: 'framing_analyst',
    name: 'Framing Analyst',
    arabic_name: 'محلل التأطير',
    description: 'Compares how Arabic and Western media frame the same events through language and angle selection',
    responsibilities: [
      'Extract key terms and terminology per camp',
      'Detect semantic divergence in concept labeling',
      'Map framing dimensions (victim/perpetrator, cause, urgency)',
      'Assess narrative tone per camp',
      'Produce FramingAnalysis object',
    ],
    input_type: 'NormalizedArticle[] (split by camp)',
    output_type: 'FramingAnalysis',
    can_run_parallel_with: ['gap_analyst', 'narrative_analyst'],
  },
  gap_analyst: {
    role: 'gap_analyst',
    name: 'Gap Analyst',
    arabic_name: 'محلل الفجوات',
    description: 'Detects coverage asymmetries between Arabic and Western media camps',
    responsibilities: [
      'Compute coverage density per camp',
      'Identify angles exclusive to each camp',
      'Calculate gap score',
      'Surface underreported dimensions',
      'Produce CoverageGapMatrix',
    ],
    input_type: 'NormalizedArticle[] (split by camp)',
    output_type: 'CoverageGapMatrix',
    can_run_parallel_with: ['framing_analyst', 'narrative_analyst'],
  },
  narrative_analyst: {
    role: 'narrative_analyst',
    name: 'Narrative Analyst',
    arabic_name: 'محلل السرديات',
    description: 'Maps dominant and competing narratives across media ecosystems',
    responsibilities: [
      'Cluster articles by narrative theme',
      'Identify dominant vs competing narratives',
      'Detect narrative turning points',
      'Track contested claims',
      'Produce NarrativeAnalysis',
    ],
    input_type: 'NormalizedArticle[]',
    output_type: 'NarrativeAnalysis',
    can_run_parallel_with: ['framing_analyst', 'gap_analyst'],
  },
  strategist: {
    role: 'strategist',
    name: 'Strategist Agent',
    arabic_name: 'وكيل الاستراتيجية',
    description: 'Synthesizes intelligence into actionable insights, strategic implications, and media scenarios',
    responsibilities: [
      'Generate key insights from gap + framing + narrative analysis',
      'Identify strategic implications per domain (editorial, reputation, policy)',
      'Build media scenarios with probability estimates',
      'Produce executive summary',
      'Produce InsightSynthesis',
    ],
    input_type: 'CoverageGapMatrix + FramingAnalysis + NarrativeAnalysis + TrendAnalysis?',
    output_type: 'InsightSynthesis',
    can_run_parallel_with: [],
  },
  editor: {
    role: 'editor',
    name: 'Editor Agent',
    arabic_name: 'وكيل التحرير',
    description: 'Formats the final intelligence report in the requested output format',
    responsibilities: [
      'Select appropriate report template',
      'Structure sections based on mode',
      'Write narrative connective tissue',
      'Format for readability',
      'Produce MisbarReport',
    ],
    input_type: 'InsightSynthesis + TaskObject',
    output_type: 'MisbarReport',
    can_run_parallel_with: [],
  },
}

/** Return the ordered parallel groups for a given mode */
function getPipelineGroups(mode: MisbarMode): AgentRole[][] {
  const base: AgentRole[][] = [
    ['scout'],
    ['verifier', 'classifier'],
    ['framing_analyst', 'gap_analyst', 'narrative_analyst'],
    ['strategist'],
    ['editor'],
  ]

  if (mode === 'A') {
    // Daily Pulse: skip verifier, lighter analysis
    return [['scout'], ['classifier'], ['gap_analyst'], ['editor']]
  }
  if (mode === 'C') {
    // Crisis Mode: skip deep narrative, prioritize gap + reputation
    return [['scout'], ['classifier'], ['gap_analyst', 'framing_analyst'], ['strategist'], ['editor']]
  }
  if (mode === 'D') {
    // Reputation Watch: focus on reputation signals
    return [['scout'], ['classifier'], ['narrative_analyst', 'framing_analyst'], ['strategist'], ['editor']]
  }
  if (mode === 'E') {
    // Trend Tracker: focus on temporal patterns
    return [['scout'], ['classifier'], ['narrative_analyst', 'gap_analyst'], ['strategist'], ['editor']]
  }
  return base
}

export function buildOrchestrationPlan(task: TaskObject): OrchestrationPlan {
  const groups = getPipelineGroups(task.mode)

  const steps: AgentTask[] = groups.flat().map(role => ({
    agent: role,
    input: role === 'scout' ? task : null,
    status: 'pending',
  }))

  // Build Arabic search queries (topic + related terms in Arabic)
  const arabicQueries = [
    task.topic,
    `${task.topic} تحليل`,
    `${task.topic} أخبار`,
    task.entity_focus ? `${task.entity_focus} ${task.topic}` : null,
  ].filter(Boolean) as string[]

  // Build Western search queries
  const westernQueries = [
    task.topic,
    `${task.topic} analysis`,
    `${task.topic} coverage`,
    task.entity_focus ? `${task.entity_focus} ${task.topic}` : null,
  ].filter(Boolean) as string[]

  const thinkTankQueries = [
    `${task.topic} report`,
    `${task.topic} policy brief`,
  ]

  return {
    task_id: randomUUID(),
    topic: task.topic,
    mode: task.mode,
    steps,
    search_queries: {
      arabic: arabicQueries,
      western: westernQueries,
      think_tank: thinkTankQueries,
    },
    estimated_sources: task.depth_level === 'deep' ? 50 : task.depth_level === 'moderate' ? 25 : 10,
    parallel_groups: groups,
  }
}

/** Get the agent definition + system prompt for a given role */
export function getAgentSystemPrompt(role: AgentRole): string {
  const def = AGENT_DEFINITIONS[role]
  const responsibilities = def.responsibilities.map(r => `- ${r}`).join('\n')

  return `You are the ${def.name} (${def.arabic_name}) in the Misbar Intelligence System v3.0.

## Your Role
${def.description}

## Your Responsibilities
${responsibilities}

## Input
${def.input_type}

## Output
${def.output_type}

Perform your role precisely. Be analytical, structured, and objective. Flag uncertainty when present.`
}
