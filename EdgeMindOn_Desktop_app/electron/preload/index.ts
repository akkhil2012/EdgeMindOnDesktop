import { contextBridge, ipcRenderer } from 'electron'
import type { EdgeMindAPI, QueryResponse, AuditEntry, RuntimeMetrics } from '../../src/types'

const api: EdgeMindAPI = {
  query: (prompt: string): Promise<QueryResponse> =>
    ipcRenderer.invoke('edgemind:query', prompt),

  getAuditLog: (): Promise<AuditEntry[]> =>
    ipcRenderer.invoke('edgemind:getAuditLog'),

  getMetrics: (): Promise<RuntimeMetrics> =>
    ipcRenderer.invoke('edgemind:getMetrics'),

  clearAuditLog: (): Promise<void> =>
    ipcRenderer.invoke('edgemind:clearAuditLog'),

  onMetricsUpdate: (cb: (m: RuntimeMetrics) => void): (() => void) => {
    const listener = (_: Electron.IpcRendererEvent, m: RuntimeMetrics): void => cb(m)
    ipcRenderer.on('metrics:update', listener)
    return () => ipcRenderer.off('metrics:update', listener)
  }
}

contextBridge.exposeInMainWorld('edgemind', api)
