import type { Request, Response } from 'express'
import process from 'node:process'
import type { AgentMessage, ChatRequest } from '../lib/types.ts'
import { buildSystemPrompt } from '../tools/prompt.ts'
import { streamAssistant } from '../ai/stream.ts'
import { tryCerebras, tryCloudflare, tryGemini, tryMistral, tryOpenRouter } from '../ai/providers_rest.ts'
import { generateLocalFallbackResponse } from '../ai/fallback.ts'

function isValidPayload(payload: ChatRequest): payload is Required<Pick<ChatRequest, 'messages'>> & ChatRequest {
  const messages = payload.messages
  return Array.isArray(messages)
    && messages.length > 0
    && messages.length <= 40
    && !messages.some((message) => (
      !message || !['user', 'assistant'].includes(message.role) || typeof message.content !== 'string' || !message.content.trim() || message.content.length > 12000
    ))
}

// POST /api/v1/ai/chat — triage/diagnostic chat with streaming + multi-provider failover.
export async function handleChat(req: Request, res: Response) {
  // Optional shared-secret gate (disabled when BACKEND_API_KEY is empty).
  const requiredKey = process.env.BACKEND_API_KEY?.trim()
  if (requiredKey && req.header('x-api-key') !== requiredKey) {
    res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Missing or invalid API key.' } })
    return
  }

  const payload = (req.body ?? {}) as ChatRequest
  if (!isValidPayload(payload)) {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'The chat payload is invalid.' } })
    return
  }

  const messages = payload.messages
  const systemPrompt = buildSystemPrompt()
  const agentMessages = [{ role: 'system', content: systemPrompt }, ...messages] as AgentMessage[]

  if (payload.stream !== false) {
    try {
      await streamAssistant(agentMessages, res, payload.webResearch !== false)
      return
    } catch {
      const lastUser = [...messages].reverse().find((message) => message.role === 'user')?.content ?? ''
      const fallbackContent = generateLocalFallbackResponse(lastUser)
      if (res.headersSent) {
        if (!res.writableEnded) {
          res.write(`data: ${JSON.stringify({ token: fallbackContent })}\n\n`)
          res.write(`data: ${JSON.stringify({ done: true })}\n\n`)
          res.end()
        }
      } else {
        res.status(200).json({ message: { role: 'assistant', content: fallbackContent } })
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
        if (content) { res.status(200).json({ message: { role: 'assistant', content } }); return }
      }
    } catch { /* fallback below */ }
  }

  const geminiText = await tryGemini(agentMessages)
  if (geminiText) { res.status(200).json({ message: { role: 'assistant', content: geminiText } }); return }
  const mistralText = await tryMistral(agentMessages)
  if (mistralText) { res.status(200).json({ message: { role: 'assistant', content: mistralText } }); return }
  const cerebrasText = await tryCerebras(agentMessages)
  if (cerebrasText) { res.status(200).json({ message: { role: 'assistant', content: cerebrasText } }); return }
  const cfText = await tryCloudflare(agentMessages)
  if (cfText) { res.status(200).json({ message: { role: 'assistant', content: cfText } }); return }
  const openRouterText = await tryOpenRouter(agentMessages)
  if (openRouterText) { res.status(200).json({ message: { role: 'assistant', content: openRouterText } }); return }

  const lastUser = [...messages].reverse().find((m) => m.role === 'user' && typeof m.content === 'string')?.content ?? ''
  const localContent = generateLocalFallbackResponse(typeof lastUser === 'string' ? lastUser : '')
  res.status(200).json({ message: { role: 'assistant', content: localContent } })
}
