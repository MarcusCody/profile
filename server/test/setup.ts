import { execSync } from 'node:child_process'
import { beforeAll, afterAll } from 'vitest'

process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL ??
  'sqlserver://localhost:1433;database=profile_test;user=sa;password=Dev_Str0ng_Pass!;encrypt=true;trustServerCertificate=true'
process.env.JWT_SECRET = 'test-secret'
process.env.APP_URL = 'http://localhost:5173'
process.env.ALLOWED_EMAILS = 'owner@example.com'

beforeAll(() => {
  // SQL Server won't auto-create the database; ensure profile_test exists first.
  execSync('node scripts/create-databases.mjs', {
    cwd: __dirname + '/..',
    stdio: 'inherit',
    env: { ...process.env, MSSQL_DBS: 'profile_test' },
  })
  execSync('npx prisma db push --force-reset --skip-generate', {
    cwd: __dirname + '/..',
    stdio: 'inherit',
    env: process.env,
  })
}, 180_000)

afterAll(async () => {
  const { prisma } = await import('../src/db')
  await prisma.$disconnect()
})
