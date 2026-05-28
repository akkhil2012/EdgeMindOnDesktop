import { v4 as uuidv4 } from 'uuid'
import type { McpRequest, McpResponse } from '../../../src/types'
import { ToolRegistry } from './ToolRegistry'
import { IamService } from '../security/IamService'
import { AuditJournal } from '../security/AuditJournal'
import { RagPipeline } from '../rag/RagPipeline'
import { SlmEngine } from '../inference/SlmEngine'
import { LlmEngine } from '../inference/LlmEngine'
import { runNer } from './tools/NerTool'
import { runTriage } from './tools/TriageTool'

export class McpServer {
  constructor(
    private registry: ToolRegistry,
    private iam: IamService,
    private audit: AuditJournal,
    private rag: RagPipeline,
    private slm: SlmEngine,
    private llm: LlmEngine
  ) {}

  async handle(req: McpRequest): Promise<McpResponse> {
    const start = Date.now()

    const tool = this.registry.get(req.tool)
    if (!tool) {
      this.audit.log('MCP_ERROR', `Unknown tool: ${req.tool}`)
      return { id: req.id, tool: req.tool, result: null, latencyMs: 0, error: 'Unknown tool' }
    }

    const requiredScope = this.registry.scopeFor(req.tool)
    const tokenPayload = await this.iam.validateToken(req.token, requiredScope)
    if (!tokenPayload) {
      this.audit.log('IAM_REJECT', `scope=${requiredScope} tool=${req.tool}`)
      return { id: req.id, tool: req.tool, result: null, latencyMs: 0, error: 'Unauthorized' }
    }

    this.audit.log('MCP_CALL', `tool=${req.tool} sub=${tokenPayload.sub}`)

    try {
      const result = await this.dispatch(req)
      const latencyMs = Date.now() - start
      this.audit.log('MCP_CALL', `tool=${req.tool} latency=${latencyMs}ms`)
      return { id: req.id, tool: req.tool, result, latencyMs }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      this.audit.log('MCP_ERROR', `tool=${req.tool} err=${msg}`)
      return { id: req.id, tool: req.tool, result: null, latencyMs: Date.now() - start, error: msg }
    }
  }

  private async dispatch(req: McpRequest): Promise<unknown> {
    switch (req.tool) {
      case 'ner':
        return runNer(req.args.text as string)

      case 'triage': {
        const entities = runNer(req.args.prompt as string)
        return runTriage(entities, req.args.prompt as string)
      }

      case 'rag_retrieve': {
        const k = (req.args.k as number) ?? 3
        const ragResult = await this.rag.retrieve(req.args.query as string, k)
        this.audit.log('RAG_SEARCH', `query="${(req.args.query as string).slice(0, 60)}" hits=${ragResult.chunks.length}`)
        return ragResult
      }

      case 'escalate_llm': {
        const result = await this.llm.run({
          prompt: req.args.prompt as string,
          ragContext: req.args.ragContext as string[] | undefined
        })
        this.audit.log('INFERENCE_END', `path=llm confidence=${result.confidence.toFixed(3)} latency=${result.latencyMs}ms`)
        return result
      }

      default:
        throw new Error(`No dispatcher for tool: ${req.tool}`)
    }
  }

  buildRequest(tool: string, args: Record<string, unknown>, token: string): McpRequest {
    return { id: uuidv4(), tool, args, token }
  }
}
