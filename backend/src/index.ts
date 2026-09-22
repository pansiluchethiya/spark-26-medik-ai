import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import process from 'node:process'
import { chatHourLimiter, chatMinuteLimiter, globalLimiter } from './middleware/rateLimit.ts'
import { handleChat } from './routes/chat.ts'

const app = express()
// Behind Caddy (reverse proxy) — needed so rate limiting sees the real client IP.
app.set('trust proxy', 1)

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }))

// CORS: comma-separated origins in FRONTEND_URL, or * (reflect any origin).
// No cookies/credentials are used, so reflecting is safe.
const frontendEnv = (process.env.FRONTEND_URL ?? '*').trim()
if (frontendEnv === '' || frontendEnv === '*') {
  app.use(cors({ origin: true }))
} else {
  const allowed = frontendEnv.split(',').map((s) => s.trim()).filter(Boolean)
  app.use(cors({
    origin: (origin, cb) => {
      if (!origin || allowed.includes(origin)) cb(null, true)
      else cb(new Error('CORS blocked'))
    },
  }))
}

app.use(morgan('combined'))
app.use(globalLimiter)
app.use(express.json({ limit: '1mb' }))

const healthPayload = () => ({ ok: true, service: 'medik-ai-backend', time: new Date().toISOString() })
app.get('/health', (_req, res) => res.json(healthPayload()))
app.get('/api/health', (_req, res) => res.json(healthPayload()))

// Spam protection: per-minute burst cap + per-hour sustained cap, on top of global.
app.post('/api/v1/ai/chat', chatMinuteLimiter, chatHourLimiter, handleChat)

app.use((_req, res) => res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Route not found.' } }))

// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (err instanceof SyntaxError && 'body' in (err as unknown as Record<string, unknown>)) {
    res.status(400).json({ error: { code: 'INVALID_JSON', message: 'The request body must be valid JSON.' } })
    return
  }
  console.error(err)
  if (!res.headersSent) res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'The triage service failed unexpectedly.' } })
})

const port = Number(process.env.PORT ?? 4100)
app.listen(port, () => {
  console.log(`medik-ai-backend listening on :${port}`)
})
