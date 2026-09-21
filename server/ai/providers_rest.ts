import type { AgentMessage } from '../types.ts'
import process from 'node:process'
import { providerFetch } from './infra.ts'

// Unary (non-streaming) provider attempts used as failover legs.
export async function tryGemini(messages: AgentMessage[]) {
  const apiKey = process.env.GEMINI_API_KEY || ''
  if (!apiKey) return null
  try {
    const contents = messages
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .map((m) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: typeof m.content === 'string' ? m.content : '' }]
      }))
    const systemContent = messages.find((m) => m.role === 'system')?.content
    const payload: { contents: Array<{ role: string; parts: Array<{ text: string }> }>; systemInstruction?: { parts: Array<{ text: string }> } } = { contents }
    if (typeof systemContent === 'string' && systemContent.trim()) {
      payload.systemInstruction = { parts: [{ text: systemContent }] }
    }
    const res = await providerFetch('Gemini', `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!res?.ok) return null
    const data = await res.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> }
    return data?.candidates?.[0]?.content?.parts?.[0]?.text || null
  } catch {
    return null
  }
}

export async function tryMistral(messages: AgentMessage[]) {
  const apiKey = process.env.MISTRAL_API_KEY || ''
  if (!apiKey) return null
  try {
    const formatted = messages.filter((m) => typeof m.content === 'string').map((m) => ({ role: m.role, content: m.content }))
    const res = await providerFetch('Mistral', 'https://api.mistral.ai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ model: process.env.MISTRAL_MODEL || 'mistral-small-latest', messages: formatted }),
    })
    if (!res?.ok) return null
    const data = await res.json() as { choices?: Array<{ message?: { content?: string } }> }
    return data?.choices?.[0]?.message?.content || null
  } catch {
    return null
  }
}

export async function tryCerebras(messages: AgentMessage[]) {
  const apiKey = process.env.CEREBRAS_API_KEY || ''
  if (!apiKey) return null
  try {
    const formatted = messages.filter((m) => typeof m.content === 'string').map((m) => ({ role: m.role, content: m.content }))
    const res = await providerFetch('Cerebras', 'https://api.cerebras.ai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ model: process.env.CEREBRAS_MODEL || 'llama-3.3-70b', messages: formatted }),
    })
    if (!res?.ok) return null
    const data = await res.json() as { choices?: Array<{ message?: { content?: string } }> }
    return data?.choices?.[0]?.message?.content || null
  } catch {
    return null
  }
}

export async function tryCloudflare(messages: AgentMessage[]) {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID || ''
  const apiToken = process.env.CLOUDFLARE_API_TOKEN || ''
  if (!accountId || !apiToken) return null
  try {
    const formatted = messages.filter((m) => typeof m.content === 'string').map((m) => ({ role: m.role, content: m.content }))
    const model = process.env.CLOUDFLARE_MODEL || '@cf/meta/llama-3.3-70b-instruct-fp8'
    const res = await providerFetch('Cloudflare', `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${model}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiToken}` },
      body: JSON.stringify({ messages: formatted }),
    })
    if (!res?.ok) return null
    const data = await res.json() as { result?: { response?: string } }
    return data?.result?.response || null
  } catch {
    return null
  }
}

export async function tryOpenRouter(messages: AgentMessage[]) {
  const apiKey = process.env.OPENROUTER_API_KEY || ''
  try {
    const formatted = messages.filter((m) => typeof m.content === 'string').map((m) => ({ role: m.role, content: m.content }))
    const res = await providerFetch('OpenRouter', 'https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
        'HTTP-Referer': 'http://localhost:3456',
        'X-Title': 'Medik Health Demo',
      },
      body: JSON.stringify({ model: process.env.OPENROUTER_MODEL || 'meta-llama/llama-3.3-70b-instruct:free', messages: formatted }),
    })
    if (!res?.ok) return null
    const data = await res.json() as { choices?: Array<{ message?: { content?: string } }> }
    return data?.choices?.[0]?.message?.content || null
  } catch {
    return null
  }
}
