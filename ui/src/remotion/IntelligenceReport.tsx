/**
 * Remotion animated intelligence report video
 * 30fps, 450 frames (15 seconds)
 */
import { AbsoluteFill, Sequence, useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion'
import type { AnalysisReport } from '@/lib/api'

interface Props { report: AnalysisReport }

export const REPORT_FPS = 30
export const REPORT_DURATION_FRAMES = 450 // 15s

export function IntelligenceReport({ report }: Props) {
  return (
    <AbsoluteFill style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)', fontFamily: 'Inter, system-ui, sans-serif' }}>
      {/* Background grid */}
      <GridBackground />

      {/* Intro scene */}
      <Sequence from={0} durationInFrames={90}>
        <IntroScene topic={report.topic} mode={report.mode} sources={report.sources} />
      </Sequence>

      {/* Coverage gap scene */}
      <Sequence from={90} durationInFrames={90}>
        <CoverageGapScene coverage={report.coverage_gap} />
      </Sequence>

      {/* Framing scene */}
      <Sequence from={180} durationInFrames={90}>
        <FramingScene framing={report.framing_analysis} />
      </Sequence>

      {/* Key insights scene */}
      <Sequence from={270} durationInFrames={90}>
        <InsightsScene synthesis={report.synthesis} />
      </Sequence>

      {/* Outro */}
      <Sequence from={360} durationInFrames={90}>
        <OutroScene reportId={report.report_id} confidence={report.synthesis.confidence_level} />
      </Sequence>

      {/* Progress bar — always visible */}
      <ReportProgressBar totalFrames={REPORT_DURATION_FRAMES} />
    </AbsoluteFill>
  )
}

// ─── Background ─────────────────────────────────────────────────────────────

function GridBackground() {
  return (
    <AbsoluteFill style={{ opacity: 0.08 }}>
      <svg width="100%" height="100%">
        <defs>
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#60a5fa" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
      </svg>
    </AbsoluteFill>
  )
}

// ─── Intro ───────────────────────────────────────────────────────────────────

