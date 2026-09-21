// Cloudflare Pages Function: POST /api/v1/ai/chat
// Edge-compatible triage handler with web_search. Mirrors server/routes/chat.ts + ai/stream.ts
// This allows `dist/` to be deployed to Cloudflare Pages with API co-located.
// Optimized for speed: 1 web_search max, 2 rounds, 6ms streaming.

type ChatMessage = { role: 'user' | 'assistant'; content: string }
type ChatRequest = { messages?: ChatMessage[]; stream?: boolean }

function buildSystemPrompt() {
  return `You are Medik Triage AI — fast, calm, concise diagnostic and triage assistant.
Core task: user describes symptoms/history/"what is wrong with me". Provide evidence-informed differential + triage.
RULES (speed-optimized):
1. Not a clinician replacement — one-line disclaimer each answer.
2. Never prescribe/dose. General info only.
3. Concise: total <280 words, bullets, no filler.
4. REQUIRED SECTIONS (exact tags, order):
   [SECTION:assessment] 2-4 likely categories + 1 clarifying question
   [SECTION:urgent] 2-3 red flags, or "No classic red flags described, but seek care if…"
   [SECTION:selfcare] 3 practical next steps
   [SECTION:sources] 2-3 bullet URLs actually returned by web_search (or WHO/CDC/MedlinePlus if offline)
5. Call web_search ONCE per user turn (max 3 results) for any medical claim that could change with guidelines. Prefer WHO, CDC, Mayo Clinic, NHS.
6. Do not fabricate citations. If tool fails, list general reputable refs and note general.
7. Tone: supportive, plain language, non-alarmist.`
}

function cleanText(value: string, limit: number) { return value.replace(/\s+/g, ' ').trim().slice(0, limit) }
function htmlToText(html: string) {
  return cleanText(html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>'), 7000)
}
function safePublicUrl(value: string) {
  try {
    const url = new URL(value)
    if (!['http:', 'https:'].includes(url.protocol)) return null
    const host = url.hostname.toLowerCase()
    if (host === 'localhost' || host === '::1' || host.startsWith('127.')) return null
    if (host.startsWith('10.') || host.startsWith('192.168.') || /^172\.(1[6-9]|2\d|3[0-1])\./.test(host)) return null
    if (host.startsWith('169.254.')) return null
    return url
  } catch { return null }
}

async function webSearch(query: string, env: Record<string, string>) {
  const searchQuery = cleanText(query, 120)
  if (!searchQuery) return { error: 'Search query is empty.' }
  const tavilyKey = env.TAVILY_API_KEY || (typeof process !== 'undefined' ? (process as unknown as { env?: Record<string,string> }).env?.TAVILY_API_KEY : '') || ''
  if (tavilyKey) {
    try {
      const res = await fetch('https://api.tavily.com/search', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ api_key: tavilyKey, query: searchQuery, search_depth: 'basic', include_answer: false, max_results: 3 })
      })
      if (res.ok) {
        const data = await res.json() as { results?: Array<{ title: string; url: string; content: string; published_date?: string }> }
        return { query: searchQuery, provider: 'Tavily Search API', results: (data.results || []).slice(0,3).map(r => ({ title: r.title, url: r.url, snippet: r.content.slice(0,280), publishedDate: r.published_date || undefined })) }
      }
    } catch { /* fallback */ }
  }
  try {
    const response = await fetch(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(searchQuery)}`, { headers: { 'User-Agent': 'MedikHealthDemo/1.0 (medical research assistant)' }, signal: AbortSignal.timeout(5000) as unknown as AbortSignal })
    if (!response.ok) return { error: `Search provider returned HTTP ${response.status}.` }
    const html = await response.text()
    const matches = [...html.matchAll(/<a[^>]+class="result__a"[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?<a[^>]+class="result__snippet"[^>]*>([\s\S]*?)<\/a>/gi)]
      .slice(0, 4).map(match => {
        let url = match[1]
        if (url.includes('uddg=')) { const m = url.match(/uddg=([^&]+)/); if (m) url = decodeURIComponent(m[1]) }
        const isOfficialMedical = /who\.int|cdc\.gov|mayoclinic\.org|nih\.gov|nhs\.uk/i.test(url)
        return { title: htmlToText(match[2]), url, snippet: htmlToText(match[3]).slice(0,260), isOfficialMedical }
      })
    const results = matches.sort((a, b) => (b.isOfficialMedical ? 1 : 0) - (a.isOfficialMedical ? 1 : 0)).slice(0, 3)
    return { query: searchQuery, provider: 'DuckDuckGo Live Search Engine', results }
  } catch { return { query: searchQuery, results: [], error: 'Web search engine is currently unreachable.' } }
}

async function fetchWebPage(value: string) {
  const url = safePublicUrl(value)
  if (!url) return { error: 'Only public HTTP(S) pages can be fetched.' }
  try {
    const res = await fetch(url.href, { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(5000) as unknown as AbortSignal })
    if (!res.ok) return { url: url.href, error: `Page returned HTTP ${res.status}.` }
    const body = await res.text()
    const titleMatch = body.match(/<title[^>]*>([\s\S]*?)<\/title>/i)
    const title = titleMatch ? htmlToText(titleMatch[1]) : url.hostname
    const text = htmlToText(body).slice(0, 5000)
    return { url: url.href, article: { title, text } }
  } catch { return { url: url!.href, error: 'Webpage fetch timed out.' } }
}

const researchToolSchemas = [
  { type: 'function', function: { name: 'web_search', description: 'Search the live web for current medical information. Use once per turn.', parameters: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'], additionalProperties: false } } },
]

async function executeTool(name: string, rawArgs: string, env: Record<string, string>) {
  let args: Record<string, string> = {}
  try { args = JSON.parse(rawArgs) } catch { return { error: 'Tool arguments invalid JSON' } }
  if (name === 'web_search') return await webSearch(args.query ?? '', env)
  if (name === 'fetch_web_page') return await fetchWebPage(args.url ?? '')
  return { error: `Unknown tool ${name}` }
}

function fallbackResponse(prompt: string): string {
  const asksBreathing = /(trouble breathing|difficulty breathing|shortness of breath|can't breathe)/i.test(prompt)
  return `[SECTION:assessment]\n- Based on your description, a clinician would want more detail: onset, duration, severity, triggers, prior conditions, medications, allergies, and associated symptoms.\n- This information is educational and not a diagnosis. A primary-care clinician or urgent-care visit is the right next step.\n${asksBreathing ? '- Because breathing difficulty was mentioned, seek prompt in-person assessment if worsening.' : ''}\n\n[SECTION:urgent]\n- Seek urgent help for: chest pain/pressure, severe shortness of breath, fainting, heavy bleeding, sudden weakness/speech changes, or high fever that does not improve.\n\n[SECTION:selfcare]\n- Track symptoms: when they started, what makes them better/worse, recent exposures, medications, and vital signs if available.\n- Avoid starting/stopping prescription medicines without clinician guidance.\n\n[SECTION:sources]\n- WHO: https://www.who.int\n- CDC: https://www.cdc.gov\n- NIH MedlinePlus: https://medlineplus.gov`
}

