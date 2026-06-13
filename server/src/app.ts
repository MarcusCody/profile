import express from 'express'
import cookieParser from 'cookie-parser'
import { getContent, sections, sectionRouter } from './sections'
import { requireAuth } from './auth/session'
import { authRouter } from './auth/oauth'
import { prisma } from './db'
import { wrap, errorHandler } from './http'

export function createApp() {
  const app = express()
  app.use(express.json())
  app.use(cookieParser())

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true })
  })

  app.get(
    '/api/content',
    wrap(async (_req, res) => {
      res.json(await getContent())
    }),
  )

  app.get('/api/me', requireAuth, (req, res) => {
    res.json({ user: (req as any).user })
  })

  app.put(
    '/api/profile',
    requireAuth,
    wrap(async (req, res) => {
      const fields = [
        'name',
        'title',
        'location',
        'email',
        'phone',
        'whatsapp',
        'linkedin',
        'github',
        'summary',
      ]
      const data: any = {}
      for (const f of fields) if (req.body[f] !== undefined) data[f] = req.body[f]
      const updated = await prisma.profile.update({
        where: { id: 'singleton' },
        data,
      })
      res.json(updated)
    }),
  )

  for (const cfg of sections) {
    app.use(`/api/${cfg.path}`, sectionRouter(cfg))
  }

  app.use('/auth', authRouter)

  app.use(errorHandler)

  return app
}
