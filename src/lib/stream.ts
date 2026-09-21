import type { AgentStep, AgentToolEvent, ChatMessage, VerifiedSource } from '../types/app'

export const maxRenderTokensPerSecond = 300

export async function readAssistantStream(
  response: Response,
  onToken: (token: string) => void,
  onStep?: (step: AgentStep) => void,
  onTool?: (tool: AgentToolEvent) => void,
  onWarning?: (warning: string) => void,
  onSources?: (sources: VerifiedSource[]) => void,
  onRoles?: (roles: string[]) => void,
  options?: { signal?: AbortSignal },
) {
  if (response.headers.get('content-type')?.includes('application/json')) {
    const data = await response.json() as { message?: ChatMessage; error?: { message?: string } }
    if (!data.message?.content) throw new Error(data.error?.message ?? 'The health assistant returned an empty response.')
    onToken(data.message.content)
    return data.message.content
  }
  if (!response.body) throw new Error('The health assistant did not return a readable stream.')
  const reader = response.body.getReader()
  const signal = options?.signal
  const onAbort = () => { reader.cancel().catch(() => { /* stream already closed */ }) }
  if (signal) {
    if (signal.aborted) throw new DOMException('Stopped', 'AbortError')
    signal.addEventListener('abort', onAbort, { once: true })
  }
  const decoder = new TextDecoder()
  const pendingTokens: string[] = []
  let buffer = ''
  let answer = ''
  let streamEnded = false
  let resolveDrain: (() => void) | undefined
  const drain = new Promise<void>((resolve) => { resolveDrain = resolve })
  const flushToken = () => {
    const batch = pendingTokens.splice(0, Math.ceil(maxRenderTokensPerSecond / 30)).join('')
    if (batch) onToken(batch)
    if (streamEnded && pendingTokens.length === 0) resolveDrain?.()
  }
  const timer = window.setInterval(flushToken, 1000 / 30)
  const queueText = (text: string) => {
    answer += text
    pendingTokens.push(...(text.match(/\S+\s*|\s+/g) ?? [text]))
  }
  try {
    while (true) {
      let read: ReadableStreamReadResult<Uint8Array>
      try {
        read = await reader.read()
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') break
        if (signal?.aborted) break
        throw error
      }
      const { value, done } = read
      buffer += decoder.decode(value, { stream: !done })
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue
        const event = JSON.parse(line.slice(6)) as { token?: string; step?: AgentStep; tool?: AgentToolEvent; warning?: string; sources?: VerifiedSource[]; activeRoles?: string[]; done?: boolean; error?: string }
        if (event.error) throw new Error(event.error)
        if (event.step && onStep) onStep(event.step)
        if (event.tool && onTool) onTool(event.tool)
        if (event.warning && onWarning) onWarning(event.warning)
        if (event.sources && onSources) onSources(event.sources)
        if (event.activeRoles && onRoles) onRoles(event.activeRoles)
        if (event.token) queueText(event.token)
        if (event.done) streamEnded = true
      }
      if (done) break
    }
    streamEnded = true
    if (pendingTokens.length > 0) await drain
    if (signal?.aborted) throw new DOMException('Stopped', 'AbortError')
    return answer
  } finally {
    signal?.removeEventListener('abort', onAbort)
    window.clearInterval(timer)
  }
}
