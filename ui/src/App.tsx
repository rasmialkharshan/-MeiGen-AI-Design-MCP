import { useState, useCallback } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { AnalysisForm } from '@/components/AnalysisForm'
import { AlertsBanner } from '@/components/AlertsBanner'
import { CoverageGapCard } from '@/components/CoverageGapCard'
import { FramingCard } from '@/components/FramingCard'
import { NarrativesCard } from '@/components/NarrativesCard'
import { InsightsPanel } from '@/components/InsightsPanel'
import { ReportPlayer } from '@/components/ReportPlayer'
import { MemoryTable } from '@/components/MemoryTable'
import { AnimatedScore } from '@/components/AnimatedScore'
import { analyze, getMemory, type AnalysisReport, type AnalyzeRequest, type MemoryEntry } from '@/lib/api'
import { divergenceColor } from '@/lib/utils'

type AppState = 'idle' | 'loading' | 'done' | 'error'

export default function App() {
  const [state, setState] = useState<AppState>('idle')
  const [status, setStatus] = useState('')
  const [report, setReport] = useState<AnalysisReport | null>(null)
  const [error, setError] = useState('')
  const [memoryEntries, setMemoryEntries] = useState<MemoryEntry[]>([])
  const [currentTopic, setCurrentTopic] = useState('')
  const [activeTab, setActiveTab] = useState('analyze')

  const handleAnalyze = useCallback(async (req: AnalyzeRequest) => {
    setState('loading')
    setError('')
    setStatus('Collecting from 22 RSS sources…')
    setCurrentTopic(req.topic)

    try {
      // Simulate progress updates while fetching
      const progressSteps = [
        [800, 'Normalizing articles with Claude AI…'],
        [2000, 'Running intelligence engines (parallel)…'],
        [4000, 'Analyzing coverage gap…'],
        [6000, 'Analyzing framing divergence…'],
        [8000, 'Identifying narrative clusters…'],
        [10000, 'Synthesizing insights…'],
        [13000, 'Generating report…'],
      ]
      const timers = progressSteps.map(([delay, msg]) =>
        setTimeout(() => setStatus(msg as string), delay as number)
      )

      const result = await analyze(req)
      timers.forEach(clearTimeout)

      setReport(result)
      setState('done')
      setActiveTab('report')

      // Load memory
      const mem = await getMemory(req.topic).catch(() => null)
      if (mem) setMemoryEntries(mem.history)

    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      setError(msg)
      setState('error')
    }
  }, [])

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xl">📡</span>
            <div>
              <h1 className="text-sm font-bold leading-tight gradient-text">Misbar Intelligence System</h1>
              <p className="text-xs text-muted-foreground">نظام مصدر للذكاء الإعلامي المقارن · v3.0</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {report && (
              <div className="flex items-center gap-3">
                <Badge variant="outline" className="text-xs font-mono">{report.report_id.slice(0, 8)}</Badge>
                <Badge variant={report.coverage_gap.gap_score >= 45 ? 'critical' : 'success'} className="text-xs">
                  Gap {report.coverage_gap.gap_score}/100
                </Badge>
                <Badge variant={report.framing_analysis.overall_divergence === 'critical' ? 'critical' : report.framing_analysis.overall_divergence === 'high' ? 'warning' : 'success'} className="text-xs capitalize">
                  {report.framing_analysis.overall_divergence} framing
                </Badge>
              </div>
            )}
            <div className={`h-2 w-2 rounded-full ${state === 'loading' ? 'bg-amber-400 animate-pulse' : state === 'done' ? 'bg-emerald-400' : state === 'error' ? 'bg-red-400' : 'bg-muted'}`} />
          </div>
        </div>
      </header>

      <div className="flex flex-1 max-w-7xl mx-auto w-full">
        {/* Sidebar */}
        <aside className="w-72 border-r flex-shrink-0 p-5 space-y-6">
          <div>
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">New Analysis</h2>
            <AnalysisForm onSubmit={handleAnalyze} loading={state === 'loading'} status={status} />
          </div>

          {error && (
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {/* Quick stats */}
          {report && (
            <div className="space-y-3">
              <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Current Analysis</h2>
              <div className="grid grid-cols-2 gap-3">
                <AnimatedScore value={report.coverage_gap.gap_score} label="Gap" size="sm" />
                <AnimatedScore value={report.synthesis.confidence_level} label="Confidence" size="sm" colorFn={v => v >= 70 ? 'text-emerald-400' : v >= 40 ? 'text-amber-400' : 'text-red-400'} />
              </div>
              <div className="text-center">
                <div className="text-xs text-muted-foreground">Framing divergence</div>
                <div className={`text-sm font-semibold capitalize ${divergenceColor(report.framing_analysis.overall_divergence)}`}>
                  {report.framing_analysis.overall_divergence}
                </div>
              </div>
              <div className="text-center">
                <div className="text-xs text-muted-foreground">Sources analyzed</div>
                <div className="text-sm font-semibold">{report.sources.total} articles</div>
                <div className="text-xs text-muted-foreground">{report.sources.arabic} Arabic · {report.sources.western} Western</div>
              </div>
            </div>
          )}

          {/* About */}
          <div className="text-xs text-muted-foreground space-y-1 pt-2 border-t">
            <p>Powered by <strong>claude-opus-4-7</strong></p>
            <p>22 RSS sources · Arabic + Western</p>
            <p>Adaptive thinking · Prompt caching</p>
            <p className="pt-1">Built with <strong>Remotion</strong> + <strong>21st.dev</strong></p>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 overflow-hidden">
          <ScrollArea className="h-[calc(100vh-57px)]">
            <div className="p-6">
              {state === 'idle' && (
                <div className="flex flex-col items-center justify-center py-24 text-center space-y-4">
                  <div className="text-6xl">📡</div>
                  <h2 className="text-2xl font-bold">Misbar Intelligence System</h2>
                  <p className="text-muted-foreground max-w-md">
                    Enter a topic and run analysis to compare how Arabic and Western media cover the same stories — powered by real-time RSS feeds and Claude AI.
                  </p>
                  <div className="grid grid-cols-3 gap-4 mt-4 text-sm max-w-lg">
                    {[['📊', 'Coverage Gap', 'Detect what each camp ignores'], ['🎭', 'Framing', 'Compare language & angle'], ['🧠', 'Narratives', 'Identify dominant stories']].map(([icon, title, desc]) => (
                      <div key={title} className="rounded-lg border p-3 text-center">
                        <div className="text-2xl mb-1">{icon}</div>
                        <div className="font-medium text-xs">{title}</div>
                        <div className="text-xs text-muted-foreground">{desc}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {state === 'loading' && (
                <div className="flex flex-col items-center justify-center py-24 space-y-4">
                  <div className="relative">
                    <div className="h-16 w-16 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
                    <span className="absolute inset-0 flex items-center justify-center text-xl">📡</span>
                  </div>
                  <div className="text-center space-y-1">
                    <p className="font-medium">{status}</p>
                    <p className="text-sm text-muted-foreground">Analyzing "{currentTopic}"</p>
                  </div>
                  <div className="flex gap-2 text-xs text-muted-foreground">
                    {['Collect', 'Normalize', 'Analyze', 'Synthesize'].map((step, i) => (
                      <div key={step} className="flex items-center gap-1">
                        {i > 0 && <span>→</span>}
                        <span className={status.toLowerCase().includes(step.toLowerCase()) ? 'text-primary font-medium' : ''}>{step}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {state === 'done' && report && (
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <TabsList className="mb-6">
                    <TabsTrigger value="report">📋 Report</TabsTrigger>
                    <TabsTrigger value="video">🎬 Video</TabsTrigger>
                    <TabsTrigger value="coverage">📊 Coverage</TabsTrigger>
                    <TabsTrigger value="framing">🎭 Framing</TabsTrigger>
                    <TabsTrigger value="narratives">🧠 Narratives</TabsTrigger>
                    <TabsTrigger value="memory">🗂️ Memory ({memoryEntries.length})</TabsTrigger>
                  </TabsList>

                  <TabsContent value="report" className="space-y-4">
                    <AlertsBanner alerts={report.decision_alerts} />
                    <InsightsPanel synthesis={report.synthesis} />
                  </TabsContent>

                  <TabsContent value="video">
                    <ReportPlayer report={report} />
                  </TabsContent>

                  <TabsContent value="coverage">
                    <CoverageGapCard coverage={report.coverage_gap} />
                  </TabsContent>

                  <TabsContent value="framing">
                    <FramingCard framing={report.framing_analysis} />
                  </TabsContent>

                  <TabsContent value="narratives">
                    <NarrativesCard narratives={report.narrative_analysis} />
                  </TabsContent>

                  <TabsContent value="memory">
                    <MemoryTable entries={memoryEntries} topic={currentTopic} />
                  </TabsContent>
                </Tabs>
              )}

              {state === 'error' && (
                <div className="flex flex-col items-center justify-center py-24 text-center space-y-3">
                  <div className="text-4xl">⚠️</div>
                  <h3 className="text-lg font-semibold">Analysis Failed</h3>
                  <p className="text-sm text-muted-foreground max-w-md">{error}</p>
                  <p className="text-xs text-muted-foreground">Make sure the API server is running (<code>npm run misbar:serve</code>) and ANTHROPIC_API_KEY is set.</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </main>
      </div>
    </div>
  )
}
