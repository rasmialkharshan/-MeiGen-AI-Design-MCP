import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function gapColor(score: number): string {
  if (score >= 70) return 'text-red-400'
  if (score >= 45) return 'text-amber-400'
  if (score >= 20) return 'text-yellow-400'
  return 'text-emerald-400'
}

export function gapBg(score: number): string {
  if (score >= 70) return 'bg-red-500'
  if (score >= 45) return 'bg-amber-500'
  if (score >= 20) return 'bg-yellow-500'
  return 'bg-emerald-500'
}

export function divergenceColor(level: string): string {
  return { critical: 'text-red-400', high: 'text-orange-400', medium: 'text-amber-400', low: 'text-emerald-400' }[level] ?? 'text-muted-foreground'
}

export function priorityColor(priority: string): string {
  return { critical: 'text-red-400', high: 'text-orange-400', medium: 'text-amber-400', low: 'text-emerald-400' }[priority] ?? 'text-muted-foreground'
}

export function priorityDot(priority: string): string {
  return { critical: 'bg-red-500', high: 'bg-orange-500', medium: 'bg-amber-500', low: 'bg-emerald-500' }[priority] ?? 'bg-muted'
}
