import { ArrowDown, ArrowUp, Minus } from 'lucide-react'
import type { ComponentType } from 'react'
import { cn } from '@/lib/utils'

interface MetricCardProps {
  title: string
  /** Pre-formatted value for display (e.g. "42" or "$1,250"). */
  value: string
  icon: ComponentType<{ className?: string }>
  /**
   * Delta-mode secondary row: arrow + delta text. Omit when the metric
   * doesn't have a sensible comparison (e.g. total pipeline value).
   */
  delta?: {
    /** Positive / negative / zero drives arrow + color. */
    sign: number
    /** Pre-formatted delta, e.g. "+3 vs yesterday". */
    label: string
  }
  /** Used instead of `delta` when the metric has a static subtitle. */
  subtitle?: string
}

export function MetricCard({ title, value, icon: Icon, delta, subtitle }: MetricCardProps) {
  return (
    <div
      className="rounded-xl p-5"
      style={{
        backgroundColor: "var(--ei-surface-card)",
        border: "1px solid rgba(159,176,201,0.18)",
        boxShadow: "var(--ei-shadow-card)",
      }}
    >
      <div className="flex items-start justify-between">
        <p
          className="text-xs font-medium uppercase tracking-widest"
          style={{ color: "var(--ei-text-soft)", fontFamily: "'JetBrains Mono', monospace" }}
        >
          {title}
        </p>
        <div
          className="flex h-8 w-8 items-center justify-center rounded-lg"
          style={{ backgroundColor: "rgba(43,111,219,0.12)", color: "var(--ei-cobalt)" }}
        >
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <p
        className="mt-3 text-[28px] leading-none font-bold tabular-nums"
        style={{ color: "var(--ei-offwhite)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}
      >
        {value}
      </p>
      {delta ? <DeltaRow sign={delta.sign} label={delta.label} /> : subtitle ? (
        <p className="mt-2 text-xs" style={{ color: "var(--ei-text-soft)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{subtitle}</p>
      ) : null}
    </div>
  )
}

function DeltaRow({ sign, label }: { sign: number; label: string }) {
  const color = sign > 0 ? "var(--ei-iris)" : sign < 0 ? "#f87171" : "var(--ei-text-soft)"
  const Arrow = sign > 0 ? ArrowUp : sign < 0 ? ArrowDown : Minus
  return (
    <div className="mt-2 flex items-center gap-1 text-xs" style={{ color, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <Arrow className="h-3.5 w-3.5" aria-hidden />
      <span className="tabular-nums">{label}</span>
    </div>
  )
}
