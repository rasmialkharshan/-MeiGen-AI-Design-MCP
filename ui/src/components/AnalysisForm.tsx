/**
 * Analysis form — 21st.dev-style input with mode selector and live status
 */
import { useState } from 'react'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import type { AnalyzeRequest } from '@/lib/api'

interface Props {
  onSubmit: (req: AnalyzeRequest) => void
  loading: boolean
  status: string
}

const MODES = [
  { id: 'A', label: 'Daily Pulse', icon: '⚡', desc: 'Quick scan' },
  { id: 'B', label: 'Deep Analysis', icon: '🔬', desc: 'Full pipeline' },
  { id: 'C', label: 'Crisis Mode', icon: '🚨', desc: 'Rapid response' },
  { id: 'D', label: 'Reputation', icon: '📊', desc: 'Entity focus' },
  { id: 'E', label: 'Trend Tracker', icon: '📈', desc: 'Temporal' },
  { id: 'F', label: 'Comparative', icon: '⚖️', desc: 'AR vs EN' },
] as const

const TIME_RANGES = ['24h', '7d', '30d', '90d'] as const

export function AnalysisForm({ onSubmit, loading, status }: Props) {
  const [topic, setTopic] = useState('')
  const [mode, setMode] = useState<'A'|'B'|'C'|'D'|'E'|'F'>('B')
  const [timeRange, setTimeRange] = useState<'24h'|'7d'|'30d'|'90d'>('7d')
  const [entity, setEntity] = useState('')
  const [includeTT, setIncludeTT] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!topic.trim() || loading) return
    onSubmit({ topic: topic.trim(), mode, time_range: timeRange, entity: entity || undefined, include_think_tanks: includeTT })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Topic input */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium">Research Topic</label>
        <div className="relative">
          <input
            value={topic}
            onChange={e => setTopic(e.target.value)}
            placeholder='e.g. "Gaza ceasefire", "Saudi Vision 2030", "AI regulation"'
            disabled={loading}
            className="w-full rounded-lg border bg-background px-4 py-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
          />
          {topic && (
            <button type="button" onClick={() => setTopic('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs">✕</button>
          )}
        </div>
      </div>

      {/* Mode selector */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium">Analysis Mode</label>
        <div className="grid grid-cols-3 gap-2">
          {MODES.map(m => (
            <button
              key={m.id}
              type="button"
              onClick={() => setMode(m.id)}
              disabled={loading}
              className={`rounded-lg border p-3 text-left transition-all hover:bg-accent disabled:opacity-50 ${mode === m.id ? 'border-primary bg-primary/10' : 'border-border'}`}
            >
              <div className="flex items-center gap-1.5 mb-1">
                <span>{m.icon}</span>
                <span className="text-xs font-semibold">{m.id}</span>
                {mode === m.id && <Badge variant="default" className="text-xs ml-auto py-0 h-4">Active</Badge>}
              </div>
              <div className="text-xs font-medium">{m.label}</div>
              <div className="text-xs text-muted-foreground">{m.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Entity (Mode D only) */}
      {mode === 'D' && (
        <div className="space-y-1.5 animate-fade-in">
          <label className="text-sm font-medium">Entity to Track</label>
          <input
            value={entity}
            onChange={e => setEntity(e.target.value)}
            placeholder='e.g. "UNRWA", "Saudi Arabia", "Elon Musk"'
            disabled={loading}
            className="w-full rounded-lg border bg-background px-4 py-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
          />
        </div>
      )}

      {/* Time range + think tanks */}
      <div className="flex items-center gap-4">
        <div className="space-y-1.5 flex-1">
          <label className="text-sm font-medium">Time Window</label>
          <div className="flex gap-1.5">
            {TIME_RANGES.map(r => (
              <button key={r} type="button" onClick={() => setTimeRange(r)} disabled={loading}
                className={`px-3 py-1.5 rounded-md text-sm border transition-all disabled:opacity-50 ${timeRange === r ? 'border-primary bg-primary/10 text-primary font-medium' : 'border-border hover:bg-accent'}`}>
                {r}
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Think Tanks</label>
          <button type="button" onClick={() => setIncludeTT(!includeTT)} disabled={loading}
            className={`px-3 py-1.5 rounded-md text-sm border transition-all disabled:opacity-50 flex items-center gap-1.5 ${includeTT ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:bg-accent'}`}>
            <span>{includeTT ? '✓' : '+'}</span> Include
          </button>
        </div>
      </div>

      {/* Submit */}
      <Button type="submit" disabled={!topic.trim() || loading} className="w-full h-12 text-base">
        {loading ? (
          <span className="flex items-center gap-2">
            <span className="h-4 w-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
            {status || 'Analyzing…'}
          </span>
        ) : (
          <span className="flex items-center gap-2">
            <span>🔍</span> Run Intelligence Analysis
          </span>
        )}
      </Button>
    </form>
  )
}
