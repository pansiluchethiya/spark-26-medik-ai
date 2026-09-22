import { Router, type NextFunction, type Request, type Response } from 'express'
import { requireAdmin } from '../admin/auth.ts'
import { adminPage } from '../admin/page.ts'
import { snapshot, systemStats } from '../admin/store.ts'

export const adminRouter = Router()

// The dashboard is a self-contained page with inline script/style, served
// over plain HTTP (bare IP, no TLS yet). Helmet's defaults would break it:
// - `script-src 'self'` blocks the inline script → blank dashboard, and
// - COOP / Origin-Agent-Cluster are ignored with warnings on untrustworthy
//   (non-HTTPS) origins.
// So relax exactly these headers for /admin only; the API keeps strict ones.
adminRouter.use((_req: Request, res: Response, next: NextFunction) => {
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'self'",
  )
  res.removeHeader('Cross-Origin-Opener-Policy')
  res.removeHeader('Origin-Agent-Cluster')
  next()
})

adminRouter.use(requireAdmin)

adminRouter.get('/', (_req: Request, res: Response) => {
  res.type('html').send(adminPage())
})

adminRouter.get('/api/stats', (_req: Request, res: Response) => {
  res.json({ ...snapshot(), system: systemStats(), time: new Date().toISOString() })
})
