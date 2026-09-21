import type { AgentMessage } from '../types.ts'
import process from 'node:process'
import { emitWarning } from './events.ts'
import { streamGroqAgent } from './providers_groq.ts'
import { tryGemini } from './providers_rest.ts'
import { generateLocalFallbackResponse } from './fallback.ts'

// Fast failover: Groq -> Gemini -> local fallback only. Others disabled for speed.
export async function streamAssistant(messages: AgentMessage[], response: import('node:http').ServerResponse, webResearch = true): Promise<boolean> {
  const groqApiKey = process.env.GROQ_API_KEY ?? ''
  if (groqApiKey) {
    try { return await streamGroqAgent(messages, response, webResearch) }
    catch (error) { if (response.headersSent && !response.writableEnded) emitWarning(response, `Groq retry: ${error instanceof Error ? error.message : 'request failed'}`) }
  }
  const geminiResult = await tryGemini(messages)
  const lastUserMsg = [...messages].reverse().find((m) => m.role === 'user' && typeof m.content === 'string')?.content ?? ''
  if (geminiResult) return await streamTextResponse(geminiResult, response, 'Gemini Flash', typeof lastUserMsg === 'string' ? lastUserMsg : '')
  const fallbackText = generateLocalFallbackResponse(typeof lastUserMsg === 'string' ? lastUserMsg : '')
  return await streamTextResponse(fallbackText, response, 'Medik Triage Engine', typeof lastUserMsg === 'string' ? lastUserMsg : '')
}

async function streamTextResponse(text: string, response: import('node:http').ServerResponse, providerName = 'Local AI Engine', userPrompt = '') {
  if (!response.headersSent) response.writeHead(200, { 'Content-Type': 'text/event-stream; charset=utf-8', 'Cache-Control': 'no-cache', Connection: 'keep-alive' })
  // No agent steps emission for speed and cleaner UX (removed per request)
  if (providerName === 'Medik Triage Engine') emitWarning(response, 'Using local safety response (providers unavailable).')
  const words = text.split(/(?<=\s+)/)
  for (const word of words) {
    response.write(`data: ${JSON.stringify({ token: word })}\n\n`)
    // minimal delay for smooth streaming but fast overall
    await new Promise((resolve) => setTimeout(resolve, 6))
  }
  response.write(`data: ${JSON.stringify({ done: true })}\n\n`)
  response.end()
  return true
}
