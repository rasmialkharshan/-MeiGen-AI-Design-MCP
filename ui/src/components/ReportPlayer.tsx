/**
 * Remotion Player embedded in the dashboard
 */
import { Player } from '@remotion/player'
import { IntelligenceReport, REPORT_FPS, REPORT_DURATION_FRAMES } from '@/remotion/IntelligenceReport'
import type { AnalysisReport } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'

interface Props { report: AnalysisReport }

export function ReportPlayer({ report }: Props) {
  return (
    <Card className="animate-fade-in overflow-hidden">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <span>🎬</span> Animated Intelligence Briefing
          <span className="text-xs font-normal text-muted-foreground ml-2">Powered by Remotion</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="rounded-b-xl overflow-hidden bg-[#0f172a]">
          <Player
            component={IntelligenceReport}
            inputProps={{ report }}
            durationInFrames={REPORT_DURATION_FRAMES}
            compositionWidth={1280}
            compositionHeight={720}
            fps={REPORT_FPS}
            style={{ width: '100%', aspectRatio: '16/9' }}
            controls
            loop
            autoPlay
          />
        </div>
      </CardContent>
    </Card>
  )
}
