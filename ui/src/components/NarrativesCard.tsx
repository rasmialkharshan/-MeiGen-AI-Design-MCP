/**
 * Narrative Clusters card with strength bars and emotion indicators
 */
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Badge } from './ui/badge'
import { Progress } from './ui/progress'
import type { NarrativeAnalysis } from '@/lib/api'

interface Props { narratives: NarrativeAnalysis }

const EMOTION_ICON: Record<string, string> = {
  fear: '😨', hope: '🌟', anger: '🔥', neutral: '⚖️', pride: '💪', grief: '💔',
}

export function NarrativesCard({ narratives }: Props) {
  return (
    <Card className="animate-fade-in">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2"><span>🧠</span> Narrative Analysis</CardTitle>
        <p className="text-sm text-muted-foreground">{narratives.narrative_evolution_summary}</p>
      </CardHeader>

      <CardContent className="space-y-5">
        {/* Dominant narratives */}
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-3">Dominant Narratives</p>
          <div className="space-y-3">
            {narratives.dominant_narratives.map((n) => (
              <div key={n.id} className="rounded-lg border p-3 space-y-2 hover:bg-muted/20 transition-colors">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{EMOTION_ICON[n.emotional_register] ?? '⚖️'}</span>
                    <div>
                      <div className="text-sm font-semibold">{n.title}</div>
                      <div className="flex gap-1 mt-0.5">
                        {n.dominant_in.map(camp => (
                          <Badge key={camp} variant={camp === 'arabic' ? 'arabic' : 'western'} className="text-xs">{camp}</Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                  <span className="text-xs font-mono text-muted-foreground whitespace-nowrap">{n.strength}%</span>
                </div>
                <Progress value={n.strength} indicatorClassName="bg-primary" className="h-1" />
                <p className="text-xs text-muted-foreground">{n.description}</p>
                {n.key_claims.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {n.key_claims.slice(0, 3).map((c, i) => (
                      <span key={i} className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground">"{c}"</span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Contested claims */}
        {narratives.contested_claims.length > 0 && (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">⚡ Contested Claims</p>
            <div className="space-y-1">
              {narratives.contested_claims.slice(0, 4).map((claim, i) => (
                <div key={i} className="flex items-start gap-2 text-sm">
                  <span className="text-amber-400 mt-0.5">•</span>
                  <span className="text-muted-foreground">{claim}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Turning points */}
        {narratives.turning_points.length > 0 && (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">🔄 Turning Points</p>
            <div className="space-y-2">
              {narratives.turning_points.slice(0, 2).map((tp, i) => (
                <div key={i} className="flex gap-3 items-start">
                  <span className="text-xs font-mono text-muted-foreground w-24 flex-shrink-0 pt-0.5">{tp.date}</span>
                  <div>
                    <div className="text-sm font-medium">{tp.event}</div>
                    <div className="text-xs text-muted-foreground">{tp.narrative_shift}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
