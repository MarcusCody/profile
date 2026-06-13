import { describe, it, expect, beforeEach } from 'vitest'
import request from 'supertest'
import { createApp } from '../src/app'
import { prisma } from '../src/db'
import { signSession, SESSION_COOKIE } from '../src/auth/session'

const app = createApp()
const authCookie = `${SESSION_COOKIE}=${signSession({
  email: 'owner@example.com',
  provider: 'github',
})}`

beforeEach(async () => {
  await prisma.experience.deleteMany()
})

describe('experiences CRUD', () => {
  it('creates, updates, and deletes with array serialization', async () => {
    const create = await request(app)
      .post('/api/experiences')
      .set('Cookie', authCookie)
      .send({
        company: 'Acme',
        role: 'Dev',
        period: '2024',
        location: 'KL',
        highlights: ['built things'],
      })
    expect(create.status).toBe(201)
    expect(create.body.highlights).toEqual(['built things'])
    const id = create.body.id

    const update = await request(app)
      .put(`/api/experiences/${id}`)
      .set('Cookie', authCookie)
      .send({ role: 'Lead', highlights: ['led things'] })
    expect(update.status).toBe(200)
    expect(update.body.role).toBe('Lead')
    expect(update.body.highlights).toEqual(['led things'])

    const content = await request(app).get('/api/content')
    expect(content.body.experiences).toHaveLength(1)

    const del = await request(app)
      .delete(`/api/experiences/${id}`)
      .set('Cookie', authCookie)
    expect(del.status).toBe(204)

    const after = await request(app).get('/api/content')
    expect(after.body.experiences).toHaveLength(0)
  })

  it('returns 404 (not a crash) when updating a non-existent id', async () => {
    const res = await request(app)
      .put('/api/experiences/999999')
      .set('Cookie', authCookie)
      .send({ role: 'Ghost' })
    expect(res.status).toBe(404)
    expect(res.body).toEqual({ error: 'not_found' })
  })

  it('returns 404 (not a crash) when deleting a non-existent id', async () => {
    const res = await request(app)
      .delete('/api/experiences/999999')
      .set('Cookie', authCookie)
    expect(res.status).toBe(404)
    expect(res.body).toEqual({ error: 'not_found' })
  })
})
