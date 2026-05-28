import { create } from 'zustand'
import type { QueryResponse, AuditEntry, RuntimeMetrics } from '../types'

export type AppTab = 'assistant' | 'audit'

export interface Message {
  id: string
  role: 'user' | 'assistant'
  text: string
  confidence?: number
  path?: string
  latencyMs?: number
  ts: number
}

interface AppState {
  tab: AppTab
  messages: Message[]
  auditLog: AuditEntry[]
  metrics: RuntimeMetrics
  loading: boolean
  error: string | null

  setTab: (t: AppTab) => void
  pushMessage: (m: Message) => void
  setAuditLog: (entries: AuditEntry[]) => void
  updateMetrics: (m: RuntimeMetrics) => void
  setLoading: (v: boolean) => void
  setError: (e: string | null) => void
  clearMessages: () => void
}

export const useAppStore = create<AppState>((set) => ({
  tab: 'assistant',
  messages: [],
  auditLog: [],
  metrics: { cpuPercent: 0, ramMb: 0, latencyMs: 0, confidence: 0, path: null, tokensPerSec: 0 },
  loading: false,
  error: null,

  setTab: (tab) => set({ tab }),
  pushMessage: (m) => set((s) => ({ messages: [...s.messages, m] })),
  setAuditLog: (auditLog) => set({ auditLog }),
  updateMetrics: (metrics) => set({ metrics }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  clearMessages: () => set({ messages: [] })
}))

export async function submitQuery(prompt: string): Promise<void> {
  const store = useAppStore.getState()
  store.setLoading(true)
  store.setError(null)

  const userMsg: Message = {
    id: crypto.randomUUID(),
    role: 'user',
    text: prompt,
    ts: Date.now()
  }
  store.pushMessage(userMsg)

  try {
    const response: QueryResponse = await window.edgemind.query(prompt)

    if (response.guardResult.verdict === 'BLOCK') {
      store.pushMessage({
        id: crypto.randomUUID(),
        role: 'assistant',
        text: `Query blocked by safety guard: ${response.guardResult.reason ?? 'policy violation'}`,
        ts: Date.now()
      })
      return
    }

    if (response.error) {
      store.setError(response.error)
      return
    }

    if (response.result) {
      store.pushMessage({
        id: crypto.randomUUID(),
        role: 'assistant',
        text: response.result.text,
        confidence: response.result.confidence,
        path: response.result.path,
        latencyMs: response.result.latencyMs,
        ts: Date.now()
      })
    }
  } catch (err) {
    store.setError(err instanceof Error ? err.message : String(err))
  } finally {
    store.setLoading(false)
  }
}
