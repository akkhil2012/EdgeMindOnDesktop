// ─── Inference ────────────────────────────────────────────────────────────────

export type InferencePath = 'slm' | 'rag' | 'llm'

export interface InferenceResult {
  text: string
  confidence: number
  path: InferencePath
  latencyMs: number
  tokensGenerated: number
  modelId: string
}

export interface InferenceRequest {
  prompt: string
  maxTokens?: number
  temperature?: number
  /** Pre-fetched RAG context chunks */
  ragContext?: string[]
}

// ─── Guard / IAM ──────────────────────────────────────────────────────────────

export type GuardVerdict = 'PASS' | 'BLOCK'

export interface GuardResult {
  verdict: GuardVerdict
  reason?: string
  latencyMs: number
}

export interface IamToken {
  sub: string
  scope: string[]
  iat: number
  exp: number
  jti: string
}

// ─── MCP ──────────────────────────────────────────────────────────────────────

export interface McpTool {
  name: string
  description: string
  inputSchema: Record<string, unknown>
}

export interface McpRequest {
  id: string
  tool: string
  args: Record<string, unknown>
  token: string
}

export interface McpResponse {
  id: string
  tool: string
  result: unknown
  latencyMs: number
  error?: string
}

// ─── RAG ──────────────────────────────────────────────────────────────────────

export interface KbChunk {
  id: string
  text: string
  embedding?: number[]
  metadata?: Record<string, string>
}

export interface RagResult {
  chunks: KbChunk[]
  searchLatencyMs: number
}

// ─── Audit ────────────────────────────────────────────────────────────────────

export type AuditEventType =
  | 'GUARD_PASS'
  | 'GUARD_BLOCK'
  | 'IAM_ISSUE'
  | 'IAM_REJECT'
  | 'MCP_CALL'
  | 'MCP_ERROR'
  | 'INFERENCE_START'
  | 'INFERENCE_END'
  | 'RAG_SEARCH'
  | 'PATH_ROUTE'

export interface AuditEntry {
  id: string
  ts: number
  type: AuditEventType
  detail: string
  hmac: string
}

// ─── Metrics ──────────────────────────────────────────────────────────────────

export interface RuntimeMetrics {
  cpuPercent: number
  ramMb: number
  latencyMs: number
  confidence: number
  path: InferencePath | null
  tokensPerSec: number
}

// ─── IPC channel map ──────────────────────────────────────────────────────────

export interface EdgeMindAPI {
  query: (prompt: string) => Promise<QueryResponse>
  getAuditLog: () => Promise<AuditEntry[]>
  getMetrics: () => Promise<RuntimeMetrics>
  clearAuditLog: () => Promise<void>
  onMetricsUpdate: (cb: (m: RuntimeMetrics) => void) => () => void
}

export interface QueryResponse {
  result: InferenceResult | null
  guardResult: GuardResult
  ragResult?: RagResult
  auditIds: string[]
  error?: string
}

// ─── Triage / NER ─────────────────────────────────────────────────────────────

export interface NerEntity {
  text: string
  label: 'SYMPTOM' | 'CONDITION' | 'MEDICATION' | 'BODY_PART' | 'OTHER'
  score: number
}

export interface TriageResult {
  esiLevel: number
  confidence: number
  rationale: string
  entities: NerEntity[]
}
