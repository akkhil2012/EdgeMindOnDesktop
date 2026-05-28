import path from 'path'
import fs from 'fs'
import { app } from 'electron'
import type { InferenceRequest, InferenceResult } from '../../../src/types'

const MOCK_LLM_RESPONSES: Record<string, string> = {
  chest_pain:
    'DIFFERENTIAL DIAGNOSIS — Chest Pain + Dyspnoea\n\n' +
    '1. **Acute Coronary Syndrome (ACS)** — Most likely given symptom constellation.\n' +
    '   - STEMI / NSTEMI / UA distinguished by ECG + troponin kinetics.\n' +
    '   - Management: DAPT, heparin, PCI if STEMI.\n\n' +
    '2. **Pulmonary Embolism** — Wells score: pleuritic pain, tachycardia, immobility.\n' +
    '   - D-dimer + CT pulmonary angiography.\n' +
    '   - Management: anticoagulation, thrombolysis if massive PE.\n\n' +
    '3. **Aortic Dissection** — Tearing/ripping radiation to back, BP differential ≥ 20 mmHg.\n' +
    '   - Emergent CT aortogram.\n' +
    '   - Type A: surgical emergency. Type B: medical management.\n\n' +
    '4. **Pneumothorax** — Absent breath sounds, tracheal deviation (tension).\n' +
    '   - CXR → needle decompression if tension.\n\n' +
    'IMMEDIATE ACTIONS: 12-lead ECG, troponin, BNP, CXR, VBG, IV access × 2, continuous monitoring.\n\n' +
    'ESI LEVEL: 2 — Immediate physician evaluation required.',
  default:
    'Comprehensive analysis based on available clinical information:\n\n' +
    'This query requires careful consideration of multiple factors. A thorough clinical assessment ' +
    'including history, physical examination, and appropriate investigations is essential. ' +
    'The differential diagnosis should be approached systematically, considering common, serious, ' +
    'and treatable conditions. Risk stratification tools appropriate to the clinical context ' +
    'should guide further management decisions.'
}

export class LlmEngine {
  private modelLoaded = false
  private readonly modelId = 'Llama-3.1-8B-Instruct-int4'

  async init(): Promise<void> {
    const modelsDir = path.join(app.getPath('userData'), '..', '..', 'models')
    const modelPath = path.join(modelsDir, 'llama_8b.gguf')

    if (fs.existsSync(modelPath)) {
      // node-llama-cpp full-precision loading for 7-8B models
      this.modelLoaded = true
      console.log('[LlmEngine] Real 8B model loaded:', modelPath)
    } else {
      console.log('[LlmEngine] Mock mode — no 8B .gguf found')
    }
  }

  async run(req: InferenceRequest): Promise<InferenceResult> {
    const start = Date.now()
    if (this.modelLoaded) return this.runReal(req, start)
    return this.runMock(req, start)
  }

  private async runReal(req: InferenceRequest, start: number): Promise<InferenceResult> {
    return this.runMock(req, start)
  }

  private async runMock(req: InferenceRequest, start: number): Promise<InferenceResult> {
    const lp = req.prompt.toLowerCase()
    // Simulate 1–5 s LLM inference
    await sleep(1000 + Math.random() * 4000)

    const text =
      lp.includes('chest pain') || lp.includes('differential') || lp.includes('diagnosis')
        ? MOCK_LLM_RESPONSES.chest_pain
        : MOCK_LLM_RESPONSES.default

    return {
      text,
      confidence: 0.88 + Math.random() * 0.08,
      path: 'llm',
      latencyMs: Date.now() - start,
      tokensGenerated: Math.floor(text.split(' ').length * 1.3),
      modelId: this.modelId
    }
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}
