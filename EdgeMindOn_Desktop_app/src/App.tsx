import React, { useEffect } from 'react'
import { useAppStore } from './store/appStore'
import { AssistantScreen } from './components/AssistantScreen'
import { AuditLogPanel } from './components/AuditLogPanel'
import { MetricsOverlay } from './components/MetricsOverlay'
import type { AppTab } from './store/appStore'

const TABS: { id: AppTab; label: string; icon: string }[] = [
  { id: 'assistant', label: 'Assistant', icon: '💬' },
  { id: 'audit', label: 'Audit Log', icon: '🔒' }
]

export default function App(): React.ReactElement {
  const { tab, setTab, metrics, updateMetrics } = useAppStore()

  useEffect(() => {
    const unsub = window.edgemind.onMetricsUpdate((m) => updateMetrics(m))
    return unsub
  }, [updateMetrics])

  return (
    <div className="flex flex-col h-screen bg-surface text-white overflow-hidden select-none">
      {/* Title bar drag region */}
      <div
        className="h-8 bg-surface shrink-0"
        style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
      />

      {/* Metrics bar */}
      <MetricsOverlay metrics={metrics} />

      {/* Tab bar */}
      <div className="flex items-center gap-1 px-3 py-2 border-b border-white/10 bg-surface shrink-0">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              tab === t.id
                ? 'bg-accent/20 text-accent'
                : 'text-muted hover:text-white hover:bg-white/8'
            }`}
          >
            <span>{t.icon}</span>
            {t.label}
          </button>
        ))}
        <div className="ml-auto text-xs text-muted font-mono">
          EdgeMind Desktop · Mock Mode
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-hidden">
        {tab === 'assistant' && <AssistantScreen />}
        {tab === 'audit' && <AuditLogPanel />}
      </div>
    </div>
  )
}
