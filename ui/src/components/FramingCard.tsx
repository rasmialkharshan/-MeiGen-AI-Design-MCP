/**
 * Framing Analysis card with terminology divergence table
 */
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Badge } from './ui/badge'
import type { FramingAnalysis } from '@/lib/api'
import { divergenceColor } from '@/lib/utils'

interface Props { framing: FramingAnalysis }

const TONE_ICON: Record<string, string> = {
  sympathetic: '💚', critical: '🔴', neutral: '⚪', alarmist: '🟠', analytical: '🔵',
}

export function FramingCard({ framing }: Props) {
  const divVariant = framing.overall_divergence === 'critical' ? 'critical' : framing.overall_divergence === 'high' ? 'warning' : 'success'

  return (
    <Card className="animate-fade-in">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2"><span>🎭</span> Framing Analysis</CardTitle>
          <Badge variant={divVariant} className="capitalize">{framing.overall_divergence} divergence</Badge>
        </div>
        <p className="text-sm text-muted-foreground">{framing.key_finding}</p>
      </CardHeader>

      <CardContent className="space-y-5">
        {/* Tone comparison */}
        <div className="flex gap-4">
          <TonePill camp="Arabic" tone={framing.narrative_tone.arabic} />
          <div className="flex items-center text-muted-foreground">vs</div>
          <TonePill camp="Western" tone={framing.narrative_tone.western} />
        </div>

        {/* Terminology divergences */}
        {framing.terminology_divergences.length > 0 && (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">Terminology Divergences</p>
            <div className="rounded-lg border overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground">Concept</th>
                    <th className="text-left px-3 py-2 text-xs font-medium text-arabic">Arabic terms</th>
                    <th className="text-left px-3 py-2 text-xs font-medium text-western">Western terms</th>
                    <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground">Level</th>
                  </tr>
                </thead>
                <tbody>
                  {framing.terminology_divergences.map((t, i) => (
                    <tr key={i} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="px-3 py-2 font-medium">{t.concept}</td>
                      <td className="px-3 py-2 text-arabic text-xs">{t.arabic_terms.join(', ')}</td>
                      <td className="px-3 py-2 text-western text-xs">{t.western_terms.join(', ')}</td>
                      <td className="px-3 py-2">
                        <span className={`text-xs font-medium ${divergenceColor(t.divergence_level)}`}>{t.divergence_level}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Framing dimensions */}
        {framing.framing_dimensions.length > 0 && (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">Framing Dimensions</p>
            <div className="space-y-2">
              {framing.framing_dimensions.slice(0, 3).map((d, i) => (
                <div key={i} className="rounded-lg border p-3 space-y-1.5">
                  <div className="text-xs font-semibold">{d.dimension}</div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="flex gap-1.5"><span className="text-arabic font-medium">AR:</span><span className="text-muted-foreground">{d.arabic_stance}</span></div>
                    <div className="flex gap-1.5"><span className="text-western font-medium">EN:</span><span className="text-muted-foreground">{d.western_stance}</span></div>
                  </div>
                  {d.divergence_note && <p className="text-xs text-muted-foreground italic">{d.divergence_note}</p>}
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function TonePill({ camp, tone }: { camp: string; tone: string }) {
  return (
    <div className={`flex-1 rounded-lg border p-3 text-center ${camp === 'Arabic' ? 'border-arabic/30 bg-arabic/5' : 'border-western/30 bg-western/5'}`}>
      <div className={`text-xs font-medium mb-1 ${camp === 'Arabic' ? 'text-arabic' : 'text-western'}`}>{camp} Media</div>
      <div className="text-lg">{TONE_ICON[tone] ?? '⚪'}</div>
      <div className="text-sm font-semibold capitalize mt-1">{tone}</div>
    </div>
  )
}
