import { rateLimit } from 'express-rate-limit'

function num(name: string, fallback: number) {
  const raw = Number(process.env[name])
  return Number.isFinite(raw) && raw > 0 ? raw : fallback
}

function tooManyJson(message: string) {
  return {
    // Express-rate-limit v7 handler signature
    handler: (_req: unknown, res: { status(n: number): { json(b: unknown): unknown } }, _next: unknown, options: { statusCode: number }) => {
      res.status(options.statusCode).json({ error: { code: 'RATE_LIMITED', message } })
    },
  }
}

// Spam protection layers (all per-IP, in-memory):
// 1. Global limiter — generous ceiling across every route.
// 2. Chat per-minute — tight burst cap on the expensive AI endpoint.
// 3. Chat per-hour — sustained-abuse cap on the AI endpoint.
export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: num('RATE_LIMIT_GLOBAL_PER_15MIN', 600),
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  ...tooManyJson('Too many requests. Please slow down and try again in a few minutes.'),
})

export const chatMinuteLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: num('RATE_LIMIT_CHAT_PER_MINUTE', 20),
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  ...tooManyJson('Too many chat requests. Please wait a minute before trying again.'),
})

export const chatHourLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: num('RATE_LIMIT_CHAT_PER_HOUR', 200),
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  ...tooManyJson('Hourly chat quota reached. Please try again later.'),
})