function IntroScene({ topic, mode, sources }: { topic: string; mode: string; sources: AnalysisReport['sources'] }) {
  const frame = useCurrentFrame()
  useVideoConfig()

  const titleOpacity = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: 'clamp' })
  const titleY = interpolate(frame, [0, 20], [30, 0], { extrapolateRight: 'clamp' })
  const subOpacity = interpolate(frame, [20, 40], [0, 1], { extrapolateRight: 'clamp' })
  const statsOpacity = interpolate(frame, [40, 60], [0, 1], { extrapolateRight: 'clamp' })

  return (
    <AbsoluteFill style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 60, gap: 24 }}>
      {/* Logo/badge */}
      <div style={{ opacity: titleOpacity, transform: `translateY(${titleY}px)` }}>
        <div style={{ background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.4)', borderRadius: 8, padding: '6px 16px', display: 'inline-block', marginBottom: 16 }}>
          <span style={{ color: '#60a5fa', fontSize: 12, fontWeight: 600, letterSpacing: '0.1em' }}>MISBAR INTELLIGENCE SYSTEM v3.0</span>
        </div>
        <h1 style={{ color: '#f1f5f9', fontSize: 42, fontWeight: 700, textAlign: 'center', lineHeight: 1.2, margin: 0 }}>{topic}</h1>
      </div>

      <div style={{ opacity: subOpacity, textAlign: 'center' }}>
        <p style={{ color: '#94a3b8', fontSize: 18, margin: 0 }}>Comparative Media Intelligence Report — Mode {mode}</p>
        <p style={{ color: '#64748b', fontSize: 14, marginTop: 8 }}>{new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
      </div>

      <div style={{ opacity: statsOpacity, display: 'flex', gap: 32, marginTop: 8 }}>
        {[
          { label: 'Total Sources', value: sources.total },
          { label: 'Arabic', value: sources.arabic },
          { label: 'Western', value: sources.western },
          { label: 'Outlets', value: sources.sources_reached },
        ].map(({ label, value }) => (
          <div key={label} style={{ textAlign: 'center' }}>
            <div style={{ color: '#60a5fa', fontSize: 28, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{value}</div>
            <div style={{ color: '#64748b', fontSize: 12 }}>{label}</div>
          </div>
        ))}
      </div>
    </AbsoluteFill>
  )
}

// ─── Coverage Gap ────────────────────────────────────────────────────────────

function CoverageGapScene({ coverage }: { coverage: AnalysisReport['coverage_gap'] }) {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  const titleOpacity = interpolate(frame, [0, 15], [0, 1], { extrapolateRight: 'clamp' })
  const barProgress = spring({ frame, fps, config: { damping: 20, stiffness: 80 }, from: 0, to: 1, delay: 20 })

  const arabicDepth = coverage.arabic_metrics.depth_score
  const westernDepth = coverage.western_metrics.depth_score
  const gapScore = coverage.gap_score

  const gapColor = gapScore >= 70 ? '#ef4444' : gapScore >= 45 ? '#f59e0b' : '#10b981'

  return (
    <AbsoluteFill style={{ display: 'flex', flexDirection: 'column', padding: 60, gap: 32 }}>
      <div style={{ opacity: titleOpacity }}>
        <div style={{ color: '#94a3b8', fontSize: 14, letterSpacing: '0.1em', marginBottom: 8 }}>COVERAGE GAP MATRIX</div>
        <h2 style={{ color: '#f1f5f9', fontSize: 32, fontWeight: 700, margin: 0 }}>Media Coverage Comparison</h2>
      </div>

      {/* Gap score hero */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 40, opacity: interpolate(frame, [10, 30], [0, 1], { extrapolateRight: 'clamp' }) }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ color: gapColor, fontSize: 72, fontWeight: 800, fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>{Math.round(gapScore * barProgress)}</div>
          <div style={{ color: '#64748b', fontSize: 14 }}>Gap Score / 100</div>
        </div>
        <div style={{ flex: 1, color: '#94a3b8', fontSize: 16, lineHeight: 1.6 }}>{coverage.summary}</div>
      </div>

      {/* Depth bars */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, opacity: interpolate(frame, [30, 50], [0, 1], { extrapolateRight: 'clamp' }) }}>
        <Bar label="Arabic Media Depth" value={arabicDepth * barProgress} color="#10b981" />
        <Bar label="Western Media Depth" value={westernDepth * barProgress} color="#3b82f6" />
      </div>

      {/* Exclusive angles */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, opacity: interpolate(frame, [50, 70], [0, 1], { extrapolateRight: 'clamp' }) }}>
        <AngleBox title="Arabic-Only" angles={coverage.exclusive_arabic_angles} color="#10b981" />
        <AngleBox title="Western-Only" angles={coverage.exclusive_western_angles} color="#3b82f6" />
      </div>
    </AbsoluteFill>
  )
}

function Bar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={{ color: '#94a3b8', fontSize: 14 }}>{label}</span>
        <span style={{ color, fontSize: 14, fontWeight: 600 }}>{Math.round(value)}%</span>
      </div>
      <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 4, height: 8, overflow: 'hidden' }}>
        <div style={{ background: color, height: '100%', width: `${value}%`, borderRadius: 4, transition: 'width 0.3s' }} />
      </div>
    </div>
  )
}

