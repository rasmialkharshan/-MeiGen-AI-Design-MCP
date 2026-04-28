/**
 * Memory / history table — 21st.dev table style
 */
import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Badge } from './ui/badge'
import type { MemoryEntry } from '@/lib/api'
import { formatDate, divergenceColor } from '@/lib/utils'

interface Props { entries: MemoryEntry[]; topic: string }

export function MemoryTable({ entries, topic }: Props) {
  const [expanded, setExpanded] = useState<string | null>(null)

  if (entries.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground text-sm">
          No historical analyses for "{topic}" yet. Run an analysis to start tracking.
        </CardContent>
      </Card>
    )
  }

  const avgGap = Math.round(entries.reduce((s, e) => s + e.gap_score, 0) / entries.length)

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2"><span>🗂️</span> Historical Memory</CardTitle>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>{entries.length} entries</span>
            <span>·</span>
            <span>avg gap: <strong>{avgGap}/100</strong></span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="rounded-b-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Date</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Mode</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Gap Score</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Framing</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Narratives</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <>
                  <tr
                    key={entry.entry_id}
                    className="border-b last:border-0 hover:bg-muted/20 transition-colors cursor-pointer"
                    onClick={() => setExpanded(expanded === entry.entry_id ? null : entry.entry_id)}
                  >
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{formatDate(entry.date)}</td>
                    <td className="px-4 py-3">
                      <Badge variant="secondary" className="font-mono">Mode {entry.mode}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`font-mono font-bold ${entry.gap_score >= 70 ? 'text-red-400' : entry.gap_score >= 45 ? 'text-amber-400' : 'text-emerald-400'}`}>
                        {entry.gap_score}
                      </span>
                      <span className="text-muted-foreground text-xs">/100</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`capitalize text-xs font-medium ${divergenceColor(entry.framing_divergence)}`}>{entry.framing_divergence}</span>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground truncate max-w-[200px]">
                      {entry.dominant_narratives.slice(0, 2).join(' · ')}
                    </td>
                  </tr>
                  {expanded === entry.entry_id && (
                    <tr key={`${entry.entry_id}-exp`} className="border-b bg-muted/10">
                      <td colSpan={5} className="px-4 py-3">
                        <div className="space-y-2">
                          {entry.dominant_narratives.map((n, i) => (
                            <div key={i} className="flex items-start gap-2 text-xs">
                              <span className="text-muted-foreground mt-0.5">{i + 1}.</span>
                              <span>{n}</span>
                            </div>
                          ))}
                          {entry.report_id && (
                            <p className="text-xs font-mono text-muted-foreground pt-1">Report: {entry.report_id}</p>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}
