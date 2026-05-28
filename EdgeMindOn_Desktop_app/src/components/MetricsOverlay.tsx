import React from 'react'
import type { RuntimeMetrics } from '../types'

interface Props {
  metrics: RuntimeMetrics
}

function Bar({ value, color }: { value: number; color: string }): React.ReactElement {
  return (
    <div className="h-1.5 w-full rounded-full bg-surface-overlay overflow-hidden">
      <div
        className={`h-full rounded-full transition-all duration-300 ${color}`}
        style={{ width: `${Math.min(100, value)}%` }}
      />
    </div>
  )
}

function Chip({
  label,
  value,
  unit = '',
  color = 'text-slate-300'
}: {
  label: string
  value: string | number
  unit?: string
  color?: string
}): React.ReactElement {
  return (
    <div className="flex flex-col gap-0.5 min-w-[72px]">
      <span className="text-[10px] text-muted uppercase tracking-wider">{label}</span>
      <span className={`text-sm font-mono font-semibold ${color}`}>
        {value}
        {unit && <span className="text-xs text-muted ml-0.5">{unit}</span>}
      </span>
    </div>
  )
}

const PATH_COLOR: Record<string, string> = {
  slm: 'text-success',
  rag: 'text-warn',
  llm: 'text-accent'
}

export function MetricsOverlay({ metrics }: Props): React.ReactElement {
  const pathLabel = metrics.path ? metrics.path.toUpperCase() : '—'
  const pathColor = metrics.path ? PATH_COLOR[metrics.path] : 'text-muted'
  const confPct = Math.round(metrics.confidence * 100)

  return (
    <div className="flex items-center gap-4 px-4 py-2 bg-surface-raised border-b border-white/5 text-xs">
      <div className="flex items-center gap-1.5 shrink-0">
        <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
        <span className="text-muted font-mono">EdgeMind</span>
      </div>

      <div className="h-4 w-px bg-white/10" />

      <Chip label="Path" value={pathLabel} color={pathColor} />
      <Chip label="Conf" value={`${confPct}%`} color={confPct >= 75 ? 'text-success' : confPct >= 50 ? 'text-warn' : 'text-danger'} />
      <Chip label="Latency" value={metrics.latencyMs} unit="ms" />
      <Chip label="Tok/s" value={metrics.tokensPerSec} />

      <div className="h-4 w-px bg-white/10" />

      <div className="flex flex-col gap-1 min-w-[80px]">
        <div className="flex justify-between text-[10px]">
          <span className="text-muted">CPU</span>
          <span className="text-slate-300 font-mono">{metrics.cpuPercent}%</span>
        </div>
        <Bar value={metrics.cpuPercent} color="bg-accent" />
      </div>

      <div className="flex flex-col gap-1 min-w-[80px]">
        <div className="flex justify-between text-[10px]">
          <span className="text-muted">RAM</span>
          <span className="text-slate-300 font-mono">{metrics.ramMb} MB</span>
        </div>
        <Bar value={(metrics.ramMb / 16384) * 100} color="bg-indigo-400" />
      </div>
    </div>
  )
}
