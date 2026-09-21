import type { IncomingMessage, ServerResponse } from 'node:http'
import { readBody, sendJson } from '../helpers.ts'
import type { AgentMessage, ChatRequest } from '../types.ts'
import { buildSystemPrompt } from '../tools/prompt.ts'
import { streamAssistant } from '../ai/stream.ts'
import { tryCerebras, tryCloudflare, tryGemini, tryMistral, tryOpenRouter } from '../ai/providers_rest.ts'
import { generateLocalFallbackResponse } from '../ai/fallback.ts'

// POST /api/v1/ai/chat — triage/diagnostic chat with streaming + multi-provider failover.
export async function handleChat(request: IncomingMessage, response: ServerResponse) {
  let payload: ChatRequest
  try {
    payload = JSON.parse(await readBody(request)) as ChatRequest
  } catch {
    sendJson(response, 400, { error: { code: 'INVALID_JSON', message: 'The request body must be valid JSON.' } })
    return
  }

  const messages = payload.messages
  if (!Array.isArray(messages) || messages.length === 0 || messages.length > 40 || messages.some((message) => (
    !message || !['user', 'assistant'].includes(message.role) || typeof message.content !== 'string' || !message.content.trim() || message.content.length > 12000
  ))) {
    sendJson(response, 400, { error: { code: 'VALIDATION_ERROR', message: 'The chat payload is invalid.' } })
    return
  }

  const systemPrompt = buildSystemPrompt()
  const agentMessages = [{ role: 'system', content: systemPrompt }, ...messages] as AgentMessage[]

  if (payload.stream) {
    try {
      await streamAssistant(agentMessages, response, payload.webResearch !== false)
      return
    } catch {
      const lastUser = [...messages].reverse().find((message) => message.role === 'user')?.content ?? ''
      const fallbackContent = generateLocalFallbackResponse(lastUser)
      if (response.headersSent) {
        if (!response.writableEnded) {
          response.write(`data: ${JSON.stringify({ token: fallbackContent })}\n\n`)
          response.write(`data: ${JSON.stringify({ done: true })}\n\n`)
          response.end()
        }
      } else {
        sendJson(response, 200, { message: { role: 'assistant', content: fallbackContent } })
      }
      return
    }
  }

  // Non-stream fallback: try providers sequentially
  if (process.env.GROQ_API_KEY) {
    try {
      const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: process.env.GROQ_MODEL || 'openai/gpt-oss-120b', temperature: 0.2, messages: agentMessages }),
      })
      if (groqResponse.ok) {
        const data = await groqResponse.json() as { choices?: Array<{ message?: { content?: string } }> }
        const content = data.choices?.[0]?.message?.content?.trim()
        if (content) { sendJson(response, 200, { message: { role: 'assistant', content } }); return }
      }
    } catch { /* fallback below */ }
  }

  const geminiText = await tryGemini(agentMessages)
  if (geminiText) { sendJson(response, 200, { message: { role: 'assistant', content: geminiText } }); return }
  const mistralText = await tryMistral(agentMessages)
  if (mistralText) { sendJson(response, 200, { message: { role: 'assistant', content: mistralText } }); return }
  const cerebrasText = await tryCerebras(agentMessages)
  if (cerebrasText) { sendJson(response, 200, { message: { role: 'assistant', content: cerebrasText } }); return }
  const cfText = await tryCloudflare(agentMessages)
  if (cfText) { sendJson(response, 200, { message: { role: 'assistant', content: cfText } }); return }
  const openRouterText = await tryOpenRouter(agentMessages)
  if (openRouterText) { sendJson(response, 200, { message: { role: 'assistant', content: openRouterText } }); return }

  const lastUser = [...messages].reverse().find((m) => m.role === 'user' && typeof m.content === 'string')?.content ?? ''
  const localContent = generateLocalFallbackResponse(typeof lastUser === 'string' ? lastUser : '')
  sendJson(response, 200, { message: { role: 'assistant', content: localContent } })
}
