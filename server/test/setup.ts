import { execSync } from 'node:child_process'
import { beforeAll, afterAll } from 'vitest'

process.env.DATABASE_URL = 'file:./test.db'
process.env.JWT_SECRET = 'test-secret'
process.env.APP_URL = 'http://localhost:5173'
process.env.ALLOWED_EMAILS = 'owner@example.com'

beforeAll(() => {
  execSync('npx prisma db push --force-reset --skip-generate', {
    cwd: __dirname + '/..',
    stdio: 'inherit',
    env: process.env,
  })
})

afterAll(async () => {
  const { prisma } = await import('../src/db')
  await prisma.$disconnect()
})
