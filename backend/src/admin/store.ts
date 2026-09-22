import os from 'node:os'
import { readFileSync } from 'node:fs'

export type RequestRecord = {
  t: string
  ip: string
  fwd: string
  method: string
  path: string
  status: number
  ms: number
  ua: string
}

const MAX_RECENT = 500
const MAX_IPS = 5000

const recent: RequestRecord[] = []
const ipHits = new Map<string, number>()
const pathHits = new Map<string, number>()
const startedAt = Date.now()

let totalRequests = 0
let chatRequests = 0
let rateLimitedResponses = 0
let unauthorizedResponses = 0

// Paths excluded from the log (healthcheck + dashboard polling noise).
const SKIP_PATHS = new Set([
  '/health',
  '/api/health',
  '/admin/api/stats',
  '/admin/manifest.webmanifest',
  '/admin/sw.js',
  '/admin/icon-192.png',
  '/admin/icon-512.png',
  '/admin/maskable-512.png',
])

export function shouldLog(path: string) {
  return !SKIP_PATHS.has(path)
}

// Resolve the real client IP behind Caddy (and Cloudflare, if ever proxied).
export function clientIp(forwardedFor: string | undefined, cfIp: string | undefined, socketIp: string | undefined): { ip: string; fwd: string } {
  const fwd = (forwardedFor ?? '').trim()
  if (cfIp?.trim()) return { ip: cfIp.trim(), fwd: fwd || cfIp.trim() }
  if (fwd) return { ip: fwd.split(',')[0].trim(), fwd }
  return { ip: (socketIp ?? 'unknown').replace(/^::ffff:/, ''), fwd: '' }
}

export function recordRequest(entry: RequestRecord) {
  totalRequests += 1
  if (entry.method === 'POST' && entry.path === '/api/v1/ai/chat') chatRequests += 1
  if (entry.status === 429) rateLimitedResponses += 1
  if (entry.status === 401) unauthorizedResponses += 1

  pathHits.set(entry.path, (pathHits.get(entry.path) ?? 0) + 1)
  if (ipHits.size < MAX_IPS || ipHits.has(entry.ip)) {
    ipHits.set(entry.ip, (ipHits.get(entry.ip) ?? 0) + 1)
  }

  recent.push(entry)
  if (recent.length > MAX_RECENT) recent.splice(0, recent.length - MAX_RECENT)
}

export function snapshot() {
  const topIps = [...ipHits.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .map(([ip, hits]) => ({ ip, hits }))
  return {
    uptimeSec: Math.floor((Date.now() - startedAt) / 1000),
    totalRequests,
    chatRequests,
    rateLimitedResponses,
    unauthorizedResponses,
    uniqueIps: ipHits.size,
    topIps,
    perPath: Object.fromEntries(pathHits),
    recent: [...recent].reverse(),
  }
}

// ---- System stats (process + host + container) ----

let lastCpu = process.cpuUsage()
let lastCpuAt = Date.now()

function readFirstLine(path: string): string | null {
  try { return readFileSync(path, 'utf8').split('\n')[0].trim() } catch { return null }
}

function containerMemory(): { current: number; max: number | null } | null {
  // cgroup v2
  const cur = readFirstLine('/sys/fs/cgroup/memory.current')
  if (cur !== null && /^\d+$/.test(cur)) {
    const maxRaw = readFirstLine('/sys/fs/cgroup/memory.max')
    const max = maxRaw !== null && /^\d+$/.test(maxRaw) ? Number(maxRaw) : null
    return { current: Number(cur), max }
  }
  // cgroup v1 fallback
  const curV1 = readFirstLine('/sys/fs/cgroup/memory/memory.usage_in_bytes')
  if (curV1 !== null && /^\d+$/.test(curV1)) {
    const maxV1 = readFirstLine('/sys/fs/cgroup/memory/memory.limit_in_bytes')
    const max = maxV1 !== null && /^\d+$/.test(maxV1) ? Number(maxV1) : null
    return { current: Number(curV1), max: max !== null && max > 1e15 ? null : max }
  }
  return null
}

export function systemStats() {
  const now = Date.now()
  const cpu = process.cpuUsage(lastCpu)
  const elapsedMicros = Math.max(1, (now - lastCpuAt) * 1000)
  const cpuPercent = ((cpu.user + cpu.system) / elapsedMicros) * 100
  lastCpu = process.cpuUsage()
  lastCpuAt = now

  const mem = process.memoryUsage()
  return {
    process: {
      rss: mem.rss,
      heapUsed: mem.heapUsed,
      heapTotal: mem.heapTotal,
      cpuPercent: Math.round(cpuPercent * 10) / 10,
    },
    host: {
      totalMem: os.totalmem(),
      freeMem: os.freemem(),
      loadAvg: os.loadavg(),
      cpuCount: os.cpus().length,
    },
    container: containerMemory(),
  }
}
