import type { McpTool } from '../../../../src/types'

export const ESCALATE_TOOL: McpTool = {
  name: 'escalate_llm',
  description: 'Escalate inference to the 7B LLM when SLM confidence is below threshold',
  inputSchema: {
    type: 'object',
    properties: {
      prompt: { type: 'string' },
      slmConfidence: { type: 'number' },
      ragContext: { type: 'array', items: { type: 'string' } }
    },
    required: ['prompt', 'slmConfidence']
  }
}