function getEnv(context: unknown, key: string): string {
  try {
    const ctx = context as { env?: Record<string, string> }
    if (ctx?.env?.[key]) return ctx.env[key]
    // @ts-expect-error
    if (typeof process !== 'undefined' && process.env?.[key]) return process.env[key]
  } catch {}
  return ''
}

export async function onRequest(context: { request: Request; env?: Record<string, string>; waitUntil?: (p: Promise<unknown>) => void }) {
  const { request } = context
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' } })
  if (request.method !== 'POST') return new Response(JSON.stringify({ error: { message: 'Method not allowed' } }), { status: 405, headers: { 'Content-Type': 'application/json' } })

  let payload: ChatRequest
  try { payload = await request.json() as ChatRequest } catch { return new Response(JSON.stringify({ error: { code: 'INVALID_JSON', message: 'Invalid JSON' } }), { status: 400, headers: { 'Content-Type': 'application/json' } }) }
  const messages = payload.messages
  if (!Array.isArray(messages) || messages.length === 0 || messages.some(m => !m || !['user','assistant'].includes(m.role) || typeof m.content !== 'string' || !m.content.trim() || m.content.length > 12000)) {
    return new Response(JSON.stringify({ error: { code: 'VALIDATION_ERROR', message: 'Invalid payload' } }), { status: 400, headers: { 'Content-Type': 'application/json' } })
  }

  const env = (context.env ?? {}) as Record<string, string>
  const groqKey = getEnv(context, 'GROQ_API_KEY')
  const groqModel = getEnv(context, 'GROQ_MODEL') || 'openai/gpt-oss-120b'
  const lastUser = [...messages].reverse().find(m => m.role === 'user')?.content ?? ''
  const systemPrompt = buildSystemPrompt()
  const agentMessages = [{ role: 'system', content: systemPrompt }, ...messages]

  const stream = payload.stream !== false

  if (!groqKey) {
    const fallback = fallbackResponse(lastUser)
    if (!stream) return new Response(JSON.stringify({ message: { role: 'assistant', content: fallback } }), { headers: { 'Content-Type': 'application/json' } })
    const encoder = new TextEncoder()
    const readable = new ReadableStream({
      async start(controller) {
        const send = (obj: unknown) => controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`))
        send({ warning: 'Providers unavailable. Returning safety response.' })
        for (const chunk of fallback.split(/(?<=\s+)/)) { send({ token: chunk }); await new Promise(r => setTimeout(r, 6)) }
        send({ done: true }); controller.close()
      }
    })
    return new Response(readable, { headers: { 'Content-Type': 'text/event-stream; charset=utf-8', 'Cache-Control': 'no-cache', 'Access-Control-Allow-Origin': '*' } })
  }

  if (stream) {
    const encoder = new TextEncoder()
    const readable = new ReadableStream({
      async start(controller) {
        const send = (obj: unknown) => controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`))
        try {
          const conversation: unknown[] = [...agentMessages]
          let answer = ''
          let toolsUsed = 0
          for (let round = 0; round < 2; round++) {
            const body: Record<string, unknown> = { model: groqModel, temperature: 0.2, stream: true, messages: conversation, max_tokens: 700 }
            if (toolsUsed === 0) body.tools = researchToolSchemas as unknown
            else body.tool_choice = 'none'
            const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
              method: 'POST', headers: { Authorization: `Bearer ${groqKey}`, 'Content-Type': 'application/json' },
              body: JSON.stringify(body)
            })
            if (!res.ok || !res.body) throw new Error(`Groq HTTP ${res.status}`)
            const reader = res.body.getReader()
            const decoder = new TextDecoder()
            let buffer = ''
            let finished = false
            let receivedContent = false
            const toolCalls = new Map<number, { id: string; type: 'function'; function: { name: string; arguments: string } }>()
            while (!finished) {
              const { value, done } = await reader.read()
              buffer += decoder.decode(value, { stream: !done })
              const lines = buffer.split('\n'); buffer = lines.pop() ?? ''
              for (const line of lines) {
                if (!line.startsWith('data: ')) continue
                const val = line.slice(6).trim()
                if (val === '[DONE]') { finished = true; break }
                try {
                  const parsed = JSON.parse(val) as { choices?: Array<{ delta?: { content?: string; tool_calls?: Array<{ index?: number; id?: string; function?: { name?: string; arguments?: string } }> } }> }
                  const delta = parsed.choices?.[0]?.delta
                  if (delta?.content) { receivedContent = true; answer += delta.content; send({ token: delta.content }) }
                  for (const item of delta?.tool_calls ?? []) {
                    if (toolsUsed >= 1) continue
                    const idx = item.index ?? 0
                    const cur = toolCalls.get(idx) ?? { id: item.id ?? `tool-${round}-${idx}`, type: 'function' as const, function: { name: '', arguments: '' } }
                    if (item.id) cur.id = item.id
                    if (item.function?.name) cur.function.name += item.function.name
                    if (item.function?.arguments) cur.function.arguments += item.function.arguments
                    toolCalls.set(idx, cur)
                  }
                } catch {}
              }
              if (done) finished = true
            }
            const completed = [...toolCalls.values()].slice(0,1)
            if (completed.length === 0) { if (!receivedContent) throw new Error('Empty response'); break }
            toolsUsed += completed.length
            // @ts-expect-error
            conversation.push({ role: 'assistant', content: answer || null, tool_calls: completed })
            for (const call of completed) {
              send({ tool: { id: call.id, name: call.function.name, arguments: call.function.arguments, status: 'running' } })
              const result = await executeTool(call.function.name, call.function.arguments, env)
              send({ tool: { id: call.id, name: call.function.name, result, status: 'completed' } })
              // @ts-expect-error
              conversation.push({ role: 'tool', tool_call_id: call.id, content: JSON.stringify(result) })
              const resAny = result as Record<string, unknown>
              const arr = (resAny?.results ?? []) as Array<{ title?: string; url?: string }>
              const verified = arr.slice(0,3).map((item) => {
                if (!item?.url) return null
                try { const host = new URL(item.url).hostname.replace(/^www\./,''); return { id: item.url, title: item.title || 'Clinical Reference', url: item.url, domain: host, quality: host.includes('.gov')||host.includes('who.int') ? 'High':'Verified', type: 'official' } } catch { return null }
              }).filter(Boolean)
              if (verified.length) send({ sources: verified })
            }
            if (toolsUsed >= 1) continue
          }
          send({ done: true }); controller.close()
        } catch (e) {
          const msg = e instanceof Error ? e.message : 'Request failed'
          try { send({ warning: msg }); const fb = fallbackResponse(lastUser); for (const c of fb.split(/(?<=\s+)/)) { send({ token: c }); await new Promise(r=>setTimeout(r,6)) } send({ done: true }); controller.close() } catch { controller.error(e) }
        }
      }
    })
    return new Response(readable, { headers: { 'Content-Type': 'text/event-stream; charset=utf-8', 'Cache-Control': 'no-cache', Connection: 'keep-alive', 'Access-Control-Allow-Origin': '*' } })
  }

  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST', headers: { Authorization: `Bearer ${groqKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: groqModel, temperature: 0.2, messages: agentMessages, max_tokens: 700 })
    })
    if (res.ok) {
      const data = await res.json() as { choices?: Array<{ message?: { content?: string } }> }
      const content = data.choices?.[0]?.message?.content?.trim()
      if (content) return new Response(JSON.stringify({ message: { role: 'assistant', content } }), { headers: { 'Content-Type': 'application/json' } })
    }
  } catch {}
  return new Response(JSON.stringify({ message: { role: 'assistant', content: fallbackResponse(lastUser) } }), { headers: { 'Content-Type': 'application/json' } })
}
