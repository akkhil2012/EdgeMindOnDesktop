import { app, BrowserWindow, ipcMain, shell } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import os from 'os'

import { GuardModel } from './security/GuardModel'
import { IamService } from './security/IamService'
import { AuditJournal } from './security/AuditJournal'
import { SlmEngine } from './inference/SlmEngine'
import { LlmEngine } from './inference/LlmEngine'
import { RagPipeline } from './rag/RagPipeline'
import { ToolRegistry } from './mcp/ToolRegistry'
import { McpServer } from './mcp/McpServer'
import { McpClient } from './mcp/McpClient'
import { LoraTrainer } from './training/LoraTrainer'
import type { RuntimeMetrics } from '../../src/types'

// ─── Singletons ───────────────────────────────────────────────────────────────

const guard = new GuardModel()
const iam = new IamService()
const audit = new AuditJournal()
const slm = new SlmEngine()
const llm = new LlmEngine()
const rag = new RagPipeline()
const registry = new ToolRegistry()
const trainer = new LoraTrainer()

let server: McpServer
let client: McpClient
let mainWindow: BrowserWindow | null = null

// ─── Metrics ──────────────────────────────────────────────────────────────────

let liveMetrics: RuntimeMetrics = {
  cpuPercent: 0,
  ramMb: 0,
  latencyMs: 0,
  confidence: 0,
  path: null,
  tokensPerSec: 0
}

function sampleSystemMetrics(): RuntimeMetrics {
  const totalMem = os.totalmem()
  const freeMem = os.freemem()
  const usedMb = Math.round((totalMem - freeMem) / 1024 / 1024)
  const cpuLoad = os.loadavg()[0] * 10 // rough estimate
  return {
    ...liveMetrics,
    cpuPercent: Math.min(100, Math.round(cpuLoad)),
    ramMb: usedMb
  }
}

function startMetricsBroadcast(win: BrowserWindow): void {
  setInterval(() => {
    const m = sampleSystemMetrics()
    win.webContents.send('metrics:update', m)
  }, 1000)
}

// ─── App lifecycle ────────────────────────────────────────────────────────────

async function bootstrap(): Promise<void> {
  // Initialise all subsystems
  audit.init()
  await iam.init()
  registry.init()
  await Promise.all([slm.init(), llm.init(), rag.init()])

  server = new McpServer(registry, iam, audit, rag, slm, llm)
  client = new McpClient(server, iam, audit, guard, slm, rag)

  console.log('[EdgeMind] All subsystems ready')
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    backgroundColor: '#0f1117',
    titleBarStyle: 'hiddenInset',
    vibrancy: 'under-window',
    visualEffectState: 'active',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow!.show()
    startMetricsBroadcast(mainWindow!)
  })

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(async () => {
  electronApp.setAppUserModelId('com.edgemind.desktop')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  await bootstrap()
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  trainer.stop()
  if (process.platform !== 'darwin') app.quit()
})

// ─── IPC Handlers ─────────────────────────────────────────────────────────────

ipcMain.handle('edgemind:query', async (_, prompt: string) => {
  const start = Date.now()
  try {
    const response = await client.query(prompt)
    const latencyMs = Date.now() - start

    if (response.result) {
      liveMetrics = {
        ...liveMetrics,
        latencyMs,
        confidence: response.result.confidence,
        path: response.result.path,
        tokensPerSec: response.result.tokensGenerated
          ? Math.round(response.result.tokensGenerated / (latencyMs / 1000))
          : 0
      }

      trainer.record({
        prompt,
        response: response.result.text,
        path: response.result.path,
        confidence: response.result.confidence,
        ts: Date.now()
      })
    }

    return response
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    audit.log('MCP_ERROR', `unhandled: ${msg}`)
    return { result: null, guardResult: { verdict: 'BLOCK', reason: msg, latencyMs: 0 }, auditIds: [], error: msg }
  }
})

ipcMain.handle('edgemind:getAuditLog', async () => {
  return audit.getAll()
})

ipcMain.handle('edgemind:getMetrics', async () => {
  return sampleSystemMetrics()
})

ipcMain.handle('edgemind:clearAuditLog', async () => {
  audit.clear()
})
