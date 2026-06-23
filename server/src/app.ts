import express from 'express'
import cookieParser from 'cookie-parser'
import { getContent, sections, sectionRouter } from './sections'
import { requireAuth } from './auth/session'
import { authRouter } from './auth/oauth'
import { prisma } from './db'
import { wrap, errorHandler } from './http'
import { chatRouter } from './chat/router'
import { getChatProvider, type ChatProvider } from './chat/provider'

export function createApp(opts: { chatProvider?: ChatProvider } = {}) {
  const app = express()
  // App Service / Vite dev sit behind a single proxy; trust it so the chat
  // rate limiter keys on the real client IP (X-Forwarded-For).
  app.set('trust proxy', 1)
  // Raise the body limit so a pasted job description fits (default is 100kb).
  app.use(express.json({ limit: '256kb' }))
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

  app.use('/api', chatRouter(opts.chatProvider ?? getChatProvider()))

  app.use('/auth', authRouter)

  app.use(errorHandler)

  return app
}
