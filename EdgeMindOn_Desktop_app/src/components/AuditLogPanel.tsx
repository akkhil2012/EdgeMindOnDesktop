import React, { useEffect } from 'react'
import { useAppStore } from '../store/appStore'
import type { AuditEntry } from '../types'

const EVENT_COLOR: Record<string, string> = {
  GUARD_PASS: 'text-success',
  GUARD_BLOCK: 'text-danger',
  IAM_ISSUE: 'text-indigo-400',
  IAM_REJECT: 'text-danger',
  MCP_CALL: 'text-accent',
  MCP_ERROR: 'text-danger',
  INFERENCE_START: 'text-slate-400',
  INFERENCE_END: 'text-success',
  RAG_SEARCH: 'text-warn',
  PATH_ROUTE: 'text-purple-400'
}

function EntryRow({ entry }: { entry: AuditEntry }): React.ReactElement {
  const color = EVENT_COLOR[entry.type] ?? 'text-slate-300'
  const time = new Date(entry.ts).toLocaleTimeString('en-US', { hour12: false })
  return (
    <div className="grid grid-cols-[80px_140px_1fr] gap-3 py-1.5 border-b border-white/5 text-xs font-mono hover:bg-white/3 px-3">
      <span className="text-muted">{time}</span>
      <span className={`font-semibold ${color}`}>{entry.type}</span>
      <span className="text-slate-300 truncate" title={entry.detail}>{entry.detail}</span>
    </div>
  )
}

export function AuditLogPanel(): React.ReactElement {
  const { auditLog, setAuditLog } = useAppStore()

  useEffect(() => {
    let mounted = true
    const load = async (): Promise<void> => {
      const entries = await window.edgemind.getAuditLog()
      if (mounted) setAuditLog(entries)
    }
    load()
    const interval = setInterval(load, 3000)
    return () => {
      mounted = false
      clearInterval(interval)
    }
  }, [setAuditLog])

  const handleClear = async (): Promise<void> => {
    await window.edgemind.clearAuditLog()
    setAuditLog([])
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
        <div>
          <h2 className="text-sm font-semibold text-white">Audit Journal</h2>
          <p className="text-xs text-muted mt-0.5">
            {auditLog.length} signed entries · HMAC-SHA256 · SQLite
          </p>
        </div>
        <button
          onClick={handleClear}
          className="px-3 py-1.5 text-xs rounded-md bg-surface-overlay hover:bg-red-900/40 text-muted hover:text-danger border border-white/10 transition-colors"
        >
          Clear log
        </button>
      </div>

      <div className="grid grid-cols-[80px_140px_1fr] gap-3 px-3 py-2 bg-surface-overlay border-b border-white/10">
        <span className="text-[10px] text-muted uppercase tracking-wider">Time</span>
        <span className="text-[10px] text-muted uppercase tracking-wider">Event</span>
        <span className="text-[10px] text-muted uppercase tracking-wider">Detail</span>
      </div>

      <div className="flex-1 overflow-y-auto">
        {auditLog.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-sm text-muted">
            No audit entries yet
          </div>
        ) : (
          auditLog.map((e) => <EntryRow key={e.id} entry={e} />)
        )}
      </div>
    </div>
  )
}
