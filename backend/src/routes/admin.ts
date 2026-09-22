import { Router, type NextFunction, type Request, type Response } from 'express'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { requireAdmin } from '../admin/auth.ts'
import { adminPage } from '../admin/page.ts'
import { adminManifest, adminServiceWorker } from '../admin/pwa.ts'
import { snapshot, systemStats } from '../admin/store.ts'

const assetsDir = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'assets')

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

// Public PWA files (no auth — they contain no sensitive data, and the
// manifest/icons/SW must be fetchable for installability checks).
adminRouter.get('/manifest.webmanifest', (_req: Request, res: Response) => {
  res.json(adminManifest())
})

adminRouter.get('/sw.js', (_req: Request, res: Response) => {
  res.type('js').setHeader('Service-Worker-Allowed', '/admin/').send(adminServiceWorker())
})

for (const icon of ['icon-192.png', 'icon-512.png', 'maskable-512.png']) {
  adminRouter.get(`/${icon}`, (_req: Request, res: Response) => {
    res.sendFile(join(assetsDir, icon))
  })
}

adminRouter.use(requireAdmin)

adminRouter.get('/', (_req: Request, res: Response) => {
  res.type('html').send(adminPage())
})

adminRouter.get('/api/stats', (_req: Request, res: Response) => {
  res.json({ ...snapshot(), system: systemStats(), time: new Date().toISOString() })
})
