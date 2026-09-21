import process from 'node:process'

// Fast path: 1 retry, 12s timeout by default. Override via env if needed.
const providerCooldowns = new Map<string, number>()
const providerAttempts = Math.max(1, Math.min(2, Number(process.env.AI_PROVIDER_ATTEMPTS ?? 2)))
const providerTimeoutMs = Math.max(4000, Math.min(15000, Number(process.env.AI_PROVIDER_TIMEOUT_MS ?? 12000)))

function retryDelay(response: Response | null, attempt: number) {
  const retryAfter = response?.headers.get('retry-after')
  const retrySeconds = retryAfter ? Number(retryAfter) : NaN
  const serverDelay = Number.isFinite(retrySeconds) ? retrySeconds * 1000 : 0
  return Math.min(4000, Math.max(serverDelay, 250 * (2 ** attempt)) + Math.round(Math.random() * 100))
}

export async function providerFetch(provider: string, input: string | URL, init: RequestInit = {}) {
  const cooldownUntil = providerCooldowns.get(provider) ?? 0
  if (cooldownUntil > Date.now()) return null
  for (let attempt = 0; attempt < providerAttempts; attempt += 1) {
    let result: Response | null = null
    try {
      result = await fetch(input, { ...init, signal: AbortSignal.timeout(providerTimeoutMs) })
      if (result.ok) { providerCooldowns.delete(provider); return result }
      const retryable = result.status === 429 || result.status >= 500
      if (!retryable || attempt === providerAttempts - 1) {
        if (result.status === 429) providerCooldowns.set(provider, Date.now() + Math.min(30000, retryDelay(result, attempt) * 2))
        return result
      }
    } catch {
      if (attempt === providerAttempts - 1) return null
    }
    await new Promise((resolve) => setTimeout(resolve, retryDelay(result, attempt)))
  }
  return null
}
