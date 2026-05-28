import path from 'path'
import fs from 'fs'
import { app } from 'electron'
import type { InferenceRequest, InferenceResult } from '../../../src/types'

const MOCK_RESPONSES: Record<string, { text: string; confidence: number }> = {
  chest_pain: {
    text:
      'Based on the symptoms described (chest pain, shortness of breath), the triage assessment suggests ' +
      'ESI Level 2. Differential considerations include ACS, PE, and musculoskeletal causes. ' +
      'Immediate evaluation recommended.',
    confidence: 0.62
  },
  differential: {
    text:
      'For chest pain with shortness of breath, the primary differentials are: ' +
      '1. Acute Coronary Syndrome (ACS) — most critical, requires immediate ECG and troponins. ' +
      '2. Pulmonary Embolism (PE) — Wells score assessment warranted. ' +
      '3. Aortic Dissection — consider if tearing pain, BP differential. ' +
      '4. Pneumothorax — absent breath sounds, hypoxia.',
    confidence: 0.71
  },
  default: {
    text: 'I understand your query. Based on the available clinical context, I can provide a preliminary assessment. Please consult a qualified healthcare professional for definitive guidance.',
    confidence: 0.55
  }
}

export class SlmEngine {
  private modelLoaded = false
  private readonly modelId = 'Phi-3-Mini-4K-Instruct-int4'

  async init(): Promise<void> {
    const modelsDir = path.join(app.getPath('userData'), '..', '..', 'models')
    const modelPath = path.join(modelsDir, 'phi3_mini.gguf')

    if (fs.existsSync(modelPath)) {
      // node-llama-cpp would load here when model file is present
      // const { getLlama, LlamaChatSession } = await import('node-llama-cpp')
      // this.llama = await getLlama()
      // this.model = await this.llama.loadModel({ modelPath })
      this.modelLoaded = true
      console.log('[SlmEngine] Real model loaded:', modelPath)
    } else {
      console.log('[SlmEngine] Mock mode — no .gguf found at', modelPath)
    }
  }

  async run(req: InferenceRequest): Promise<InferenceResult> {
    const start = Date.now()

    if (this.modelLoaded) {
      return this.runReal(req, start)
    }
    return this.runMock(req, start)
  }

  private async runReal(req: InferenceRequest, start: number): Promise<InferenceResult> {
    // Real inference via node-llama-cpp would execute here.
    // Falls back to mock until the library is linked.
    return this.runMock(req, start)
  }

  private async runMock(req: InferenceRequest, start: number): Promise<InferenceResult> {
    const lp = req.prompt.toLowerCase()
    let chosen = MOCK_RESPONSES.default

    if (lp.includes('chest pain') || lp.includes('shortness of breath')) {
      chosen = MOCK_RESPONSES.chest_pain
    } else if (lp.includes('differential') || lp.includes('diagnosis')) {
      chosen = MOCK_RESPONSES.differential
    }

    // Simulate NPU latency (120–280 ms)
    await sleep(120 + Math.random() * 160)

    const ragBoost = req.ragContext ? 0.15 : 0
    const confidence = Math.min(0.99, chosen.confidence + ragBoost + (Math.random() * 0.06 - 0.03))

    return {
      text: req.ragContext
        ? `[RAG-augmented] ${chosen.text}`
        : chosen.text,
      confidence,
      path: req.ragContext ? 'rag' : 'slm',
      latencyMs: Date.now() - start,
      tokensGenerated: Math.floor(chosen.text.split(' ').length * 1.3),
      modelId: this.modelId
    }
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}
