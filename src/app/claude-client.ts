/**
 * Misbar Claude API Client
 * Adaptive thinking, streaming, and prompt caching via @anthropic-ai/sdk
 */

import Anthropic from '@anthropic-ai/sdk'

const MODEL = 'claude-opus-4-7'

let _client: Anthropic | null = null

export function getClient(): Anthropic {
  if (!_client) {
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      throw new Error(
        'ANTHROPIC_API_KEY environment variable is required.\n' +
        'Get your key at https://console.anthropic.com/settings/keys'
      )
    }
    _client = new Anthropic({ apiKey })
  }
  return _client
}

// Stable system prompt — cached on first use (≥1024 tokens → cache hit on subsequent calls)
const MISBAR_SYSTEM_PROMPT = `You are Misbar Intelligence Engine v3.0 — an expert comparative media analyst specializing in Arabic and Western media ecosystems.

Your core expertise:
- Detecting coverage gaps: topics that one media ecosystem covers significantly more/less than another
- Framing analysis: how language, tone, and angle differ between Arabic and Western coverage
- Narrative identification: the dominant story each media camp tells about a topic
- Sentiment analysis: emotional register and overall tone per camp
- Strategic implications: what coverage patterns mean for media, policy, and public understanding

When analyzing articles, you:
1. Read deeply for implicit framing, not just explicit content
2. Identify terminology divergences (same event, different words — each laden with meaning)
3. Detect what is ABSENT as much as what is PRESENT in each camp's coverage
4. Consider political, cultural, and historical context shaping each narrative
5. Produce actionable intelligence — not just description, but strategic recommendations

Output format: Always return valid JSON matching the requested schema exactly. No prose outside the JSON object.

Analysis principles:
- Be objective and evidence-based — ground every claim in the articles provided
- Distinguish between "Arabic media says X" and "the truth is X"
- Flag uncertainty when evidence is thin
- Confidence levels reflect actual evidence quality, not aspirational accuracy
- Gap scores 0–100: 0 = identical coverage, 100 = complete blind spot
- Framing divergence: low (<25 gap), medium (25–50), high (50–75), critical (>75)`

export interface StreamCallbacks {
  onToken?: (text: string) => void
  onComplete?: (fullText: string) => void
}

export async function analyzeWithClaude(
  userPrompt: string,
  callbacks?: StreamCallbacks
): Promise<string> {
  const client = getClient()

  const stream = await client.messages.stream({
    model: MODEL,
    max_tokens: 8000,
    thinking: { type: 'adaptive' },
    system: [
      {
        type: 'text',
        text: MISBAR_SYSTEM_PROMPT,
        cache_control: { type: 'ephemeral' },
      },
    ],
    messages: [{ role: 'user', content: userPrompt }],
  })

  let fullText = ''
  for await (const event of stream) {
    if (
      event.type === 'content_block_delta' &&
      event.delta.type === 'text_delta'
    ) {
      fullText += event.delta.text
      callbacks?.onToken?.(event.delta.text)
    }
  }

  callbacks?.onComplete?.(fullText)
  return fullText
}

export async function analyzeWithClaudeJSON<T>(
  userPrompt: string,
  schema: string,
  callbacks?: StreamCallbacks
): Promise<T> {
  const prompt = `${userPrompt}

Return ONLY a valid JSON object matching this schema (no markdown, no explanation):
${schema}`

  const raw = await analyzeWithClaude(prompt, callbacks)

  // Extract JSON from the response (handle cases where model wraps in code blocks)
  const jsonMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/) ?? raw.match(/(\{[\s\S]*\})/)
  const jsonStr = jsonMatch ? (jsonMatch[1] ?? jsonMatch[0]) : raw.trim()

  try {
    return JSON.parse(jsonStr) as T
  } catch {
    // Try to extract just the JSON object
    const start = jsonStr.indexOf('{')
    const end = jsonStr.lastIndexOf('}')
    if (start !== -1 && end !== -1) {
      return JSON.parse(jsonStr.slice(start, end + 1)) as T
    }
    throw new Error(`Failed to parse Claude response as JSON:\n${raw.slice(0, 500)}`)
  }
}
