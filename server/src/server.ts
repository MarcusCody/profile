import 'dotenv/config'
import path from 'node:path'
import express from 'express'
import { createApp } from './app'
import { config } from './config'

const app = createApp()

if (process.env.NODE_ENV === 'production') {
  const distDir = path.resolve(__dirname, '../../dist')
  app.use(express.static(distDir))
  // Unknown API/auth routes must 404 as JSON, not fall through to the SPA HTML
  // (which would mask real 404s by returning index.html with a 200).
  app.all(['/api/*', '/auth/*'], (_req, res) => {
    res.status(404).json({ error: 'not_found' })
  })
  app.get('*', (_req, res) => {
    res.sendFile(path.join(distDir, 'index.html'))
  })
}

app.listen(config.port, () => {
  console.log(`API listening on http://localhost:${config.port}`)
})
