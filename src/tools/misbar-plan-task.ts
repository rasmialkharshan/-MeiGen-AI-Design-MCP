/**
 * Tool: misbar_plan_task
 * Orchestration Engine — Task Planner + Step Sequencer
 */

import { z } from 'zod'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { buildOrchestrationPlan, AGENT_DEFINITIONS } from '../misbar/agents/agent-definitions.js'
import type { TaskObject, MisbarMode, TimeRange, DepthLevel } from '../misbar/types.js'

const TaskObjectSchema = z.object({
  topic: z.string().describe('Research topic'),
  time_range: z.enum(['24h', '7d', '30d', '90d', 'custom']).describe('Time window'),
  mode: z.enum(['A', 'B', 'C', 'D', 'E', 'F']).describe('Analysis mode'),
  priority_sources: z.array(z.string()).describe('Preferred sources'),
  depth_level: z.enum(['surface', 'moderate', 'deep']).describe('Analysis depth'),
  geographic_scope: z.array(z.string()).optional().describe('Geographic focus'),
  entity_focus: z.string().optional().describe('Specific entity for reputation analysis'),
})

const schema = {
  task: TaskObjectSchema.describe('Task object from misbar_parse_query'),
}

function buildSearchGuidance(
  topic: string,
  mode: MisbarMode,
  time_range: TimeRange,
): string {
  const timeMap: Record<TimeRange, string> = {
    '24h': 'past 24 hours',
    '7d': 'past 7 days',
    '30d': 'past 30 days',
    '90d': 'past 90 days',
    'custom': 'custom range',
  }
  const period = timeMap[time_range]

  return [
    `Search Strategy for "${topic}" (${period}):`,
    '',
    '## Arabic Media Search Queries',
    `1. "${topic}" site:aljazeera.net OR site:alarabiya.net OR site:bbc.com/arabic`,
    `2. "${topic}" تحليل إعلامي`,
    `3. "${topic}" وجهات نظر`,
    '',
    '## Western Media Search Queries',
    `1. "${topic}" media coverage analysis`,
    `2. "${topic}" framing perspective`,
    `3. site:reuters.com OR site:bbc.com OR site:nytimes.com "${topic}"`,
    '',
    '## Think Tank / Research Search Queries',
    `1. "${topic}" policy brief OR research report`,
    `2. "${topic}" site:brookings.edu OR site:rand.org OR site:carnegieendowment.org`,
    '',
    '## Data Collection Instructions',
    'For each article found, collect: title, source, URL, publication date, full body text.',
    'Aim for at least 5 Arabic and 5 Western articles for meaningful comparison.',
    mode === 'C' ? 'CRISIS MODE: Prioritize most recent articles first.' : '',
    mode === 'D' ? 'REPUTATION MODE: Focus on articles that mention the target entity by name.' : '',
  ].filter(s => s !== undefined).join('\n')
}

export function registerMisbarPlanTask(server: McpServer) {
  server.tool(
    'misbar_plan_task',
    [
      'Generate a detailed research and execution plan for a Misbar analysis task.',
      'Returns the multi-agent orchestration plan, parallel execution groups,',
      'and specific search queries for Arabic media, Western media, and think tanks.',
      'Call this after misbar_parse_query and before data collection.',
    ].join(' '),
    schema,
    { readOnlyHint: true },
    async ({ task }) => {
      const plan = buildOrchestrationPlan(task as TaskObject)

      const agentDescriptions = plan.parallel_groups.map((group, i) => ({
        phase: i + 1,
        agents: group.map(role => ({
          role,
          name: AGENT_DEFINITIONS[role].name,
          arabic_name: AGENT_DEFINITIONS[role].arabic_name,
          description: AGENT_DEFINITIONS[role].description,
          responsibilities: AGENT_DEFINITIONS[role].responsibilities,
        })),
        can_run_in_parallel: group.length > 1,
      }))

      const searchGuidance = buildSearchGuidance(task.topic, task.mode as MisbarMode, task.time_range as TimeRange)

      return {
        content: [{
          type: 'text' as const,
          text: [
            '# Misbar Orchestration Plan',
            '',
            `**Task ID:** ${plan.task_id}`,
            `**Topic:** ${plan.topic}`,
            `**Mode:** ${plan.mode}`,
            `**Estimated Sources:** ${plan.estimated_sources}`,
            '',
            '## Execution Phases',
            JSON.stringify(agentDescriptions, null, 2),
            '',
            '## Search Queries',
            JSON.stringify(plan.search_queries, null, 2),
            '',
            '## Search Guidance',
            searchGuidance,
            '',
            '## Next Steps',
            '1. Use the search queries above to collect articles from Arabic and Western sources.',
            '2. Pass collected articles to misbar_analyze_coverage to detect coverage gaps.',
            '3. Pass the same articles to misbar_analyze_framing for framing comparison.',
            '4. Then call misbar_analyze_narratives for narrative mapping.',
            '5. Finally, call misbar_synthesize_insights and misbar_generate_report.',
          ].join('\n'),
        }],
      }
    }
  )
}
