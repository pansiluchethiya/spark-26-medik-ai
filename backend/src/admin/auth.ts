import type { NextFunction, Request, Response } from 'express'
import { timingSafeEqual } from 'node:crypto'
import process from 'node:process'

function safeEqual(a: string, b: string) {
  const ba = Buffer.from(a)
  const bb = Buffer.from(b)
  if (ba.length !== bb.length) return false
  return timingSafeEqual(ba, bb)
}

// HTTP Basic Auth for /admin. Credentials come from server-only env vars:
// ADMIN_USER + ADMIN_PASS (never committed, never sent to the browser bundle).
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const expectedUser = process.env.ADMIN_USER?.trim() ?? ''
  const expectedPass = process.env.ADMIN_PASS ?? ''
  const header = req.header('authorization') ?? ''

  let ok = false
  if (expectedUser && expectedPass && header.startsWith('Basic ')) {
    try {
      const decoded = Buffer.from(header.slice(6), 'base64').toString('utf8')
      const sep = decoded.indexOf(':')
      if (sep >= 0) {
        ok = safeEqual(decoded.slice(0, sep), expectedUser) && safeEqual(decoded.slice(sep + 1), expectedPass)
      }
    } catch { ok = false }
  }

  if (!ok) {
    res.setHeader('WWW-Authenticate', 'Basic realm="medik-ai-admin"')
    res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Admin login required.' } })
    return
  }
  next()
}
