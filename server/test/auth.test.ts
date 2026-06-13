import { describe, it, expect } from 'vitest'
import request from 'supertest'
import jwt from 'jsonwebtoken'
import { createApp } from '../src/app'
import { signSession, SESSION_COOKIE } from '../src/auth/session'
import { config } from '../src/config'
import { isAllowedEmail } from '../src/auth/oauth'

const app = createApp()

describe('auth guard', () => {
  it('rejects /api/me without a session cookie', async () => {
    const res = await request(app).get('/api/me')
    expect(res.status).toBe(401)
  })

  it('accepts /api/me with a valid session cookie', async () => {
    const token = signSession({ email: 'owner@example.com', provider: 'github' })
    const res = await request(app)
      .get('/api/me')
      .set('Cookie', `${SESSION_COOKIE}=${token}`)
    expect(res.status).toBe(200)
    expect(res.body.user.email).toBe('owner@example.com')
  })

  it('rejects a POST to a protected section without a cookie', async () => {
    const res = await request(app).post('/api/experiences').send({ company: 'X' })
    expect(res.status).toBe(401)
  })

  it('rejects a forged/tampered session cookie with 401', async () => {
    const res = await request(app)
      .get('/api/me')
      .set('Cookie', `${SESSION_COOKIE}=not-a-real-token`)
    expect(res.status).toBe(401)
  })

  it('rejects an expired session cookie with 401', async () => {
    const token = jwt.sign(
      { email: 'owner@example.com', provider: 'github' },
      config.jwtSecret,
      { expiresIn: -10 },
    )
    const res = await request(app)
      .get('/api/me')
      .set('Cookie', `${SESSION_COOKIE}=${token}`)
    expect(res.status).toBe(401)
  })
})

describe('oauth state', () => {
  it('returns 400 when the state does not match (no/mismatched cookie)', async () => {
    const res = await request(app).get('/auth/github/callback?code=x&state=wrong')
    expect(res.status).toBe(400)
  })
})

describe('isAllowedEmail allowlist gate', () => {
  it('passes an allowlisted email', () => {
    expect(isAllowedEmail('owner@example.com')).toBe(true)
  })

  it('is case-insensitive for allowlisted emails', () => {
    expect(isAllowedEmail('OWNER@example.com')).toBe(true)
  })

  it('rejects a non-allowlisted email', () => {
    expect(isAllowedEmail('intruder@example.com')).toBe(false)
  })

  it('rejects an empty email', () => {
    expect(isAllowedEmail('')).toBe(false)
  })
})
