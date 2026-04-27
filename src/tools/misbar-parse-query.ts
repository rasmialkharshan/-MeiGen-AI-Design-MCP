/**
 * Tool: misbar_parse_query
 * Input Layer — Query Parser + Intent Classifier + Mode Selector + Scope Builder
 */

import { z } from 'zod'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { TaskObject, MisbarMode, TimeRange, DepthLevel } from '../misbar/types.js'

const schema = {
  query: z.string().min(1).describe(
    'The user\'s natural-language research query (Arabic or English). e.g. "كيف تغطي وسائل الإعلام العربية والغربية أزمة غزة؟"'
  ),
  language: z.enum(['ar', 'en']).optional().default('ar').describe(
    'Language of the query. Determines primary search orientation.'
  ),
}

function classifyMode(query: string): MisbarMode {
  const lc = query.toLowerCase()
  if (lc.includes('crisis') || lc.includes('أزمة') || lc.includes('عاجل') || lc.includes('urgent')) return 'C'
  if (lc.includes('reputation') || lc.includes('سمعة') || lc.includes('image') || lc.includes('صورة')) return 'D'
  if (lc.includes('trend') || lc.includes('اتجاه') || lc.includes('over time') || lc.includes('مرور الوقت')) return 'E'
  if (lc.includes('daily') || lc.includes('يومي') || lc.includes('pulse') || lc.includes('quick')) return 'A'
  if (lc.includes('framing') || lc.includes('تأطير') || lc.includes('compare') || lc.includes('مقارنة')) return 'F'
  return 'B' // Deep Analysis by default
}

function inferTimeRange(query: string): TimeRange {
  const lc = query.toLowerCase()
  if (lc.includes('24h') || lc.includes('today') || lc.includes('اليوم') || lc.includes('الآن')) return '24h'
  if (lc.includes('week') || lc.includes('7 day') || lc.includes('أسبوع') || lc.includes('7 أيام')) return '7d'
  if (lc.includes('month') || lc.includes('30 day') || lc.includes('شهر')) return '30d'
  if (lc.includes('quarter') || lc.includes('90 day') || lc.includes('ربع سنة')) return '90d'
  return '7d'
}

function inferDepth(mode: MisbarMode): DepthLevel {
  if (mode === 'A' || mode === 'C') return 'surface'
  if (mode === 'F' || mode === 'D') return 'deep'
  return 'moderate'
}

function extractTopic(query: string): string {
  // Simple heuristic: remove common question words and keep the noun phrase
  return query
    .replace(/how does|how do|كيف تغطي|كيف يتناول|what is|ما هو|ما هي|أخبر|tell me about/gi, '')
    .replace(/media cover|وسائل الإعلام|arabic and western|العربية والغربية/gi, '')
    .replace(/\?|؟/g, '')
    .trim()
    .slice(0, 120)
}

function inferPrioritySources(mode: MisbarMode, language: string): string[] {
  const arabic = ['Al Jazeera', 'BBC Arabic', 'Al Arabiya', 'Asharq Al-Awsat', 'Al-Monitor']
  const western = ['Reuters', 'BBC', 'The New York Times', 'The Guardian', 'AP News']
  const thinkTanks = ['Brookings', 'RAND', 'CSIS', 'Carnegie Endowment', 'Wilson Center']

  if (mode === 'D') return [...arabic, ...western]
  if (mode === 'F') return [...arabic, ...western]
  if (language === 'ar') return [...arabic, ...western.slice(0, 2)]
  return [...western, ...arabic.slice(0, 2)]
}

export function registerMisbarParseQuery(server: McpServer) {
  server.tool(
    'misbar_parse_query',
    [
      'Parse a research query into a structured Misbar Task Object.',
      'Classifies intent (mode A–F), extracts topic, infers time range and depth level.',
      'This is the FIRST step in every Misbar analysis pipeline.',
      'Modes: A=Daily Pulse, B=Deep Analysis, C=Crisis, D=Reputation Watch, E=Trend Tracker, F=Comparative Framing.',
    ].join(' '),
    schema,
    { readOnlyHint: true },
    async ({ query, language }) => {
      const mode = classifyMode(query)
      const time_range = inferTimeRange(query)
      const depth_level = inferDepth(mode)
      const topic = extractTopic(query)
      const priority_sources = inferPrioritySources(mode, language ?? 'ar')

      const task: TaskObject = {
        topic,
        time_range,
        mode,
        priority_sources,
        depth_level,
      }

      const modeDescriptions: Record<MisbarMode, string> = {
        A: 'Daily Pulse — quick surface scan across key sources',
        B: 'Deep Analysis — full pipeline with all intelligence engines',
        C: 'Crisis Mode — rapid gap and framing assessment',
        D: 'Reputation Watch — entity-focused sentiment tracking',
        E: 'Trend Tracker — temporal pattern analysis (7d/30d/90d)',
        F: 'Comparative Framing — direct Arabic vs Western framing comparison',
      }

      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({
            task,
            mode_description: modeDescriptions[mode],
            next_step: 'Call misbar_plan_task with this task object to generate your research plan and search queries.',
          }, null, 2),
        }],
      }
    }
  )
}
