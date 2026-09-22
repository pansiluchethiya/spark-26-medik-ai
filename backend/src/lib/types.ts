export type ChatMessage = {
  role: 'user' | 'assistant'
  content: string
}

export type ChatRequest = {
  messages?: ChatMessage[]
  stream?: boolean
  webResearch?: boolean
}

export type AgentMessage = ChatMessage | {
  role: 'system'
  content: string
} | {
  role: 'assistant'
  content: string | null
  tool_calls?: ToolCall[]
} | {
  role: 'tool'
  tool_call_id: string
  content: string
}

export type ToolCall = {
  id: string
  type: 'function'
  function: { name: string; arguments: string }
}

export type ToolResult = { name: string; result: unknown }

export type AgentToolSchema = {
  type: 'function'
  function: {
    name: string
    description: string
    parameters: {
      type: 'object'
      properties: Record<string, { type: string; description?: string; enum?: string[] }>
      required?: string[]
      additionalProperties?: boolean
    }
  }
}
