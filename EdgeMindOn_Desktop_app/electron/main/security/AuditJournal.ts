import crypto from 'crypto'
import path from 'path'
import fs from 'fs'
import { app } from 'electron'
import { v4 as uuidv4 } from 'uuid'
import type { AuditEntry, AuditEventType } from '../../../src/types'

const HMAC_SECRET = 'edgemind-audit-hmac-secret-v1'

export class AuditJournal {
  private logPath!: string
  private cache: AuditEntry[] = []

  init(): void {
    this.logPath = path.join(app.getPath('userData'), 'audit.jsonl')
    this.cache = this.loadFromDisk()
    console.log(`[AuditJournal] Ready — ${this.cache.length} existing entries at ${this.logPath}`)
  }

  log(type: AuditEventType, detail: string): string {
    const id = uuidv4()
    const ts = Date.now()
    const payload = `${id}|${ts}|${type}|${detail}`
    const hmac = crypto.createHmac('sha256', HMAC_SECRET).update(payload).digest('hex')

    const entry: AuditEntry = { id, ts, type, detail, hmac }
    this.cache.unshift(entry)
    if (this.cache.length > 500) this.cache.pop()

    fs.appendFileSync(this.logPath, JSON.stringify(entry) + '\n', 'utf8')
    return id
  }

  getAll(): AuditEntry[] {
    return this.cache.slice(0, 500)
  }

  clear(): void {
    this.cache = []
    fs.writeFileSync(this.logPath, '', 'utf8')
  }

  verify(entry: AuditEntry): boolean {
    const payload = `${entry.id}|${entry.ts}|${entry.type}|${entry.detail}`
    const expected = crypto.createHmac('sha256', HMAC_SECRET).update(payload).digest('hex')
    return expected === entry.hmac
  }

  private loadFromDisk(): AuditEntry[] {
    if (!fs.existsSync(this.logPath)) return []
    const lines = fs.readFileSync(this.logPath, 'utf8').trim().split('\n').filter(Boolean)
    const entries: AuditEntry[] = []
    for (const line of lines) {
      try {
        entries.push(JSON.parse(line))
      } catch {
        // skip malformed lines
      }
    }
    return entries.reverse()
  }
}
