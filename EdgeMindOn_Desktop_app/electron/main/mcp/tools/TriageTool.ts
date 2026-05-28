import type { McpTool, TriageResult, NerEntity } from '../../../../src/types'

export const TRIAGE_TOOL: McpTool = {
  name: 'triage',
  description: 'Assign ESI triage level (1–5) given extracted clinical entities',
  inputSchema: {
    type: 'object',
    properties: {
      entities: { type: 'array', items: { type: 'object' } },
      prompt: { type: 'string' }
    },
    required: ['entities', 'prompt']
  }
}

const RED_FLAG_SYMPTOMS = new Set([
  'chest pain', 'shortness of breath', 'dyspnoea', 'syncope', 'diaphoresis', 'tachycardia'
])

export function runTriage(entities: NerEntity[], prompt: string): TriageResult {
  const symptoms = entities.filter((e) => e.label === 'SYMPTOM')
  const redFlags = symptoms.filter((s) => RED_FLAG_SYMPTOMS.has(s.text.toLowerCase()))

  let esiLevel = 5
  let confidence = 0.45
  let rationale = 'Non-urgent — routine assessment appropriate.'

  if (redFlags.length >= 2) {
    esiLevel = 2
    confidence = 0.62
    rationale =
      `High-risk presentation: ${redFlags.map((r) => r.text).join(', ')}. ` +
      'Immediate physician evaluation required. ESI Level 2 triggered by ≥2 red-flag symptoms.'
  } else if (redFlags.length === 1) {
    esiLevel = 3
    confidence = 0.71
    rationale = `Moderate-risk: ${redFlags[0].text} identified. Further assessment within 30 min.`
  } else if (symptoms.length > 0) {
    esiLevel = 4
    confidence = 0.78
    rationale = `Low-acuity symptoms (${symptoms.map((s) => s.text).join(', ')}). Routine evaluation.`
  }

  const lp = prompt.toLowerCase()
  if (lp.includes('severe') || lp.includes('crushing') || lp.includes('worst')) {
    esiLevel = Math.min(esiLevel, 2)
    confidence = Math.max(confidence, 0.7)
    rationale = 'Severity descriptor escalates to ESI 2. ' + rationale
  }

  return { esiLevel, confidence, rationale, entities }
}
