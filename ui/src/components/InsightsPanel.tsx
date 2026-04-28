/**
 * Intelligence insights panel — prioritized list with 21st.dev-style priority dots
 */
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Badge } from './ui/badge'
import type { InsightSynthesis } from '@/lib/api'
import { priorityDot } from '@/lib/utils'

interface Props { synthesis: InsightSynthesis }

const PRIORITY_ICON: Record<string, string> = { critical: '🔴', high: '🟠', medium: '🟡', low: '🟢' }
const AREA_ICON: Record<string, string> = { editorial: '✏️', reputation: '📊', policy: '🏛️', audience: '👥', narrative: '💬' }

export function InsightsPanel({ synthesis }: Props) {
  return (
    <div className="space-y-4 animate-fade-in">
      {/* Executive summary */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="pt-4">
          <div className="flex items-start gap-3">
            <div className="text-2xl">🎯</div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-semibold">Executive Summary</span>
                <Badge variant="secondary">{synthesis.confidence_level}% confidence</Badge>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">{synthesis.executive_summary}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Key insights */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base"><span>💡</span> Key Intelligence Findings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {synthesis.key_insights.map((insight) => (
            <div key={insight.id} className="flex gap-3 rounded-lg border p-3 hover:bg-muted/20 transition-colors">
              <div className="flex-shrink-0 pt-0.5">
                <div className={`h-2.5 w-2.5 rounded-full ${priorityDot(insight.priority)} mt-1`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="text-sm font-semibold">{PRIORITY_ICON[insight.priority]} {insight.title}</span>
                  <Badge variant="outline" className="text-xs">{insight.category}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">{insight.description}</p>
                {insight.recommended_action && (
                  <p className="text-xs mt-1.5 text-primary flex items-start gap-1">
                    <span>→</span><span>{insight.recommended_action}</span>
                  </p>
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Strategic implications */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2"><span>♟</span> Strategic Implications</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {synthesis.strategic_implications.map((imp, i) => (
              <div key={i} className="flex gap-2 items-start">
                <span className="text-lg flex-shrink-0">{AREA_ICON[imp.area] ?? '📌'}</span>
                <div>
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="text-xs font-semibold uppercase">{imp.area}</span>
                    <Badge variant={imp.urgency === 'immediate' ? 'critical' : imp.urgency === 'short_term' ? 'warning' : 'secondary'} className="text-xs">{imp.urgency.replace('_', ' ')}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{imp.implication}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Scenarios */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2"><span>🔮</span> Media Scenarios</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {synthesis.scenarios.map((s) => (
              <div key={s.id} className="rounded-lg border p-2.5">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium">{s.title}</span>
                  <Badge variant={s.probability === 'likely' ? 'default' : s.probability === 'possible' ? 'warning' : 'secondary'} className="text-xs">{s.probability}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">{s.description}</p>
                <p className="text-xs text-primary mt-1">→ {s.recommended_response}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
