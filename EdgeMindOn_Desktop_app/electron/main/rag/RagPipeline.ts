import type { KbChunk, RagResult } from '../../../src/types'
import { EmbedModel } from './EmbedModel'
import { VectorIndex } from './VectorIndex'

const CLINICAL_KB: KbChunk[] = [
  {
    id: 'acs-1',
    text: 'Acute Coronary Syndrome (ACS) presents with chest pain, diaphoresis, and radiation to jaw or left arm. ECG shows ST changes. Troponin elevation confirms myocardial injury. STEMI requires emergent PCI within 90 minutes.',
    metadata: { category: 'cardiology', esi: '1' }
  },
  {
    id: 'pe-1',
    text: 'Pulmonary Embolism (PE) presents with pleuritic chest pain, dyspnoea, tachycardia. Wells criteria assess pre-test probability. D-dimer negative rules out PE in low probability. CT-PA is gold standard. Treatment: anticoagulation.',
    metadata: { category: 'pulmonology', esi: '2' }
  },
  {
    id: 'dissection-1',
    text: 'Aortic Dissection: tearing chest/back pain, BP differential between arms ≥ 20 mmHg. Widened mediastinum on CXR. CT aortogram confirms. Type A involves ascending aorta — surgical emergency. Type B managed medically.',
    metadata: { category: 'vascular', esi: '1' }
  },
  {
    id: 'ptx-1',
    text: 'Tension Pneumothorax: sudden dyspnoea, absent ipsilateral breath sounds, tracheal deviation away from affected side. Haemodynamic instability. Needle decompression 2nd ICS mid-clavicular line before CXR if unstable.',
    metadata: { category: 'thoracic', esi: '1' }
  },
  {
    id: 'triage-esi',
    text: 'ESI Level 2 criteria: high-risk situation, new onset confusion, severe pain or distress. Requires immediate physician evaluation. Includes chest pain with cardiac features, major trauma, altered mental status.',
    metadata: { category: 'triage', esi: '2' }
  },
  {
    id: 'ner-symptoms',
    text: 'Common cardiac symptoms: chest pain (substernal, crushing), dyspnoea (exertional or at rest), diaphoresis, nausea, palpitations, syncope, pre-syncope, oedema. Atypical presentations more common in women and diabetics.',
    metadata: { category: 'symptoms', esi: '2' }
  }
]

export class RagPipeline {
  private embedModel: EmbedModel
  private vectorIndex: VectorIndex
  private initialised = false

  constructor() {
    this.embedModel = new EmbedModel()
    this.vectorIndex = new VectorIndex()
  }

  async init(): Promise<void> {
    await this.embedModel.init()
    const embedded = await Promise.all(
      CLINICAL_KB.map(async (chunk) => ({
        ...chunk,
        embedding: await this.embedModel.embed(chunk.text)
      }))
    )
    this.vectorIndex.load(embedded)
    this.initialised = true
    console.log(`[RagPipeline] Ready — ${this.vectorIndex.size} chunks indexed`)
  }

  async retrieve(query: string, k = 3): Promise<RagResult> {
    const start = Date.now()
    if (!this.initialised) throw new Error('RagPipeline not initialised')

    const queryEmb = await this.embedModel.embed(query)
    const hits = this.vectorIndex.search(queryEmb, k)

    return {
      chunks: hits.map((h) => h.chunk),
      searchLatencyMs: Date.now() - start
    }
  }
}
