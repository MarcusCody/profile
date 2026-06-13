import { describe, it, expect } from 'vitest'
import request from 'supertest'
import { createApp } from '../src/app'
import { signSession, SESSION_COOKIE } from '../src/auth/session'

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
})
