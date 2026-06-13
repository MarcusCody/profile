import { describe, it, expect, beforeEach } from 'vitest'
import request from 'supertest'
import { createApp } from '../src/app'
import { prisma } from '../src/db'

const app = createApp()

beforeEach(async () => {
  await prisma.experience.deleteMany()
  await prisma.skillGroup.deleteMany()
  await prisma.project.deleteMany()
  await prisma.education.deleteMany()
  await prisma.award.deleteMany()
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

describe('GET /api/content', () => {
  it('returns profile and sections ordered by sortOrder with parsed arrays', async () => {
    await prisma.experience.create({
      data: {
        company: 'B',
        role: 'r',
        period: 'p',
        location: 'l',
        highlights: JSON.stringify(['second']),
        sortOrder: 1,
      },
    })
    await prisma.experience.create({
      data: {
        company: 'A',
        role: 'r',
        period: 'p',
        location: 'l',
        highlights: JSON.stringify(['first']),
        sortOrder: 0,
      },
    })

    const res = await request(app).get('/api/content')

    expect(res.status).toBe(200)
    expect(res.body.profile.name).toBe('Test User')
    expect(res.body.experiences.map((e: any) => e.company)).toEqual(['A', 'B'])
    expect(res.body.experiences[0].highlights).toEqual(['first'])
  })
})
