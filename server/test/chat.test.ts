import { describe, it, expect, beforeEach } from 'vitest'
import request from 'supertest'
import { createApp } from '../src/app'
import { prisma } from '../src/db'
import { clearGroundingCache } from '../src/chat/grounding'
import type { ChatProvider } from '../src/chat/provider'

const VALID_FIT = {
  score: 82,
  summary: 'A strong overall match for the role.',
  requirements: [
    { requirement: 'React', status: 'strong', evidence: 'Led React delivery.' },
    { requirement: 'Rust', status: 'gap', evidence: 'No Rust experience in profile.' },
  ],
  gaps: ['Rust'],
}

/** Provider that returns canned data and records the system prompt it received. */
function makeProvider(over: Partial<ChatProvider> = {}): ChatProvider & {
  lastSystem: string
} {
  const p: any = {
    lastSystem: '',
    async *streamReply(system: string) {
      p.lastSystem = system
      yield 'Hello'
      yield ' world'
    },
    async complete(system: string) {
      p.lastSystem = system
      return JSON.stringify(VALID_FIT)
    },
    ...over,
  }
  return p
}

beforeEach(async () => {
  clearGroundingCache()
  await prisma.profile.upsert({
    where: { id: 'singleton' },
    update: {},
    create: {
      id: 'singleton',
      name: 'Test User',
      title: 'Dev',
      location: 'KL',
      email: 'owner@example.com',
      phone: '123',
      whatsapp: 'wa',
      linkedin: 'li',
      github: 'gh',
      summary: 'sum',
    },
  })
})

describe('POST /api/fit-check', () => {
  it('returns a well-formed FitResult and grounds the prompt in profile data', async () => {
    const provider = makeProvider()
    const app = createApp({ chatProvider: provider })

    const res = await request(app)
      .post('/api/fit-check')
      .send({ jobDescription: 'Senior React engineer with Rust.' })

    expect(res.status).toBe(200)
    expect(res.body.score).toBe(82)
    expect(res.body.requirements).toHaveLength(2)
    expect(res.body.requirements[0].status).toBe('strong')
    expect(res.body.gaps).toEqual(['Rust'])
    // grounding: the serialized profile is injected into the system prompt
    expect(provider.lastSystem).toContain('Test User')
    expect(provider.lastSystem).toContain('Email: owner@example.com')
    expect(provider.lastSystem).toContain('Phone: 123')
    expect(provider.lastSystem).toContain('WhatsApp: wa')
    expect(provider.lastSystem).toContain('LinkedIn: li')
    expect(provider.lastSystem).toContain('GitHub: gh')
  })

  it('rejects an empty job description with 400', async () => {
    const app = createApp({ chatProvider: makeProvider() })
    const res = await request(app).post('/api/fit-check').send({ jobDescription: '  ' })
    expect(res.status).toBe(400)
  })

  it('rejects an oversized job description with 400', async () => {
    const app = createApp({ chatProvider: makeProvider() })
    const res = await request(app)
      .post('/api/fit-check')
      .send({ jobDescription: 'a'.repeat(8001) })
    expect(res.status).toBe(400)
  })

  it('returns 502 when the model never produces valid JSON', async () => {
    const app = createApp({
      chatProvider: makeProvider({ async complete() { return 'not json at all' } }),
    })
    const res = await request(app)
      .post('/api/fit-check')
      .send({ jobDescription: 'Some role' })
    expect(res.status).toBe(502)
    expect(res.body).toEqual({ error: 'assistant_unavailable' })
  })
})

describe('POST /api/chat', () => {
  it('streams reply deltas followed by a done event', async () => {
    const app = createApp({ chatProvider: makeProvider() })
    const res = await request(app)
      .post('/api/chat')
      .send({ messages: [{ role: 'user', content: 'Tell me about them' }] })

    expect(res.status).toBe(200)
    expect(res.headers['content-type']).toContain('text/event-stream')
    expect(res.text).toContain('"delta":"Hello"')
    expect(res.text).toContain('"delta":" world"')
    expect(res.text).toContain('"done":true')
  })

  it('rejects an empty messages array with 400', async () => {
    const app = createApp({ chatProvider: makeProvider() })
    const res = await request(app).post('/api/chat').send({ messages: [] })
    expect(res.status).toBe(400)
  })

  it('rejects an over-long message with 400', async () => {
    const app = createApp({ chatProvider: makeProvider() })
    const res = await request(app)
      .post('/api/chat')
      .send({ messages: [{ role: 'user', content: 'a'.repeat(2001) }] })
    expect(res.status).toBe(400)
  })

  it('emits an error event (not a crash) when the provider fails mid-stream', async () => {
    const app = createApp({
      chatProvider: makeProvider({
        async *streamReply() {
          throw new Error('boom')
        },
      }),
    })
    const res = await request(app)
      .post('/api/chat')
      .send({ messages: [{ role: 'user', content: 'hi' }] })

    expect(res.status).toBe(200)
    expect(res.text).toContain('"error":"assistant_unavailable"')
  })
})

describe('rate limiting', () => {
  it('returns 429 after exceeding the per-window limit', async () => {
    const app = createApp({ chatProvider: makeProvider() })
    let lastStatus = 0
    for (let i = 0; i < 21; i++) {
      const res = await request(app)
        .post('/api/fit-check')
        .send({ jobDescription: 'role' })
      lastStatus = res.status
    }
    expect(lastStatus).toBe(429)
  })
})