function AngleBox({ title, angles, color }: { title: string; angles: string[]; color: string }) {
  return (
    <div style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${color}33`, borderRadius: 8, padding: 16 }}>
      <div style={{ color, fontSize: 12, fontWeight: 600, marginBottom: 8 }}>{title}</div>
      {angles.slice(0, 3).map((a, i) => (
        <div key={i} style={{ color: '#94a3b8', fontSize: 13, marginBottom: 4, display: 'flex', gap: 8, alignItems: 'flex-start' }}>
          <span style={{ color, marginTop: 4, fontSize: 8 }}>●</span>{a}
        </div>
      ))}
    </div>
  )
}

// ─── Framing ─────────────────────────────────────────────────────────────────

function FramingScene({ framing }: { framing: AnalysisReport['framing_analysis'] }) {
  const frame = useCurrentFrame()
  const divColor = framing.overall_divergence === 'critical' ? '#ef4444' : framing.overall_divergence === 'high' ? '#f59e0b' : '#10b981'

  return (
    <AbsoluteFill style={{ display: 'flex', flexDirection: 'column', padding: 60, gap: 28 }}>
      <div style={{ opacity: interpolate(frame, [0, 15], [0, 1], { extrapolateRight: 'clamp' }) }}>
        <div style={{ color: '#94a3b8', fontSize: 14, letterSpacing: '0.1em', marginBottom: 8 }}>FRAMING ANALYSIS</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <h2 style={{ color: '#f1f5f9', fontSize: 28, fontWeight: 700, margin: 0 }}>Narrative Framing Comparison</h2>
          <span style={{ background: `${divColor}22`, border: `1px solid ${divColor}55`, color: divColor, borderRadius: 6, padding: '4px 12px', fontSize: 13, fontWeight: 600 }}>{framing.overall_divergence.toUpperCase()}</span>
        </div>
      </div>

      <p style={{ color: '#94a3b8', fontSize: 16, lineHeight: 1.6, margin: 0, opacity: interpolate(frame, [15, 30], [0, 1], { extrapolateRight: 'clamp' }) }}>{framing.key_finding}</p>

      {/* Tone comparison */}
      <div style={{ display: 'flex', gap: 16, opacity: interpolate(frame, [25, 45], [0, 1], { extrapolateRight: 'clamp' }) }}>
        <ToneBox camp="Arabic Media" tone={framing.narrative_tone.arabic} color="#10b981" />
        <div style={{ display: 'flex', alignItems: 'center', color: '#475569', fontSize: 18 }}>vs</div>
        <ToneBox camp="Western Media" tone={framing.narrative_tone.western} color="#3b82f6" />
      </div>

      {/* Terminology divergences */}
      <div style={{ opacity: interpolate(frame, [45, 65], [0, 1], { extrapolateRight: 'clamp' }) }}>
        <div style={{ color: '#64748b', fontSize: 12, letterSpacing: '0.08em', marginBottom: 10 }}>TERMINOLOGY DIVERGENCES</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {framing.terminology_divergences.slice(0, 3).map((t, i) => (
            <div key={i} style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 8, padding: '10px 16px', display: 'flex', gap: 16, alignItems: 'center' }}>
              <span style={{ color: '#f1f5f9', fontWeight: 600, fontSize: 14, minWidth: 120 }}>{t.concept}</span>
              <span style={{ color: '#10b981', fontSize: 13 }}>{t.arabic_terms.join(' / ')}</span>
              <span style={{ color: '#64748b' }}>→</span>
              <span style={{ color: '#3b82f6', fontSize: 13 }}>{t.western_terms.join(' / ')}</span>
            </div>
          ))}
        </div>
      </div>
    </AbsoluteFill>
  )
}

function ToneBox({ camp, tone, color }: { camp: string; tone: string; color: string }) {
  const icons: Record<string, string> = { sympathetic: '💚', critical: '🔴', neutral: '⚖️', alarmist: '🟠', analytical: '🔵' }
  return (
    <div style={{ flex: 1, background: `${color}11`, border: `1px solid ${color}33`, borderRadius: 10, padding: 16, textAlign: 'center' }}>
      <div style={{ color, fontSize: 12, fontWeight: 600, marginBottom: 8 }}>{camp}</div>
      <div style={{ fontSize: 28 }}>{icons[tone] ?? '⚖️'}</div>
      <div style={{ color: '#f1f5f9', fontSize: 16, fontWeight: 600, textTransform: 'capitalize', marginTop: 6 }}>{tone}</div>
    </div>
  )
}

// ─── Insights ────────────────────────────────────────────────────────────────

function InsightsScene({ synthesis }: { synthesis: AnalysisReport['synthesis'] }) {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  void fps

  const priorityColors: Record<string, string> = { critical: '#ef4444', high: '#f97316', medium: '#f59e0b', low: '#10b981' }
  const priorityIcons: Record<string, string> = { critical: '🔴', high: '🟠', medium: '🟡', low: '🟢' }

  return (
    <AbsoluteFill style={{ display: 'flex', flexDirection: 'column', padding: 60, gap: 24 }}>
      <div style={{ opacity: interpolate(frame, [0, 15], [0, 1], { extrapolateRight: 'clamp' }) }}>
        <div style={{ color: '#94a3b8', fontSize: 14, letterSpacing: '0.1em', marginBottom: 8 }}>KEY INTELLIGENCE FINDINGS</div>
        <h2 style={{ color: '#f1f5f9', fontSize: 28, fontWeight: 700, margin: 0 }}>Strategic Insights</h2>
      </div>

      {/* Executive summary */}
      <div style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.25)', borderRadius: 10, padding: 16, opacity: interpolate(frame, [15, 30], [0, 1], { extrapolateRight: 'clamp' }) }}>
        <p style={{ color: '#cbd5e1', fontSize: 14, lineHeight: 1.6, margin: 0 }}>{synthesis.executive_summary}</p>
      </div>

      {/* Insights list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {synthesis.key_insights.slice(0, 4).map((insight, i) => {
          const itemOpacity = interpolate(frame, [30 + i * 12, 50 + i * 12], [0, 1], { extrapolateRight: 'clamp' })
          const color = priorityColors[insight.priority] ?? '#94a3b8'
          return (
            <div key={insight.id} style={{ opacity: itemOpacity, display: 'flex', gap: 12, alignItems: 'flex-start', background: 'rgba(255,255,255,0.03)', borderLeft: `3px solid ${color}`, borderRadius: '0 8px 8px 0', padding: '10px 14px' }}>
              <span style={{ fontSize: 14, flexShrink: 0 }}>{priorityIcons[insight.priority]}</span>
              <div>
                <div style={{ color: '#f1f5f9', fontWeight: 600, fontSize: 14 }}>{insight.title}</div>
                <div style={{ color: '#64748b', fontSize: 12, marginTop: 3 }}>{insight.description.slice(0, 120)}{insight.description.length > 120 ? '…' : ''}</div>
              </div>
            </div>
          )
        })}
      </div>
    </AbsoluteFill>
  )
}

// ─── Outro ───────────────────────────────────────────────────────────────────

function OutroScene({ reportId, confidence }: { reportId: string; confidence: number }) {
  const frame = useCurrentFrame()
  const fadeIn = interpolate(frame, [0, 30], [0, 1], { extrapolateRight: 'clamp' })
  const fadeOut = interpolate(frame, [60, 90], [1, 0], { extrapolateRight: 'clamp' })
  const opacity = fadeIn * fadeOut

  return (
    <AbsoluteFill style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20, opacity }}>
      <div style={{ fontSize: 48 }}>📡</div>
      <h2 style={{ color: '#f1f5f9', fontSize: 28, fontWeight: 700, margin: 0 }}>Report Complete</h2>
      <p style={{ color: '#64748b', fontSize: 14, margin: 0 }}>ID: {reportId.slice(0, 8)}… | Confidence: {confidence}%</p>
      <div style={{ color: '#475569', fontSize: 13, marginTop: 8 }}>Misbar Intelligence System v3.0 — نظام مصدر للذكاء الإعلامي المقارن</div>
    </AbsoluteFill>
  )
}

// ─── Progress Bar ─────────────────────────────────────────────────────────────

function ReportProgressBar({ totalFrames }: { totalFrames: number }) {
  const frame = useCurrentFrame()
  const pct = (frame / totalFrames) * 100
  return (
    <AbsoluteFill style={{ top: 'auto', bottom: 0, height: 3, background: 'rgba(255,255,255,0.05)' }}>
      <div style={{ height: '100%', width: `${pct}%`, background: 'linear-gradient(90deg, #10b981, #3b82f6)', transition: 'width 0.1s' }} />
    </AbsoluteFill>
  )
}
