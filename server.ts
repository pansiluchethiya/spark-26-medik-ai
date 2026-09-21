import 'dotenv/config'
import { createServer } from 'node:http'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { existsSync, readFileSync, statSync } from 'node:fs'
import { join, extname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { sendJson } from './server/helpers.ts'
import { handleChat } from './server/routes/chat.ts'

const port = Number(process.env.DEMO_API_PORT ?? 4100)
const distDir = join(fileURLToPath(new URL('.', import.meta.url)), 'dist')

const mime: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
}

function serveStatic(route: string, response: ServerResponse): boolean {
  if (!existsSync(distDir)) return false
  let filePath = join(distDir, route === '/' ? 'index.html' : route.replace(/^\//, ''))
  try {
    const stat = existsSync(filePath) ? statSync(filePath) : null
    if (stat?.isDirectory()) filePath = join(filePath, 'index.html')
    if (!existsSync(filePath)) {
      // SPA fallback: serve index.html for non-API routes
      if (!route.startsWith('/api/')) {
        const index = join(distDir, 'index.html')
        if (existsSync(index)) {
          const html = readFileSync(index)
          response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache' })
          response.end(html)
          return true
        }
      }
      return false
    }
    const ext = extname(filePath)
    const body = readFileSync(filePath)
    response.writeHead(200, { 'Content-Type': mime[ext] ?? 'application/octet-stream', 'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=31536000, immutable' })
    response.end(body)
    return true
  } catch { return false }
}

createServer(async (request: IncomingMessage, response: ServerResponse) => {
  const rawUrl = request.url ?? '/'
  const parsed = new URL(rawUrl, 'http://localhost')
  const route = parsed.pathname

  if (request.method === 'OPTIONS') {
    response.writeHead(204, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' })
    response.end()
    return
  }

  if (request.method === 'GET' && (route === '/health' || route === '/api/health')) {
    sendJson(response, 200, { ok: true })
    return
  }

  if (request.method === 'POST' && route === '/api/v1/ai/chat') {
    await handleChat(request, response)
    return
  }

  // Try to serve static assets from dist/ when present (integrated deployment)
  if (request.method === 'GET' && serveStatic(route, response)) return

  sendJson(response, 404, { error: { code: 'NOT_FOUND', message: 'Route not found.' } })
}).listen(port, () => {
  console.log(`Medik triage API listening on http://localhost:${port}`)
  if (existsSync(distDir)) console.log(`Serving static from ${distDir} (integrated dist deployment ready for Cloudflare Pages)`)
})
