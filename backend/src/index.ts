import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import process from 'node:process'
import { chatHourLimiter, chatMinuteLimiter, globalLimiter } from './middleware/rateLimit.ts'
import { handleChat } from './routes/chat.ts'
import { adminRouter } from './routes/admin.ts'
import { clientIp, recordRequest, shouldLog } from './admin/store.ts'

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

// Admin traffic monitor: logs every request (IP, path, status, latency).
// Health checks and the dashboard's own polling are excluded to reduce noise.
app.use((req, res, next) => {
  const start = Date.now()
  // Capture eagerly: Express rewrites req.path/req.url inside mounted
  // routers before 'finish' fires, which would corrupt the log.
  const loggedPath = req.path
  const loggedMethod = req.method
  const fwdHeader = req.header('x-forwarded-for') ?? undefined
  const cfHeader = req.header('cf-connecting-ip') ?? undefined
  const remote = req.socket.remoteAddress
  const ua = (req.header('user-agent') ?? '').slice(0, 200)
  res.on('finish', () => {
    try {
      if (!shouldLog(loggedPath)) return
      const { ip, fwd } = clientIp(fwdHeader, cfHeader, remote)
      recordRequest({
        t: new Date().toISOString(),
        ip,
        fwd,
        method: loggedMethod,
        path: loggedPath,
        status: res.statusCode,
        ms: Date.now() - start,
        ua,
      })
    } catch { /* monitoring must never break responses */ }
  })
  next()
})

const healthPayload = () => ({ ok: true, service: 'medik-ai-backend', time: new Date().toISOString() })
app.get('/health', (_req, res) => res.json(healthPayload()))
app.get('/api/health', (_req, res) => res.json(healthPayload()))

// Spam protection: per-minute burst cap + per-hour sustained cap, on top of global.
app.post('/api/v1/ai/chat', chatMinuteLimiter, chatHourLimiter, handleChat)

// Admin dashboard + JSON stats (Basic Auth via ADMIN_USER / ADMIN_PASS).
app.use('/admin', adminRouter)

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
