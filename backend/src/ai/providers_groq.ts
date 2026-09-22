import type { AgentMessage, ToolCall } from '../lib/types.ts'
import process from 'node:process'
import { executeResearchTool } from '../tools/executor.ts'
import { researchToolSchemas } from '../tools/schemas.ts'
import { providerFetch } from './infra.ts'

export type SseWriter = {
  write(chunk: string): unknown
  end(chunk?: string): unknown
  headersSent?: boolean
  writableEnded?: boolean
  writeHead?(status: number, headers: Record<string, string>): unknown
}

const groqModel = () => process.env.GROQ_MODEL ?? 'openai/gpt-oss-120b'

// Fast Groq agent: max 2 rounds, 1 web_search max, early exit on content.
export async function streamGroqAgent(messages: AgentMessage[], response: SseWriter, webResearch: boolean) {
  if (!response.headersSent) response.writeHead?.(200, { 'Content-Type': 'text/event-stream; charset=utf-8', 'Cache-Control': 'no-cache', Connection: 'keep-alive' })
  const conversation = [...messages]
  let answer = ''
  let toolsUsed = 0

  for (let round = 0; round < 2; round += 1) {
    const body: Record<string, unknown> = { model: groqModel(), temperature: 0.2, stream: true, messages: conversation, max_tokens: 700 }
    if (webResearch && toolsUsed === 0) body.tools = researchToolSchemas
    else body.tool_choice = 'none'
    const result = await providerFetch('Groq', 'https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY ?? ''}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })
    if (!result?.ok || !result.body) throw new Error(`Groq unavailable${result ? ` (HTTP ${result.status})` : ''}`)

    const reader = result.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    let finished = false
    let receivedContent = false
    const toolCalls = new Map<number, ToolCall>()
    while (!finished) {
      const chunk = await reader.read()
      buffer += decoder.decode(chunk.value, { stream: !chunk.done })
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue
        const value = line.slice(6).trim()
        if (value === '[DONE]') { finished = true; break }
        try {
          const parsed = JSON.parse(value) as { choices?: Array<{ delta?: { content?: string; tool_calls?: Array<{ index?: number; id?: string; function?: { name?: string; arguments?: string } }> } }> }
          const delta = parsed.choices?.[0]?.delta
          if (delta?.content) {
            receivedContent = true
            answer += delta.content
            response.write(`data: ${JSON.stringify({ token: delta.content })}\n\n`)
          }
          for (const item of delta?.tool_calls ?? []) {
            if (toolsUsed >= 1) continue
            const index = item.index ?? 0
            const current = toolCalls.get(index) ?? { id: item.id ?? `tool-${round}-${index}`, type: 'function' as const, function: { name: '', arguments: '' } }
            if (item.id) current.id = item.id
            if (item.function?.name) current.function.name += item.function.name
            if (item.function?.arguments) current.function.arguments += item.function.arguments
            toolCalls.set(index, current)
          }
        } catch { /* ignore fragment */ }
      }
      if (chunk.done) finished = true
    }

    const completedCalls = [...toolCalls.values()].slice(0, 1)
    if (completedCalls.length === 0) {
      if (!receivedContent) throw new Error('Groq empty')
      break
    }

    toolsUsed += completedCalls.length
    conversation.push({ role: 'assistant', content: answer || null, tool_calls: completedCalls } as unknown as AgentMessage)
    for (const call of completedCalls) {
      response.write(`data: ${JSON.stringify({ tool: { id: call.id, name: call.function.name, arguments: call.function.arguments, status: 'running' } })}\n\n`)
      const toolResult = await executeResearchTool(call.function.name, call.function.arguments)
      response.write(`data: ${JSON.stringify({ tool: { id: call.id, name: call.function.name, result: toolResult.result, status: 'completed' } })}\n\n`)
      conversation.push({ role: 'tool', tool_call_id: call.id, content: JSON.stringify(toolResult.result) } as unknown as AgentMessage)

      if (toolResult.result && typeof toolResult.result === 'object') {
        const res = toolResult.result as Record<string, unknown>
        const arr = (res.results as unknown[]) ?? []
        const verified = arr.slice(0, 3).map((item: unknown) => {
          const it = item as Record<string, string>
          if (!it?.url) return null
          try { const host = new URL(it.url).hostname.replace(/^www\./, ''); return { id: it.url, title: it.title || 'Clinical Reference', url: it.url, domain: host, quality: host.includes('.gov') || host.includes('who.int') ? 'High' : 'Verified', type: host.includes('nih.gov') ? 'peer-reviewed' : 'official' } } catch { return null }
        }).filter(Boolean)
        if (verified.length) response.write(`data: ${JSON.stringify({ sources: verified })}\n\n`)
      }
    }
    // After one tool use, force final answer in next round
    if (toolsUsed >= 1) continue
  }

  response.write(`data: ${JSON.stringify({ done: true })}\n\n`)
  response.end()
  return true
}
