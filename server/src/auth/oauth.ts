import { randomUUID } from 'node:crypto'
import { Router } from 'express'
import type { Response } from 'express'
import { config } from '../config'
import { signSession, SESSION_COOKIE, type SessionUser } from './session'

const STATE_COOKIE = 'oauth_state'

function setState(res: Response, state: string) {
  res.cookie(STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: 'lax',
    secure: config.isHttps,
    maxAge: 10 * 60 * 1000,
  })
}

function finishLogin(res: Response, user: SessionUser) {
  if (!user.email || !config.allowedEmails.includes(user.email.toLowerCase())) {
    res.status(403).send('Access denied: this account is not allowed.')
    return
  }
  const token = signSession(user)
  res.cookie(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: config.isHttps,
    maxAge: 30 * 24 * 60 * 60 * 1000,
  })
  res.redirect('/admin')
}

export const authRouter = Router()

// --- GitHub ---
authRouter.get('/github', (_req, res) => {
  const state = randomUUID()
  setState(res, state)
  const url = new URL('https://github.com/login/oauth/authorize')
  url.searchParams.set('client_id', config.github.clientId)
  url.searchParams.set('redirect_uri', `${config.appUrl}/auth/github/callback`)
  url.searchParams.set('scope', 'read:user user:email')
  url.searchParams.set('state', state)
  res.redirect(url.toString())
})

authRouter.get('/github/callback', async (req, res) => {
  const { code, state } = req.query
  if (!code || state !== req.cookies?.[STATE_COOKIE]) {
    res.status(400).send('Invalid OAuth state.')
    return
  }
  const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: config.github.clientId,
      client_secret: config.github.clientSecret,
      code,
      redirect_uri: `${config.appUrl}/auth/github/callback`,
    }),
  })
  const { access_token } = (await tokenRes.json()) as { access_token?: string }
  if (!access_token) {
    res.status(400).send('Failed to obtain GitHub token.')
    return
  }
  const ghHeaders = {
    Authorization: `Bearer ${access_token}`,
    'User-Agent': 'profile-admin',
    Accept: 'application/vnd.github+json',
  }
  const ghUser = (await (
    await fetch('https://api.github.com/user', { headers: ghHeaders })
  ).json()) as { email?: string; name?: string; login?: string }
  let email = ghUser.email ?? ''
  if (!email) {
    const emails = (await (
      await fetch('https://api.github.com/user/emails', { headers: ghHeaders })
    ).json()) as Array<{ email: string; primary: boolean }>
    email = emails.find((e) => e.primary)?.email ?? emails[0]?.email ?? ''
  }
  finishLogin(res, { email, name: ghUser.name ?? ghUser.login, provider: 'github' })
})

// --- Google ---
authRouter.get('/google', (_req, res) => {
  const state = randomUUID()
  setState(res, state)
  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth')
  url.searchParams.set('client_id', config.google.clientId)
  url.searchParams.set('redirect_uri', `${config.appUrl}/auth/google/callback`)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('scope', 'openid email profile')
  url.searchParams.set('state', state)
  res.redirect(url.toString())
})

authRouter.get('/google/callback', async (req, res) => {
  const { code, state } = req.query
  if (!code || state !== req.cookies?.[STATE_COOKIE]) {
    res.status(400).send('Invalid OAuth state.')
    return
  }
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code: String(code),
      client_id: config.google.clientId,
      client_secret: config.google.clientSecret,
      redirect_uri: `${config.appUrl}/auth/google/callback`,
      grant_type: 'authorization_code',
    }),
  })
  const { access_token } = (await tokenRes.json()) as { access_token?: string }
  if (!access_token) {
    res.status(400).send('Failed to obtain Google token.')
    return
  }
  const g = (await (
    await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
      headers: { Authorization: `Bearer ${access_token}` },
    })
  ).json()) as { email?: string; name?: string }
  finishLogin(res, { email: g.email ?? '', name: g.name, provider: 'google' })
})

// --- Logout ---
authRouter.post('/logout', (_req, res) => {
  res.clearCookie(SESSION_COOKIE)
  res.json({ ok: true })
})
