import { app } from 'electron'
import path from 'path'
import fs from 'fs'

interface Interaction {
  prompt: string
  response: string
  path: string
  confidence: number
  ts: number
}

const LORA_RANK = 8
const LORA_ALPHA = 16
const MIN_INTERACTIONS = 50
const IDLE_DELAY_MS = 10 * 60 * 1000 // 10 min

export class LoraTrainer {
  private interactions: Interaction[] = []
  private timer: NodeJS.Timeout | null = null
  private training = false

  record(interaction: Interaction): void {
    this.interactions.push(interaction)
    this.scheduleIdleTraining()
  }

  private scheduleIdleTraining(): void {
    if (this.timer) clearTimeout(this.timer)
    this.timer = setTimeout(() => this.maybeTrainOnIdle(), IDLE_DELAY_MS)
  }

  private async maybeTrainOnIdle(): Promise<void> {
    if (this.training) return
    if (this.interactions.length < MIN_INTERACTIONS) {
      console.log(`[LoraTrainer] Deferred — need ${MIN_INTERACTIONS - this.interactions.length} more interactions`)
      return
    }

    this.training = true
    console.log(`[LoraTrainer] Starting LoRA fine-tune rank=${LORA_RANK} alpha=${LORA_ALPHA} on ${this.interactions.length} samples`)

    await this.runTrainingJob()

    this.interactions = []
    this.training = false
  }

  private async runTrainingJob(): Promise<void> {
    const dataPath = path.join(app.getPath('userData'), 'lora_interactions.jsonl')
    const lines = this.interactions.map((i) => JSON.stringify(i)).join('\n')
    fs.writeFileSync(dataPath, lines)

    // Real training would invoke ExecuTorch Training API or a Python subprocess here.
    // For now: stub that simulates 30 s training loop.
    console.log('[LoraTrainer] Training stub — adapter saved to userData/lora_adapter.bin (simulated)')
    await new Promise((r) => setTimeout(r, 30_000))

    const adapterPath = path.join(app.getPath('userData'), 'lora_adapter.bin')
    fs.writeFileSync(adapterPath, Buffer.alloc(LORA_RANK * LORA_ALPHA))
    console.log('[LoraTrainer] Adapter written:', adapterPath)
  }

  stop(): void {
    if (this.timer) clearTimeout(this.timer)
  }
}
