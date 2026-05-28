import type { McpTool, NerEntity } from '../../../../src/types'

const SYMPTOM_TERMS = new Set([
  'pain', 'chest pain', 'dyspnoea', 'shortness of breath', 'tachycardia',
  'diaphoresis', 'nausea', 'palpitations', 'syncope', 'dizziness', 'fatigue',
  'oedema', 'cough', 'fever', 'chills', 'headache', 'weakness'
])

const CONDITION_TERMS = new Set([
  'acs', 'mi', 'stemi', 'nstemi', 'pe', 'pulmonary embolism', 'dissection',
  'pneumothorax', 'angina', 'hypertension', 'diabetes', 'copd', 'asthma'
])

const BODY_PARTS = new Set([
  'chest', 'heart', 'lung', 'abdomen', 'arm', 'leg', 'back', 'neck', 'jaw',
  'shoulder', 'neck', 'throat'
])

export const NER_TOOL: McpTool = {
  name: 'ner',
  description: 'Extract clinical named entities (symptoms, conditions, body parts) from text',
  inputSchema: {
    type: 'object',
    properties: { text: { type: 'string' } },
    required: ['text']
  }
}

export function runNer(text: string): NerEntity[] {
  const lower = text.toLowerCase()
  const entities: NerEntity[] = []

  for (const term of SYMPTOM_TERMS) {
    if (lower.includes(term)) {
      entities.push({ text: term, label: 'SYMPTOM', score: 0.85 + Math.random() * 0.12 })
    }
  }
  for (const term of CONDITION_TERMS) {
    if (lower.includes(term)) {
      entities.push({ text: term, label: 'CONDITION', score: 0.88 + Math.random() * 0.1 })
    }
  }
  for (const term of BODY_PARTS) {
    if (lower.includes(term)) {
      entities.push({ text: term, label: 'BODY_PART', score: 0.9 + Math.random() * 0.08 })
    }
  }

  return entities
}
