import type { GuardResult } from '../../../src/types'

const JAILBREAK_PATTERNS = [
  /ignore (previous|all|above|prior) instructions/i,
  /you are now (DAN|an AI without restrictions|unrestricted)/i,
  /pretend you (have no|don't have) (restrictions|limits|guidelines)/i,
  /bypass (safety|content|ethical) (filters|guidelines|restrictions)/i,
  /act as if you were trained (without|to ignore)/i
]

const PII_PATTERNS = [
  /\b\d{3}-\d{2}-\d{4}\b/, // SSN
  /\b\d{16}\b/, // credit card
  /\b[A-Z]{2}\d{6}[A-Z]\b/i // passport (simple)
]

const MEDICAL_SAFETY_PATTERNS = [
  /\bhow (to|do I) (overdose|kill myself|commit suicide)\b/i,
  /\bsuicide (method|instructions|guide)\b/i,
  /\bdangerous (drug combination|medication mix)\b/i
]

export class GuardModel {
  classify(prompt: string): GuardResult {
    const start = Date.now()

    for (const re of JAILBREAK_PATTERNS) {
      if (re.test(prompt)) {
        return { verdict: 'BLOCK', reason: 'jailbreak_attempt', latencyMs: Date.now() - start }
      }
    }

    for (const re of PII_PATTERNS) {
      if (re.test(prompt)) {
        return { verdict: 'BLOCK', reason: 'pii_detected', latencyMs: Date.now() - start }
      }
    }

    for (const re of MEDICAL_SAFETY_PATTERNS) {
      if (re.test(prompt)) {
        return { verdict: 'BLOCK', reason: 'medical_safety_redline', latencyMs: Date.now() - start }
      }
    }

    return { verdict: 'PASS', latencyMs: Date.now() - start }
  }
}
