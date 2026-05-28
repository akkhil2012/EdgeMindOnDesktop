import type { McpResponse, InferenceResult, QueryResponse } from '../../../src/types'
import { McpServer } from './McpServer'
import { IamService } from '../security/IamService'
import { AuditJournal } from '../security/AuditJournal'
import { GuardModel } from '../security/GuardModel'
import { SlmEngine } from '../inference/SlmEngine'
import { RagPipeline } from '../rag/RagPipeline'

const SLM_CONFIDENCE_THRESHOLD = 0.75

export class McpClient {
  constructor(
    private server: McpServer,
    private iam: IamService,
    private audit: AuditJournal,
    private guard: GuardModel,
    private slm: SlmEngine,
    private rag: RagPipeline
  ) {}

  async query(prompt: string): Promise<QueryResponse> {
    // ── Step 1: Guard ─────────────────────────────────────────────────────────
    const guardResult = this.guard.classify(prompt)
    this.audit.log(guardResult.verdict === 'PASS' ? 'GUARD_PASS' : 'GUARD_BLOCK',
      `verdict=${guardResult.verdict} reason=${guardResult.reason ?? 'none'}`)

    if (guardResult.verdict === 'BLOCK') {
      return { result: null, guardResult, auditIds: [] }
    }

    // ── Step 2: IAM token (scoped to all tools this pipeline needs) ───────────
    const token = await this.iam.issueToken('assistant', ['tool:triage', 'tool:ner', 'tool:rag_retrieve', 'tool:escalate_llm', '*'])
    this.audit.log('IAM_ISSUE', 'scope=pipeline sub=assistant')

    const auditIds: string[] = []

    // ── Step 3: SLM (Path 1) ─────────────────────────────────────────────────
    this.audit.log('INFERENCE_START', 'path=slm')
    let slmResult = await this.slm.run({ prompt })
    let id = this.audit.log('INFERENCE_END',
      `path=slm confidence=${slmResult.confidence.toFixed(3)} latency=${slmResult.latencyMs}ms`)
    auditIds.push(id)

    this.audit.log('PATH_ROUTE',
      `confidence=${slmResult.confidence.toFixed(3)} threshold=${SLM_CONFIDENCE_THRESHOLD}`)

    if (slmResult.confidence >= SLM_CONFIDENCE_THRESHOLD) {
      return { result: slmResult, guardResult, auditIds }
    }

    // ── Step 4: RAG fallback (Path 3) ─────────────────────────────────────────
    const ragReq = this.server.buildRequest('rag_retrieve', { query: prompt, k: 3 }, token)
    const ragResp: McpResponse = await this.server.handle(ragReq)
    const ragResult = ragResp.result as Awaited<ReturnType<RagPipeline['retrieve']>> | null
    auditIds.push(this.audit.log('RAG_SEARCH', `hits=${ragResult?.chunks.length ?? 0}`))

    if (ragResult && ragResult.chunks.length > 0) {
      const ragContext = ragResult.chunks.map((c) => c.text)
      this.audit.log('INFERENCE_START', 'path=rag')
      slmResult = await this.slm.run({ prompt, ragContext })
      id = this.audit.log('INFERENCE_END',
        `path=rag confidence=${slmResult.confidence.toFixed(3)} latency=${slmResult.latencyMs}ms`)
      auditIds.push(id)

      this.audit.log('PATH_ROUTE',
        `rag_confidence=${slmResult.confidence.toFixed(3)} threshold=${SLM_CONFIDENCE_THRESHOLD}`)

      if (slmResult.confidence >= SLM_CONFIDENCE_THRESHOLD) {
        return { result: slmResult, guardResult, ragResult, auditIds }
      }
    }

    // ── Step 5: LLM escalation (Path 2) ──────────────────────────────────────
    this.audit.log('INFERENCE_START', 'path=llm')
    const escReq = this.server.buildRequest('escalate_llm', {
      prompt,
      slmConfidence: slmResult.confidence,
      ragContext: ragResult?.chunks.map((c) => c.text)
    }, token)
    const escResp: McpResponse = await this.server.handle(escReq)
    const llmResult = escResp.result as InferenceResult
    auditIds.push(this.audit.log('INFERENCE_END',
      `path=llm confidence=${llmResult?.confidence?.toFixed(3)} latency=${llmResult?.latencyMs}ms`))

    return { result: llmResult, guardResult, ragResult: ragResult ?? undefined, auditIds }
  }
}
