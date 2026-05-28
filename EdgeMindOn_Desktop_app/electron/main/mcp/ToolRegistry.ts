import type { McpTool } from '../../../src/types'
import { NER_TOOL } from './tools/NerTool'
import { TRIAGE_TOOL } from './tools/TriageTool'
import { RAG_TOOL } from './tools/RagTool'
import { ESCALATE_TOOL } from './tools/EscalateTool'

export class ToolRegistry {
  private tools = new Map<string, McpTool>()

  init(): void {
    for (const tool of [NER_TOOL, TRIAGE_TOOL, RAG_TOOL, ESCALATE_TOOL]) {
      this.tools.set(tool.name, tool)
    }
    console.log(`[ToolRegistry] Registered tools: ${[...this.tools.keys()].join(', ')}`)
  }

  get(name: string): McpTool | undefined {
    return this.tools.get(name)
  }

  list(): McpTool[] {
    return [...this.tools.values()]
  }

  /** Required scope for a given tool name */
  scopeFor(toolName: string): string {
    return `tool:${toolName}`
  }
}
