/**
 * Coverage Gap Matrix card — 21st.dev card style with animated bars
 */
import { AnimatedScore } from './AnimatedScore'
import { Badge } from './ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Progress } from './ui/progress'
import type { CoverageGapMatrix } from '@/lib/api'
import {} from '@/lib/utils'

interface Props { coverage: CoverageGapMatrix }

export function CoverageGapCard({ coverage }: Props) {
  const { arabic_metrics: ar, western_metrics: we, gap_score } = coverage

  return (
    <Card className="animate-fade-in">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <span>📊</span> Coverage Gap Matrix
          </CardTitle>
          <Badge variant={gap_score >= 70 ? 'critical' : gap_score >= 45 ? 'warning' : 'success'}>
            Gap: {gap_score}/100
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground mt-1">{coverage.summary}</p>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Head-to-head metrics */}
        <div className="grid grid-cols-3 gap-4">
          <AnimatedScore value={gap_score} label="Gap Score" sublabel="0=equal 100=blind" size="lg" />
          <div className="flex flex-col gap-3 justify-center">
            <Metric label="Arabic articles" value={ar.article_count} camp="arabic" />
            <Metric label="Arabic depth" value={ar.depth_score} camp="arabic" isScore />
            <Metric label="Arabic diversity" value={ar.angle_diversity} camp="arabic" isScore />
          </div>
          <div className="flex flex-col gap-3 justify-center">
            <Metric label="Western articles" value={we.article_count} camp="western" />
            <Metric label="Western depth" value={we.depth_score} camp="western" isScore />
            <Metric label="Western diversity" value={we.angle_diversity} camp="western" isScore />
          </div>
        </div>

        {/* Exclusive angles */}
        <div className="grid grid-cols-2 gap-4">
          <ExclusiveAngles camp="arabic" label="Arabic-only angles" angles={coverage.exclusive_arabic_angles} />
          <ExclusiveAngles camp="western" label="Western-only angles" angles={coverage.exclusive_western_angles} />
        </div>

        {/* Shared */}
        {coverage.shared_angles.length > 0 && (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">Shared angles</p>
            <div className="flex flex-wrap gap-1.5">
              {coverage.shared_angles.map((a, i) => (
                <span key={i} className="px-2 py-0.5 rounded-full text-xs bg-secondary text-secondary-foreground border border-border">{a}</span>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function Metric({ label, value, camp, isScore }: { label: string; value: number; camp: 'arabic' | 'western'; isScore?: boolean }) {
  const color = camp === 'arabic' ? 'bg-arabic' : 'bg-western'
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-mono font-medium">{isScore ? `${value}%` : value}</span>
      </div>
      {isScore && <Progress value={value} indicatorClassName={color} className="h-1.5" />}
    </div>
  )
}

function ExclusiveAngles({ camp, label, angles }: { camp: 'arabic' | 'western'; label: string; angles: string[] }) {
  if (angles.length === 0) return null
  const variant = camp === 'arabic' ? 'arabic' : 'western'
  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <div className="flex flex-col gap-1.5">
        {angles.slice(0, 4).map((a, i) => (
          <div key={i} className="flex items-start gap-2">
            <span className={`mt-1 h-1.5 w-1.5 rounded-full flex-shrink-0 ${camp === 'arabic' ? 'bg-arabic' : 'bg-western'}`} />
            <Badge variant={variant} className="text-xs font-normal whitespace-normal text-left">{a}</Badge>
          </div>
        ))}
      </div>
    </div>
  )
}
