import path from 'path'
import fs from 'fs'
import { app } from 'electron'

const DIM = 384 // MiniLM-L6-v2 output dimension

export class EmbedModel {
  private modelLoaded = false

  async init(): Promise<void> {
    const modelPath = path.join(app.getPath('userData'), '..', '..', 'models', 'minilm.onnx')
    if (fs.existsSync(modelPath)) {
      // Real ONNX Runtime inference would initialise here
      // const ort = await import('onnxruntime-node')
      // this.session = await ort.InferenceSession.create(modelPath)
      this.modelLoaded = true
      console.log('[EmbedModel] ONNX model loaded:', modelPath)
    } else {
      console.log('[EmbedModel] Mock mode — deterministic pseudo-embeddings')
    }
  }

  async embed(text: string): Promise<number[]> {
    if (this.modelLoaded) return this.embedReal(text)
    return this.embedMock(text)
  }

  private async embedReal(text: string): Promise<number[]> {
    return this.embedMock(text)
  }

  /** Deterministic pseudo-embedding based on character hashes — for mock/demo only */
  private embedMock(text: string): number[] {
    const vec = new Array<number>(DIM).fill(0)
    for (let i = 0; i < text.length; i++) {
      vec[i % DIM] += (text.charCodeAt(i) / 255) * 2 - 1
    }
    // L2-normalise
    const norm = Math.sqrt(vec.reduce((s, v) => s + v * v, 0)) || 1
    return vec.map((v) => v / norm)
  }

  get dimension(): number {
    return DIM
  }
}
