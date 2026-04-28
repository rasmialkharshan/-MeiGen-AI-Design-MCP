/**
 * Decision engine alerts — animated pulse for critical alerts
 */
interface Alert {
  type: string
  severity: string
  message: string
  recommended_action: string
}

interface Props { alerts: Alert[] }

const TYPE_ICON: Record<string, string> = {
  coverage_gap: '📊', framing_divergence: '🎭', reputation_spike: '📉', crisis_mode: '🚨', narrative_shift: '🔄',
}

export function AlertsBanner({ alerts }: Props) {
  if (alerts.length === 0) return null

  return (
    <div className="space-y-2 animate-fade-in">
      {alerts.map((alert, i) => (
        <div
          key={i}
          className={`rounded-lg border p-4 flex gap-3 items-start ${
            alert.severity === 'critical'
              ? 'border-red-500/50 bg-red-500/10 animate-pulse-glow'
              : 'border-amber-500/50 bg-amber-500/10'
          }`}
        >
          <span className="text-xl flex-shrink-0">{TYPE_ICON[alert.type] ?? '⚠️'}</span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className={`text-sm font-bold uppercase tracking-wide ${alert.severity === 'critical' ? 'text-red-400' : 'text-amber-400'}`}>
                {alert.severity === 'critical' ? '🔴 CRITICAL' : '🟠 WARNING'}
              </span>
              <span className="text-xs text-muted-foreground">{alert.type.replace(/_/g, ' ')}</span>
            </div>
            <p className="text-sm font-medium">{alert.message}</p>
            <p className="text-xs text-muted-foreground mt-1">→ {alert.recommended_action}</p>
          </div>
        </div>
      ))}
    </div>
  )
}
