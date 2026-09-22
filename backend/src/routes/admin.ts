import { Router, type Request, type Response } from 'express'
import { requireAdmin } from '../admin/auth.ts'
import { adminPage } from '../admin/page.ts'
import { snapshot, systemStats } from '../admin/store.ts'

export const adminRouter = Router()

adminRouter.use(requireAdmin)

adminRouter.get('/', (_req: Request, res: Response) => {
  res.type('html').send(adminPage())
})

adminRouter.get('/api/stats', (_req: Request, res: Response) => {
  res.json({ ...snapshot(), system: systemStats(), time: new Date().toISOString() })
})
