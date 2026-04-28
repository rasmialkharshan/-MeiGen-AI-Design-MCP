/**
 * 21st.dev-style animated number counter with circular progress ring
 */
import { useEffect, useRef, useState } from 'react'
import { cn, gapColor } from '@/lib/utils'

interface AnimatedScoreProps {
  value: number
  max?: number
  label: string
  sublabel?: string
  size?: 'sm' | 'md' | 'lg'
  colorFn?: (v: number) => string
}

export function AnimatedScore({ value, max = 100, label, sublabel, size = 'md', colorFn = gapColor }: AnimatedScoreProps) {
  const [display, setDisplay] = useState(0)
  const raf = useRef<number>(0)

  useEffect(() => {
    const start = performance.now()
    const duration = 900
    const from = 0
    const to = value

    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1)
      const ease = 1 - Math.pow(1 - t, 3)
      setDisplay(Math.round(from + (to - from) * ease))
      if (t < 1) raf.current = requestAnimationFrame(tick)
    }
    raf.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf.current)
  }, [value])

  const pct = (display / max) * 100
  const r = size === 'lg' ? 44 : size === 'md' ? 36 : 28
  const stroke = size === 'lg' ? 5 : 4
  const circumference = 2 * Math.PI * r
  const dashOffset = circumference - (pct / 100) * circumference

  const colorClass = colorFn(value)
  const strokeColor = colorClass.includes('red') ? '#ef4444' : colorClass.includes('amber') ? '#f59e0b' : colorClass.includes('yellow') ? '#eab308' : '#10b981'

  const svgSize = (r + stroke) * 2 + 4
  const center = svgSize / 2

  const textSize = size === 'lg' ? 'text-3xl' : size === 'md' ? 'text-2xl' : 'text-xl'

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative flex items-center justify-center">
        <svg width={svgSize} height={svgSize} className="-rotate-90">
          <circle cx={center} cy={center} r={r} fill="none" strokeWidth={stroke} stroke="currentColor" className="text-muted opacity-30" />
          <circle
            cx={center} cy={center} r={r} fill="none"
            strokeWidth={stroke} stroke={strokeColor}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            className="transition-all duration-700"
          />
        </svg>
        <div className="absolute flex flex-col items-center">
          <span className={cn('font-bold font-mono tabular-nums', textSize, colorClass)}>{display}</span>
        </div>
      </div>
      <div className="text-center">
        <div className="text-sm font-medium">{label}</div>
        {sublabel && <div className="text-xs text-muted-foreground">{sublabel}</div>}
      </div>
    </div>
  )
}
