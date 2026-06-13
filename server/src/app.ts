import express from 'express'
import cookieParser from 'cookie-parser'
import { getContent } from './sections'

export function createApp() {
  const app = express()
  app.use(express.json())
  app.use(cookieParser())

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true })
  })

  app.get('/api/content', async (_req, res) => {
    res.json(await getContent())
  })

  return app
}
