import type { McpTool } from '../../../../src/types'

export const RAG_TOOL: McpTool = {
  name: 'rag_retrieve',
  description: 'Retrieve relevant clinical knowledge-base chunks for a given query',
  inputSchema: {
    type: 'object',
    properties: {
      query: { type: 'string' },
      k: { type: 'number', default: 3 }
    },
    required: ['query']
  }
}
