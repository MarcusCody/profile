# Profile Back Office Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Node/Express + Prisma backend and an OAuth-protected `/admin` UI so the owner can edit all resume content, which the public site then renders live from the API.

**Architecture:** Monorepo. A new `server/` Express API (Prisma + SQLite in dev) owns all content and exposes `GET /api/content` plus auth-guarded per-section CRUD. The existing Vite app gains an `/admin` area (via `react-router-dom`) that reuses the current Tailwind/shadcn components, and the public site reads content through a React context fed by the API. In production a single Node process serves both the API and the built static site.

**Tech Stack:** Express 4, Prisma, SQLite (dev), jsonwebtoken (signed cookie session), manual GitHub + Google OAuth via `fetch`, Vitest + Supertest (backend tests), React 18 + react-router-dom 6, Vite 5, Tailwind v4, shadcn/ui.

---

## Conventions & Notes (read once before starting)

- **String-list storage:** `skills`, `highlights`, `tags` are stored as a `String` column containing a JSON array (e.g. `'["React","TypeScript"]'`). This keeps the schema portable when the production DB later swaps to Azure SQL (`sqlserver`) or Postgres. The API always serializes/deserializes these to real `string[]`.
- **Server module system:** `server/` is its own CommonJS package (no `"type": "module"`), so `__dirname` works for static file serving and library interop is simplest. It runs via `tsx` in both dev and prod.
- **No CORS needed:** In dev, Vite proxies `/api` and `/auth` to the server (same origin). In prod, one process serves both. Cookies use `sameSite: 'lax'`.
- **Auth model:** OAuth identity is checked against `ALLOWED_EMAILS`. On match the server sets a signed httpOnly JWT cookie named `session`. No user/session tables.
- **IDs:** List models use integer autoincrement `id`. `Profile` is a singleton row with `id = "singleton"`.

## File Structure

**Backend (new — `server/`):**
- `server/package.json` — backend deps & scripts.
- `server/tsconfig.json` — CommonJS TS config.
- `server/.env.example` — documented env vars.
- `server/prisma/schema.prisma` — models.
- `server/prisma/seed.ts` — seeds DB from `src/data/resume.ts`.
- `server/src/db.ts` — Prisma client singleton.
- `server/src/config.ts` — env config loader.
- `server/src/http.ts` — async route wrapper + terminal error-handling middleware.
- `server/src/sections.ts` — section configs + serialize helpers + content service + CRUD router factory.
- `server/src/auth/session.ts` — JWT sign/verify + `requireAuth` middleware.
- `server/src/auth/oauth.ts` — GitHub + Google OAuth routes, `/auth/logout`.
- `server/src/app.ts` — builds & exports the Express app.
- `server/src/server.ts` — loads env, serves static in prod, listens.
- `server/vitest.config.ts`, `server/test/setup.ts` — test harness.
- `server/test/content.test.ts`, `server/test/auth.test.ts`, `server/test/crud.test.ts` — backend tests.

**Frontend (modify/new under `src/`):**
- `src/main.tsx` — add router (modify).
- `src/lib/api.ts` — typed API client + content types (new).
- `src/lib/resume-context.tsx` — `ResumeProvider` + `useResume()` (new).
- `src/App.tsx` — load content, provide context, render layout (modify).
- `src/components/{Hero,Skills,Experience,Projects,EducationAwards,Footer,Nav}.tsx` — read from `useResume()` instead of importing `resume.ts` (modify).
- `src/components/ui/{input,textarea,label}.tsx` — shadcn primitives (new).
- `src/admin/AdminApp.tsx`, `src/admin/Login.tsx`, `src/admin/Dashboard.tsx`, `src/admin/ProfileEditor.tsx`, `src/admin/SectionEditor.tsx`, `src/admin/sections.config.ts` — admin UI (new).

**Root / config (modify):**
- `vite.config.ts` — dev proxy.
- `package.json` — root scripts + `concurrently`.
- `.gitignore` — ignore server build artifacts, db, env.
- `src/data/resume.ts` — add `Profile` interface export (small modify).

---

## Phase 1 — Backend scaffold

### Task 1: Initialize the server package

**Files:**
- Create: `server/package.json`
- Create: `server/tsconfig.json`
- Create: `server/.env.example`
- Modify: `.gitignore`

- [ ] **Step 1: Create `server/package.json`**

```json
{
  "name": "profile-server",
  "private": true,
  "scripts": {
    "dev": "tsx watch src/server.ts",
    "start": "tsx src/server.ts",
    "db:generate": "prisma generate",
    "db:push": "prisma db push",
    "db:seed": "tsx prisma/seed.ts",
    "test": "vitest run"
  },
  "dependencies": {
    "@prisma/client": "^6.2.1",
    "cookie-parser": "^1.4.7",
    "dotenv": "^16.4.7",
    "express": "^4.21.2",
    "jsonwebtoken": "^9.0.2",
    "tsx": "^4.19.2"
  },
  "devDependencies": {
    "@types/cookie-parser": "^1.4.8",
    "@types/express": "^4.17.21",
    "@types/jsonwebtoken": "^9.0.7",
    "@types/node": "^22.10.5",
    "@types/supertest": "^6.0.2",
    "prisma": "^6.2.1",
    "supertest": "^7.0.0",
    "typescript": "^5.7.2",
    "vitest": "^2.1.8"
  }
}
```

- [ ] **Step 2: Create `server/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2021",
    "module": "CommonJS",
    "moduleResolution": "Node",
    "esModuleInterop": true,
    "strict": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "types": ["node"]
  },
  "include": ["src", "prisma", "test"]
}
```

- [ ] **Step 3: Create `server/.env.example`**

```bash
# Database (dev uses SQLite). For Azure SQL later, swap provider in schema.prisma
# and set e.g. sqlserver://<host>;database=<db>;user=<u>;password=<p>;encrypt=true
DATABASE_URL="file:./dev.db"

# Signed-cookie session secret (generate a long random string)
JWT_SECRET="change-me-to-a-long-random-string"

# Public-facing origin used to build OAuth redirect URIs and cookie security.
# Dev: the Vite origin (it proxies /auth to this server).
APP_URL="http://localhost:5173"

# Only these emails may access the admin (comma-separated, case-insensitive)
ALLOWED_EMAILS="hjie30@hotmail.com"

# GitHub OAuth App (https://github.com/settings/developers)
# Authorization callback URL: ${APP_URL}/auth/github/callback
GITHUB_CLIENT_ID=""
GITHUB_CLIENT_SECRET=""

# Google OAuth client (https://console.cloud.google.com/apis/credentials)
# Authorized redirect URI: ${APP_URL}/auth/google/callback
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""

# Server port
PORT="3001"
```

- [ ] **Step 4: Update `.gitignore`** — append these lines:

```
server/node_modules
server/**/*.db
.env
server/.env
```

> Note: Prisma resolves `file:./dev.db` relative to the schema directory, so the
> SQLite files are created at `server/prisma/dev.db` and `server/prisma/test.db`.
> The `server/**/*.db` glob ignores them wherever they land.

- [ ] **Step 5: Install backend deps**

Run: `npm --prefix server install`
Expected: completes, creates `server/node_modules` and `server/package-lock.json`.

- [ ] **Step 6: Commit**

```bash
git add server/package.json server/tsconfig.json server/.env.example .gitignore server/package-lock.json
git commit -m "chore(server): scaffold backend package"
```

---

### Task 2: Prisma schema, client, and seed

**Files:**
- Create: `server/prisma/schema.prisma`
- Create: `server/src/db.ts`
- Create: `server/prisma/seed.ts`
- Modify: `src/data/resume.ts` (add `Profile` interface)
- Create: `server/.env` (local, gitignored — copy of `.env.example` for dev)

- [ ] **Step 1: Create `server/prisma/schema.prisma`**

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

model Profile {
  id       String @id @default("singleton")
  name     String
  title    String
  location String
  email    String
  phone    String
  whatsapp String
  linkedin String
  github   String
  summary  String
}

model SkillGroup {
  id        Int    @id @default(autoincrement())
  title     String
  skills    String // JSON-encoded string[]
  sortOrder Int    @default(0)
}

model Experience {
  id         Int    @id @default(autoincrement())
  company    String
  role       String
  period     String
  location   String
  highlights String // JSON-encoded string[]
  sortOrder  Int    @default(0)
}

model Project {
  id          Int    @id @default(autoincrement())
  name        String
  description String
  tags        String // JSON-encoded string[]
  sortOrder   Int    @default(0)
}

model Education {
  id            Int     @id @default(autoincrement())
  institution   String
  qualification String
  period        String
  detail        String?
  sortOrder     Int     @default(0)
}

model Award {
  id          Int     @id @default(autoincrement())
  title       String
  issuer      String
  date        String
  description String?
  sortOrder   Int     @default(0)
}
```

- [ ] **Step 2: Create local `server/.env`**

Run: `cp server/.env.example server/.env`
Then leave OAuth values blank for now; `DATABASE_URL="file:./dev.db"` is enough for DB work.

- [ ] **Step 3: Generate client and create the dev DB**

Run: `npm --prefix server run db:generate && npm --prefix server run db:push`
Expected: Prisma generates the client and creates `server/prisma/dev.db` (relative to the schema dir) with all tables.

- [ ] **Step 4: Add a `Profile` interface to `src/data/resume.ts`**

Modify the top of `src/data/resume.ts` — change the first line from `export const profile = {` to add an interface and type annotation:

```ts
export interface Profile {
  name: string
  title: string
  location: string
  email: string
  phone: string
  whatsapp: string
  linkedin: string
  github: string
  summary: string
}

export const profile: Profile = {
  name: 'Chang Hao Jie',
  // ...unchanged fields...
}
```

(Keep all existing field values exactly as they are.)

- [ ] **Step 5: Create `server/prisma/seed.ts`**

```ts
import { PrismaClient } from '@prisma/client'
import {
  profile,
  skillGroups,
  experiences,
  projects,
  education,
  awards,
} from '../../src/data/resume'

const prisma = new PrismaClient()

async function main() {
  await prisma.profile.upsert({
    where: { id: 'singleton' },
    update: { ...profile },
    create: { id: 'singleton', ...profile },
  })

  await prisma.skillGroup.deleteMany()
  for (let i = 0; i < skillGroups.length; i++) {
    const g = skillGroups[i]
    await prisma.skillGroup.create({
      data: { title: g.title, skills: JSON.stringify(g.skills), sortOrder: i },
    })
  }

  await prisma.experience.deleteMany()
  for (let i = 0; i < experiences.length; i++) {
    const e = experiences[i]
    await prisma.experience.create({
      data: {
        company: e.company,
        role: e.role,
        period: e.period,
        location: e.location,
        highlights: JSON.stringify(e.highlights),
        sortOrder: i,
      },
    })
  }

  await prisma.project.deleteMany()
  for (let i = 0; i < projects.length; i++) {
    const p = projects[i]
    await prisma.project.create({
      data: {
        name: p.name,
        description: p.description,
        tags: JSON.stringify(p.tags),
        sortOrder: i,
      },
    })
  }

  await prisma.education.deleteMany()
  for (let i = 0; i < education.length; i++) {
    const ed = education[i]
    await prisma.education.create({
      data: {
        institution: ed.institution,
        qualification: ed.qualification,
        period: ed.period,
        detail: ed.detail ?? null,
        sortOrder: i,
      },
    })
  }

  await prisma.award.deleteMany()
  for (let i = 0; i < awards.length; i++) {
    const a = awards[i]
    await prisma.award.create({
      data: {
        title: a.title,
        issuer: a.issuer,
        date: a.date,
        description: a.description ?? null,
        sortOrder: i,
      },
    })
  }

  console.log('Seed complete.')
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (err) => {
    console.error(err)
    await prisma.$disconnect()
    process.exit(1)
  })
```

- [ ] **Step 6: Create `server/src/db.ts`**

```ts
import { PrismaClient } from '@prisma/client'

export const prisma = new PrismaClient()
```

- [ ] **Step 7: Run the seed and verify**

Run: `npm --prefix server run db:seed`
Expected: prints `Seed complete.` with no errors.

Verify: `npm --prefix server exec prisma studio` is optional; instead confirm row counts:
Run: `cd server && npx tsx -e "import('./src/db').then(async({prisma})=>{console.log(await prisma.experience.count());process.exit(0)})" && cd ..`
Expected: prints `3`.

- [ ] **Step 8: Commit**

```bash
git add server/prisma/schema.prisma server/prisma/seed.ts server/src/db.ts src/data/resume.ts
git commit -m "feat(server): add prisma schema and seed from resume data"
```

---

## Phase 2 — Backend core

### Task 3: Config loader and Express app skeleton

**Files:**
- Create: `server/src/config.ts`
- Create: `server/src/app.ts`
- Create: `server/src/server.ts`

- [ ] **Step 1: Create `server/src/config.ts`**

```ts
function resolveJwtSecret(): string {
  const secret = process.env.JWT_SECRET
  if (secret) return secret
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET is required in production')
  }
  return 'dev-insecure-secret'
}

export const config = {
  port: Number(process.env.PORT ?? 3001),
  appUrl: process.env.APP_URL ?? 'http://localhost:5173',
  jwtSecret: resolveJwtSecret(),
  allowedEmails: (process.env.ALLOWED_EMAILS ?? '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean),
  github: {
    clientId: process.env.GITHUB_CLIENT_ID ?? '',
    clientSecret: process.env.GITHUB_CLIENT_SECRET ?? '',
  },
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID ?? '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
  },
  get isHttps() {
    return this.appUrl.startsWith('https')
  },
}
```

- [ ] **Step 2: Create `server/src/app.ts`** (routes added in later tasks; start minimal with a health route)

```ts
import express from 'express'
import cookieParser from 'cookie-parser'

export function createApp() {
  const app = express()
  app.use(express.json())
  app.use(cookieParser())

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true })
  })

  return app
}
```

- [ ] **Step 3: Create `server/src/server.ts`**

```ts
import 'dotenv/config'
import path from 'node:path'
import express from 'express'
import { createApp } from './app'
import { config } from './config'

const app = createApp()

if (process.env.NODE_ENV === 'production') {
  const distDir = path.resolve(__dirname, '../../dist')
  app.use(express.static(distDir))
  app.get('*', (_req, res) => {
    res.sendFile(path.join(distDir, 'index.html'))
  })
}

app.listen(config.port, () => {
  console.log(`API listening on http://localhost:${config.port}`)
})
```

- [ ] **Step 4: Verify the server boots**

Run: `npm --prefix server run dev`
Then in another terminal: `curl -s http://localhost:3001/api/health`
Expected: `{"ok":true}`. Stop the dev server afterward.

- [ ] **Step 5: Commit**

```bash
git add server/src/config.ts server/src/app.ts server/src/server.ts
git commit -m "feat(server): add express app skeleton, config, and prod static serving"
```

---

### Task 4: Content service + `GET /api/content` (TDD)

**Files:**
- Create: `server/src/http.ts`
- Create: `server/src/sections.ts`
- Create: `server/vitest.config.ts`
- Create: `server/test/setup.ts`
- Create: `server/test/content.test.ts`
- Modify: `server/src/app.ts`

- [ ] **Step 1: Create the test harness `server/vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./test/setup.ts'],
    fileParallelism: false,
  },
})
```

- [ ] **Step 2: Create `server/test/setup.ts`** (uses a dedicated test DB, pushes schema, seeds before all tests)

```ts
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
```

- [ ] **Step 3: Write the failing test `server/test/content.test.ts`**

```ts
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
```

- [ ] **Step 4: Run the test to verify it fails**

Run: `npm --prefix server test -- content`
Expected: FAIL — `GET /api/content` returns 404 (route not implemented yet).

- [ ] **Step 5a: Create `server/src/http.ts`** — an async wrapper so rejected promises reach Express's error pipeline (Express 4 does not await handlers), plus a terminal error-handling middleware that maps Prisma `P2025` to 404 and everything else to 500.

```ts
import type { Request, Response, NextFunction } from 'express'

type AsyncHandler = (
  req: Request,
  res: Response,
  next: NextFunction,
) => unknown | Promise<unknown>

export const wrap =
  (fn: AsyncHandler) => (req: Request, res: Response, next: NextFunction) =>
    Promise.resolve(fn(req, res, next)).catch(next)

export function errorHandler(
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction,
) {
  if (err?.code === 'P2025') {
    res.status(404).json({ error: 'not_found' })
    return
  }
  console.error(err)
  res.status(500).json({ error: 'server_error' })
}
```

- [ ] **Step 5b: Create `server/src/sections.ts`** with serialize helpers, the content service, the section configs, and the CRUD router factory. All async handlers are `wrap`ped; `toRow` only stores real arrays for array fields; `getContent` reuses `toOutput` so serialization has one source of truth.

```ts
import { Router } from 'express'
import { prisma } from './db'
import { requireAuth } from './auth/session'
import { wrap } from './http'

export interface SectionConfig {
  path: string
  model: string
  fields: string[]
  arrayFields: string[]
}

export const sections: SectionConfig[] = [
  { path: 'skill-groups', model: 'skillGroup', fields: ['title'], arrayFields: ['skills'] },
  {
    path: 'experiences',
    model: 'experience',
    fields: ['company', 'role', 'period', 'location'],
    arrayFields: ['highlights'],
  },
  {
    path: 'projects',
    model: 'project',
    fields: ['name', 'description'],
    arrayFields: ['tags'],
  },
  {
    path: 'education',
    model: 'education',
    fields: ['institution', 'qualification', 'period', 'detail'],
    arrayFields: [],
  },
  {
    path: 'awards',
    model: 'award',
    fields: ['title', 'issuer', 'date', 'description'],
    arrayFields: [],
  },
]

function delegate(model: string): any {
  return (prisma as any)[model]
}

function toOutput(row: any, cfg: SectionConfig) {
  const out: any = { ...row }
  for (const f of cfg.arrayFields) out[f] = JSON.parse(row[f] ?? '[]')
  return out
}

function toRow(body: any, cfg: SectionConfig) {
  const data: any = {}
  for (const f of cfg.fields) if (body[f] !== undefined) data[f] = body[f]
  for (const f of cfg.arrayFields)
    if (body[f] !== undefined)
      data[f] = JSON.stringify(Array.isArray(body[f]) ? body[f] : [])
  return data
}

const cfgByModel: Record<string, SectionConfig> = Object.fromEntries(
  sections.map((s) => [s.model, s]),
)

export async function getContent() {
  const [profile, skillGroups, experiences, projects, education, awards] =
    await Promise.all([
      prisma.profile.findUnique({ where: { id: 'singleton' } }),
      prisma.skillGroup.findMany({ orderBy: { sortOrder: 'asc' } }),
      prisma.experience.findMany({ orderBy: { sortOrder: 'asc' } }),
      prisma.project.findMany({ orderBy: { sortOrder: 'asc' } }),
      prisma.education.findMany({ orderBy: { sortOrder: 'asc' } }),
      prisma.award.findMany({ orderBy: { sortOrder: 'asc' } }),
    ])

  if (!profile) {
    throw new Error('Profile singleton not found — run the seed')
  }

  return {
    profile,
    skillGroups: skillGroups.map((r) => toOutput(r, cfgByModel.skillGroup)),
    experiences: experiences.map((r) => toOutput(r, cfgByModel.experience)),
    projects: projects.map((r) => toOutput(r, cfgByModel.project)),
    education: education.map((r) => toOutput(r, cfgByModel.education)),
    awards: awards.map((r) => toOutput(r, cfgByModel.award)),
  }
}

export function sectionRouter(cfg: SectionConfig) {
  const r = Router()

  r.post(
    '/',
    requireAuth,
    wrap(async (req, res) => {
      const max = await delegate(cfg.model).aggregate({ _max: { sortOrder: true } })
      const sortOrder = (max._max.sortOrder ?? -1) + 1
      const created = await delegate(cfg.model).create({
        data: { ...toRow(req.body, cfg), sortOrder },
      })
      res.status(201).json(toOutput(created, cfg))
    }),
  )

  r.put(
    '/:id',
    requireAuth,
    wrap(async (req, res) => {
      const id = Number(req.params.id)
      const updated = await delegate(cfg.model).update({
        where: { id },
        data: toRow(req.body, cfg),
      })
      res.json(toOutput(updated, cfg))
    }),
  )

  r.delete(
    '/:id',
    requireAuth,
    wrap(async (req, res) => {
      await delegate(cfg.model).delete({ where: { id: Number(req.params.id) } })
      res.status(204).end()
    }),
  )

  return r
}
```

> Note: this file imports `requireAuth` from `./auth/session`, created in Task 5. If implementing strictly in order, create `server/src/auth/session.ts` (Task 5 Step 1) first, or temporarily stub `requireAuth`. The recommended order is Task 5 before wiring CRUD, but `getContent()` itself has no auth dependency.

- [ ] **Step 6: Wire `GET /api/content` into `server/src/app.ts`**

Replace the body of `createApp` so it imports and uses `getContent`:

```ts
import express from 'express'
import cookieParser from 'cookie-parser'
import { getContent } from './sections'
import { wrap, errorHandler } from './http'

export function createApp() {
  const app = express()
  app.use(express.json())
  app.use(cookieParser())

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true })
  })

  app.get(
    '/api/content',
    wrap(async (_req, res) => {
      res.json(await getContent())
    }),
  )

  // Keep last: routes added in later tasks must be registered ABOVE this.
  app.use(errorHandler)

  return app
}
```

- [ ] **Step 7: Run the test to verify it passes**

Run: `npm --prefix server test -- content`
Expected: PASS (1 test).

- [ ] **Step 8: Commit**

```bash
git add server/src/http.ts server/src/sections.ts server/src/app.ts server/vitest.config.ts server/test/setup.ts server/test/content.test.ts
git commit -m "feat(server): add content service and GET /api/content with tests"
```

---

### Task 5: Session util + auth guard (TDD)

**Files:**
- Create: `server/src/auth/session.ts`
- Create: `server/test/auth.test.ts`

- [ ] **Step 1: Create `server/src/auth/session.ts`**

```ts
import type { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { config } from '../config'

export interface SessionUser {
  email: string
  name?: string
  provider: 'github' | 'google'
}

export const SESSION_COOKIE = 'session'

export function signSession(user: SessionUser): string {
  return jwt.sign(user, config.jwtSecret, { expiresIn: '30d' })
}

export function verifySession(token: string): SessionUser | null {
  try {
    return jwt.verify(token, config.jwtSecret) as SessionUser
  } catch {
    return null
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies?.[SESSION_COOKIE]
  const user = token ? verifySession(token) : null
  if (!user) {
    res.status(401).json({ error: 'unauthorized' })
    return
  }
  ;(req as any).user = user
  next()
}
```

- [ ] **Step 2: Add `GET /api/me` to `server/src/app.ts`** (inside `createApp`, after `/api/content`)

```ts
import { requireAuth } from './auth/session'
// ...
  app.get('/api/me', requireAuth, (req, res) => {
    res.json({ user: (req as any).user })
  })
```

- [ ] **Step 3: Write the failing test `server/test/auth.test.ts`**

```ts
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
```

(The `POST /api/experiences` assertion requires section routes mounted — done in Task 6. It will pass once Task 6 is complete; if running Task 5 alone, expect it to 404 until then. The `oauth state` test depends on `isAllowedEmail`/`authRouter` from `auth/oauth.ts` (Task 7), so run the full suite after Task 7. Implement Task 6 next.)

- [ ] **Step 4: Run the test**

Run: `npm --prefix server test -- auth`
Expected: first two PASS. Third currently 404 (route not yet mounted) — proceed to Task 6.

- [ ] **Step 5: Commit**

```bash
git add server/src/auth/session.ts server/src/app.ts server/test/auth.test.ts
git commit -m "feat(server): add jwt session util, auth guard, and /api/me"
```

---

### Task 6: Mount per-section CRUD routes (TDD)

**Files:**
- Modify: `server/src/app.ts`
- Create: `server/test/crud.test.ts`

- [ ] **Step 1: Write the failing test `server/test/crud.test.ts`**

```ts
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
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm --prefix server test -- crud`
Expected: FAIL — `POST /api/experiences` returns 404.

- [ ] **Step 3: Mount section routers in `server/src/app.ts`** — add inside `createApp` before `app.use(errorHandler)` (the error handler must stay last):

```ts
import { sections, sectionRouter } from './sections'
// ...
  for (const cfg of sections) {
    app.use(`/api/${cfg.path}`, sectionRouter(cfg))
  }
```

- [ ] **Step 4: Add the `PUT /api/profile` route in `server/src/app.ts`** (after `/api/me`, wrapped so async errors reach the error handler)

```ts
import { prisma } from './db'
import { wrap } from './http'
// ...
  app.put(
    '/api/profile',
    requireAuth,
    wrap(async (req, res) => {
      const fields = [
        'name',
        'title',
        'location',
        'email',
        'phone',
        'whatsapp',
        'linkedin',
        'github',
        'summary',
      ]
      const data: any = {}
      for (const f of fields) if (req.body[f] !== undefined) data[f] = req.body[f]
      const updated = await prisma.profile.update({
        where: { id: 'singleton' },
        data,
      })
      res.json(updated)
    }),
  )
```

- [ ] **Step 5: Run all backend tests**

Run: `npm --prefix server test`
Expected: PASS — content, auth (all three now pass), and crud suites green.

- [ ] **Step 6: Commit**

```bash
git add server/src/app.ts server/test/crud.test.ts
git commit -m "feat(server): mount section CRUD routes and PUT /api/profile"
```

---

### Task 7: OAuth routes (GitHub + Google) + logout

**Files:**
- Create: `server/src/auth/oauth.ts`
- Modify: `server/src/app.ts`

- [ ] **Step 1: Create `server/src/auth/oauth.ts`**

```ts
import { randomUUID } from 'node:crypto'
import { Router } from 'express'
import type { Response } from 'express'
import { config } from '../config'
import { wrap } from '../http'
import { signSession, SESSION_COOKIE, type SessionUser } from './session'

const STATE_COOKIE = 'oauth_state'

/** Allowlist gate: true only for non-empty emails present in ALLOWED_EMAILS. */
export function isAllowedEmail(email: string): boolean {
  return !!email && config.allowedEmails.includes(email.toLowerCase())
}

function setState(res: Response, state: string) {
  res.cookie(STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: 'lax',
    secure: config.isHttps,
    maxAge: 10 * 60 * 1000,
  })
}

function finishLogin(res: Response, user: SessionUser) {
  if (!isAllowedEmail(user.email)) {
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

authRouter.get(
  '/github/callback',
  wrap(async (req, res) => {
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
    finishLogin(res, {
      email,
      name: ghUser.name ?? ghUser.login,
      provider: 'github',
    })
  }),
)

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

authRouter.get(
  '/google/callback',
  wrap(async (req, res) => {
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
  }),
)

// --- Logout ---
// Clear with the same attributes used when setting the cookie so it reliably
// clears across browsers.
authRouter.post('/logout', (_req, res) => {
  res.clearCookie(SESSION_COOKIE, {
    httpOnly: true,
    sameSite: 'lax',
    secure: config.isHttps,
    path: '/',
  })
  res.json({ ok: true })
})
```

- [ ] **Step 2: Mount the auth router in `server/src/app.ts`** — add inside `createApp` before `app.use(errorHandler)` (the error handler must stay last):

```ts
import { authRouter } from './auth/oauth'
// ...
  app.use('/auth', authRouter)
```

- [ ] **Step 3: Verify routes register without runtime errors**

Run: `npm --prefix server test`
Expected: all existing tests still PASS (mounting the router must not break the app).

Run (smoke): start `npm --prefix server run dev`, then `curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3001/auth/github`
Expected: `302` (redirect to GitHub). Stop the dev server.

- [ ] **Step 4: Commit**

```bash
git add server/src/auth/oauth.ts server/src/app.ts
git commit -m "feat(server): add GitHub and Google OAuth routes and logout"
```

---

## Phase 3 — Frontend: public site reads from the API

### Task 8: API client and content types

**Files:**
- Create: `src/lib/api.ts`

- [ ] **Step 1: Create `src/lib/api.ts`**

```ts
import type {
  Profile,
  SkillGroup,
  Experience,
  Project,
  Education,
  Award,
} from '@/data/resume'

export type WithId<T> = T & { id: number; sortOrder: number }

export interface ResumeContent {
  profile: Profile
  skillGroups: WithId<SkillGroup>[]
  experiences: WithId<Experience>[]
  projects: WithId<Project>[]
  education: WithId<Education>[]
  awards: WithId<Award>[]
}

export interface SessionUser {
  email: string
  name?: string
  provider: 'github' | 'google'
}

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) throw new Error(`Request failed: ${res.status}`)
  return res.json() as Promise<T>
}

export const api = {
  getContent: () => fetch('/api/content').then((r) => json<ResumeContent>(r)),

  getMe: async (): Promise<SessionUser | null> => {
    const res = await fetch('/api/me', { credentials: 'include' })
    if (res.status === 401) return null
    const data = await json<{ user: SessionUser }>(res)
    return data.user
  },

  logout: () =>
    fetch('/auth/logout', { method: 'POST', credentials: 'include' }).then((r) =>
      json<{ ok: true }>(r),
    ),

  updateProfile: (body: Partial<Profile>) =>
    fetch('/api/profile', {
      method: 'PUT',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }).then((r) => json<Profile>(r)),

  createItem: (path: string, body: unknown) =>
    fetch(`/api/${path}`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }).then((r) => json<any>(r)),

  updateItem: (path: string, id: number, body: unknown) =>
    fetch(`/api/${path}/${id}`, {
      method: 'PUT',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }).then((r) => json<any>(r)),

  deleteItem: async (path: string, id: number) => {
    const res = await fetch(`/api/${path}/${id}`, {
      method: 'DELETE',
      credentials: 'include',
    })
    if (!res.ok) throw new Error(`Delete failed: ${res.status}`)
  },
}
```

- [ ] **Step 2: Verify it typechecks** (depends on `Profile` interface added in Task 2 Step 4)

Run: `npx tsc -b`
Expected: no errors. (If `Profile` is missing, revisit Task 2 Step 4.)

- [ ] **Step 3: Commit**

```bash
git add src/lib/api.ts
git commit -m "feat(web): add typed API client and content types"
```

---

### Task 9: Resume context provider + hook

**Files:**
- Create: `src/lib/resume-context.tsx`

- [ ] **Step 1: Create `src/lib/resume-context.tsx`**

```tsx
import { createContext, useContext } from 'react'
import type { ResumeContent } from '@/lib/api'

const ResumeContext = createContext<ResumeContent | null>(null)

export function ResumeProvider({
  value,
  children,
}: {
  value: ResumeContent
  children: React.ReactNode
}) {
  return <ResumeContext.Provider value={value}>{children}</ResumeContext.Provider>
}

export function useResume(): ResumeContent {
  const ctx = useContext(ResumeContext)
  if (!ctx) throw new Error('useResume must be used within a ResumeProvider')
  return ctx
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/resume-context.tsx
git commit -m "feat(web): add resume content context and hook"
```

---

### Task 10: Wire `App.tsx` to load content and provide context

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Replace `src/App.tsx` entirely**

```tsx
import { useEffect, useState } from 'react'
import Nav from './components/Nav'
import Hero from './components/Hero'
import Skills from './components/Skills'
import Experience from './components/Experience'
import Projects from './components/Projects'
import EducationAwards from './components/EducationAwards'
import Footer from './components/Footer'
import { api, type ResumeContent } from '@/lib/api'
import { ResumeProvider } from '@/lib/resume-context'

export default function App() {
  const [content, setContent] = useState<ResumeContent | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    api
      .getContent()
      .then(setContent)
      .catch((err) => {
        console.error('Failed to load content', err)
        setError(true)
      })
  }, [])

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6 text-center text-muted-foreground">
        Could not load profile content. Please try again later.
      </div>
    )
  }

  if (!content) {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted-foreground">
        Loading…
      </div>
    )
  }

  return (
    <ResumeProvider value={content}>
      <a
        href="#main"
        className="absolute -top-12 left-4 z-[100] rounded-md bg-primary px-4 py-2 font-semibold text-primary-foreground transition-[top] focus:top-4"
      >
        Skip to content
      </a>
      <Nav />
      <main id="main">
        <Hero />
        <Skills />
        <Experience />
        <Projects />
        <EducationAwards />
      </main>
      <Footer />
    </ResumeProvider>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/App.tsx
git commit -m "feat(web): load resume content from API in App"
```

---

### Task 11: Switch public components to `useResume()`

**Files:**
- Modify: `src/components/Hero.tsx`, `Skills.tsx`, `Experience.tsx`, `Projects.tsx`, `EducationAwards.tsx`, `Footer.tsx`, `Nav.tsx`

- [ ] **Step 1: `Hero.tsx`** — replace `import { profile } from '../data/resume'` with `import { useResume } from '@/lib/resume-context'`, and add `const { profile } = useResume()` as the first line inside `export default function Hero() {`.

- [ ] **Step 2: `Skills.tsx`** — replace `import { skillGroups } from '../data/resume'` with `import { useResume } from '@/lib/resume-context'`; add `const { skillGroups } = useResume()` inside the component. Change `key={group.title}` to `key={group.id}`.

- [ ] **Step 3: `Experience.tsx`** — replace `import { experiences } from '../data/resume'` with `import { useResume } from '@/lib/resume-context'`; add `const { experiences } = useResume()` inside the component. Change `key={job.company}` to `key={job.id}`.

- [ ] **Step 4: `Projects.tsx`** — replace `import { projects } from '../data/resume'` with `import { useResume } from '@/lib/resume-context'`; add `const { projects } = useResume()` inside the component. Change `key={project.name}` to `key={project.id}`.

- [ ] **Step 5: `EducationAwards.tsx`** — replace `import { education, awards } from '../data/resume'` with `import { useResume } from '@/lib/resume-context'`; add `const { education, awards } = useResume()` inside the component. Change `key={entry.qualification}` to `key={entry.id}` and `key={award.title}` to `key={award.id}`.

- [ ] **Step 6: `Footer.tsx`** — this file builds `contactLinks` at module scope from `profile`. Move that array inside the component. Replace `import { profile } from '../data/resume'` with `import { useResume } from '@/lib/resume-context'`, then inside `export default function Footer() {` add:

```tsx
  const { profile } = useResume()
  const contactLinks = [
    { href: `mailto:${profile.email}`, label: profile.email, icon: Mail, external: false },
    { href: profile.whatsapp, label: `WhatsApp · ${profile.phone}`, icon: MessageCircle, external: true },
    { href: profile.github, label: profile.github.replace(/^https?:\/\//, ''), icon: GitHubIcon, external: true },
    { href: profile.linkedin, label: profile.linkedin.replace(/^https?:\/\//, ''), icon: LinkedInIcon, external: true },
  ]
```

Delete the old module-scope `contactLinks` declaration.

- [ ] **Step 7: `Nav.tsx`** — `profile` is only used for the contact `mailto`. Replace `import { profile } from '../data/resume'` with `import { useResume } from '@/lib/resume-context'`, and add `const { profile } = useResume()` as the first line inside `export default function Nav() {` (before the `useState` calls is fine).

- [ ] **Step 8: Typecheck**

Run: `npx tsc -b`
Expected: no errors.

- [ ] **Step 9: Manual verify** — with the API running (`npm --prefix server run dev`) and `npm run dev` (after Task 16 proxy is set), the public site renders identical content loaded from the API. If verifying before Task 16, temporarily run `vite` and confirm the loading state appears (data will arrive once the proxy exists).

- [ ] **Step 10: Commit**

```bash
git add src/components
git commit -m "feat(web): render public sections from API-backed context"
```

---

## Phase 4 — Admin UI

### Task 12: Add shadcn primitives (input, textarea, label)

**Files:**
- Create: `src/components/ui/input.tsx`, `src/components/ui/textarea.tsx`, `src/components/ui/label.tsx`
- Modify: `package.json` (add `@radix-ui/react-label`)

- [ ] **Step 1: Install the label primitive dependency**

Run: `npm install @radix-ui/react-label`
Expected: adds `@radix-ui/react-label` to dependencies.

- [ ] **Step 2: Create `src/components/ui/input.tsx`**

```tsx
import * as React from 'react'
import { cn } from '@/lib/utils'

function Input({ className, type, ...props }: React.ComponentProps<'input'>) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    />
  )
}

export { Input }
```

- [ ] **Step 3: Create `src/components/ui/textarea.tsx`**

```tsx
import * as React from 'react'
import { cn } from '@/lib/utils'

function Textarea({ className, ...props }: React.ComponentProps<'textarea'>) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        'flex min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    />
  )
}

export { Textarea }
```

- [ ] **Step 4: Create `src/components/ui/label.tsx`**

```tsx
import * as React from 'react'
import * as LabelPrimitive from '@radix-ui/react-label'
import { cn } from '@/lib/utils'

function Label({
  className,
  ...props
}: React.ComponentProps<typeof LabelPrimitive.Root>) {
  return (
    <LabelPrimitive.Root
      data-slot="label"
      className={cn(
        'text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
        className,
      )}
      {...props}
    />
  )
}

export { Label }
```

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/input.tsx src/components/ui/textarea.tsx src/components/ui/label.tsx package.json package-lock.json
git commit -m "feat(web): add input, textarea, and label ui primitives"
```

---

### Task 13: Router setup — public at `/`, admin at `/admin/*`

**Files:**
- Modify: `src/main.tsx`
- Modify: `package.json` (add `react-router-dom`)

- [ ] **Step 1: Install the router**

Run: `npm install react-router-dom`
Expected: adds `react-router-dom` (v6+) to dependencies.

- [ ] **Step 2: Replace `src/main.tsx`**

```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import App from './App'
import AdminApp from './admin/AdminApp'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/admin/*" element={<AdminApp />} />
        <Route path="/*" element={<App />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
```

- [ ] **Step 3: Commit** (after Task 14–15 create `AdminApp`; if committing now, create a temporary placeholder `src/admin/AdminApp.tsx` exporting `export default function AdminApp(){return null}` to keep the build green, then replace it in Task 15.)

```bash
git add src/main.tsx package.json package-lock.json
git commit -m "feat(web): add react-router with public and admin routes"
```

---

### Task 14: Section config for the admin editors

**Files:**
- Create: `src/admin/sections.config.ts`

- [ ] **Step 1: Create `src/admin/sections.config.ts`**

```ts
export type FieldType = 'text' | 'textarea' | 'list'

export interface FieldDef {
  name: string
  label: string
  type: FieldType
}

export interface AdminSection {
  path: string
  title: string
  /** Field used as the row heading in the list. */
  titleField: string
  fields: FieldDef[]
}

export const adminSections: AdminSection[] = [
  {
    path: 'skill-groups',
    title: 'Skill Groups',
    titleField: 'title',
    fields: [
      { name: 'title', label: 'Group title', type: 'text' },
      { name: 'skills', label: 'Skills (one per line)', type: 'list' },
    ],
  },
  {
    path: 'experiences',
    title: 'Experience',
    titleField: 'company',
    fields: [
      { name: 'company', label: 'Company', type: 'text' },
      { name: 'role', label: 'Role', type: 'text' },
      { name: 'period', label: 'Period', type: 'text' },
      { name: 'location', label: 'Location', type: 'text' },
      { name: 'highlights', label: 'Highlights (one per line)', type: 'list' },
    ],
  },
  {
    path: 'projects',
    title: 'Projects',
    titleField: 'name',
    fields: [
      { name: 'name', label: 'Name', type: 'text' },
      { name: 'description', label: 'Description', type: 'textarea' },
      { name: 'tags', label: 'Tags (one per line)', type: 'list' },
    ],
  },
  {
    path: 'education',
    title: 'Education',
    titleField: 'qualification',
    fields: [
      { name: 'institution', label: 'Institution', type: 'text' },
      { name: 'qualification', label: 'Qualification', type: 'text' },
      { name: 'period', label: 'Period', type: 'text' },
      { name: 'detail', label: 'Detail (optional)', type: 'text' },
    ],
  },
  {
    path: 'awards',
    title: 'Awards',
    titleField: 'title',
    fields: [
      { name: 'title', label: 'Title', type: 'text' },
      { name: 'issuer', label: 'Issuer', type: 'text' },
      { name: 'date', label: 'Date', type: 'text' },
      { name: 'description', label: 'Description (optional)', type: 'textarea' },
    ],
  },
]

export const profileFields: FieldDef[] = [
  { name: 'name', label: 'Name', type: 'text' },
  { name: 'title', label: 'Title', type: 'text' },
  { name: 'location', label: 'Location', type: 'text' },
  { name: 'email', label: 'Email', type: 'text' },
  { name: 'phone', label: 'Phone', type: 'text' },
  { name: 'whatsapp', label: 'WhatsApp URL', type: 'text' },
  { name: 'linkedin', label: 'LinkedIn URL', type: 'text' },
  { name: 'github', label: 'GitHub URL', type: 'text' },
  { name: 'summary', label: 'Summary', type: 'textarea' },
]
```

- [ ] **Step 2: Commit**

```bash
git add src/admin/sections.config.ts
git commit -m "feat(admin): add section field configuration"
```

---

### Task 15: Admin shell, login, and auth gate

**Files:**
- Create: `src/admin/Login.tsx`
- Create/replace: `src/admin/AdminApp.tsx`

- [ ] **Step 1: Create `src/admin/Login.tsx`**

```tsx
import { Button } from '@/components/ui/button'
import { GitHubIcon } from '@/components/icons'

export default function Login() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 p-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold">Profile Admin</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Sign in to manage your resume content.
        </p>
      </div>
      <div className="flex flex-col gap-3">
        <Button asChild>
          <a href="/auth/github">
            <GitHubIcon aria-hidden="true" />
            Continue with GitHub
          </a>
        </Button>
        <Button asChild variant="secondary">
          <a href="/auth/google">Continue with Google</a>
        </Button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Replace `src/admin/AdminApp.tsx`**

```tsx
import { useEffect, useState } from 'react'
import { api, type SessionUser } from '@/lib/api'
import Login from './Login'
import Dashboard from './Dashboard'

export default function AdminApp() {
  const [user, setUser] = useState<SessionUser | null>(null)
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    api
      .getMe()
      .then(setUser)
      .finally(() => setChecked(true))
  }, [])

  if (!checked) {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted-foreground">
        Loading…
      </div>
    )
  }

  if (!user) return <Login />

  return <Dashboard user={user} onLogout={() => setUser(null)} />
}
```

- [ ] **Step 3: Typecheck** (Dashboard created next; if checking now, expect an unresolved import until Task 16.)

- [ ] **Step 4: Commit** (commit together with Task 16 if Dashboard not yet present)

```bash
git add src/admin/Login.tsx src/admin/AdminApp.tsx
git commit -m "feat(admin): add login screen and auth gate"
```

---

### Task 16: Dashboard, profile editor, and generic section editor

**Files:**
- Create: `src/admin/SectionEditor.tsx`
- Create: `src/admin/ProfileEditor.tsx`
- Create: `src/admin/Dashboard.tsx`

- [ ] **Step 1: Create `src/admin/SectionEditor.tsx`**

```tsx
import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { api } from '@/lib/api'
import type { AdminSection, FieldDef } from './sections.config'

export type Item = Record<string, any> & { id: number }

function emptyForm(fields: FieldDef[]) {
  const f: Record<string, string> = {}
  for (const field of fields) f[field.name] = ''
  return f
}

function itemToForm(item: Item, fields: FieldDef[]) {
  const f: Record<string, string> = {}
  for (const field of fields) {
    const v = item[field.name]
    f[field.name] = field.type === 'list' ? (v ?? []).join('\n') : (v ?? '')
  }
  return f
}

function formToPayload(form: Record<string, string>, fields: FieldDef[]) {
  const payload: Record<string, unknown> = {}
  for (const field of fields) {
    payload[field.name] =
      field.type === 'list'
        ? form[field.name].split('\n').map((s) => s.trim()).filter(Boolean)
        : form[field.name]
  }
  return payload
}

function FieldInput({
  field,
  id,
  value,
  onChange,
}: {
  field: FieldDef
  id: string
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{field.label}</Label>
      {field.type === 'text' ? (
        <Input id={id} value={value} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <Textarea
          id={id}
          value={value}
          rows={field.type === 'list' ? 4 : 3}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </div>
  )
}

export default function SectionEditor({
  section,
  items,
  onChanged,
}: {
  section: AdminSection
  items: Item[]
  onChanged: () => void
}) {
  const [editingId, setEditingId] = useState<number | 'new' | null>(null)
  const [form, setForm] = useState<Record<string, string>>(emptyForm(section.fields))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function startAdd() {
    setForm(emptyForm(section.fields))
    setEditingId('new')
  }

  function startEdit(item: Item) {
    setForm(itemToForm(item, section.fields))
    setEditingId(item.id)
  }

  async function save() {
    setBusy(true)
    try {
      const payload = formToPayload(form, section.fields)
      if (editingId === 'new') {
        await api.createItem(section.path, payload)
      } else if (typeof editingId === 'number') {
        await api.updateItem(section.path, editingId, payload)
      }
      setError(null)
      setEditingId(null)
      onChanged()
    } catch {
      setError('Action failed — check your session and try again.')
    } finally {
      setBusy(false)
    }
  }

  async function remove(id: number) {
    if (!confirm('Delete this item?')) return
    setBusy(true)
    try {
      await api.deleteItem(section.path, id)
      setError(null)
      onChanged()
    } catch {
      setError('Action failed — check your session and try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>{section.title}</CardTitle>
        <Button size="sm" onClick={startAdd} disabled={busy}>
          Add
        </Button>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {error && <p className="text-sm text-destructive">{error}</p>}
        {editingId === 'new' && (
          <div className="flex flex-col gap-3 rounded-md border border-border p-4">
            {section.fields.map((f) => (
              <FieldInput
                key={f.name}
                field={f}
                id={`${section.path}-new-${f.name}`}
                value={form[f.name]}
                onChange={(v) => setForm((s) => ({ ...s, [f.name]: v }))}
              />
            ))}
            <div className="flex gap-2">
              <Button size="sm" onClick={save} disabled={busy}>
                Save
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setEditingId(null)}
                disabled={busy}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {items.map((item) =>
          editingId === item.id ? (
            <div
              key={item.id}
              className="flex flex-col gap-3 rounded-md border border-border p-4"
            >
              {section.fields.map((f) => (
                <FieldInput
                  key={f.name}
                  field={f}
                  id={`${section.path}-${item.id}-${f.name}`}
                  value={form[f.name]}
                  onChange={(v) => setForm((s) => ({ ...s, [f.name]: v }))}
                />
              ))}
              <div className="flex gap-2">
                <Button size="sm" onClick={save} disabled={busy}>
                  Save
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setEditingId(null)}
                  disabled={busy}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div
              key={item.id}
              className="flex items-center justify-between rounded-md border border-border px-4 py-3"
            >
              <span className="text-sm font-medium">{item[section.titleField]}</span>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => startEdit(item)}
                  disabled={busy}
                >
                  Edit
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => remove(item.id)}
                  disabled={busy}
                >
                  Delete
                </Button>
              </div>
            </div>
          ),
        )}
      </CardContent>
    </Card>
  )
}
```

- [ ] **Step 2: Create `src/admin/ProfileEditor.tsx`**

```tsx
import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { api, type ResumeContent } from '@/lib/api'
import { profileFields } from './sections.config'

export default function ProfileEditor({ profile }: { profile: ResumeContent['profile'] }) {
  const [form, setForm] = useState<Record<string, string>>({ ...profile })
  const [busy, setBusy] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function save() {
    setBusy(true)
    setSaved(false)
    try {
      await api.updateProfile(form)
      setError(null)
      setSaved(true)
    } catch {
      setError('Save failed — check your session and try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {profileFields.map((f) => (
          <div key={f.name} className="flex flex-col gap-1.5">
            <Label htmlFor={`profile-${f.name}`}>{f.label}</Label>
            {f.type === 'textarea' ? (
              <Textarea
                id={`profile-${f.name}`}
                value={form[f.name] ?? ''}
                rows={4}
                onChange={(e) => setForm((s) => ({ ...s, [f.name]: e.target.value }))}
              />
            ) : (
              <Input
                id={`profile-${f.name}`}
                value={form[f.name] ?? ''}
                onChange={(e) => setForm((s) => ({ ...s, [f.name]: e.target.value }))}
              />
            )}
          </div>
        ))}
        <div className="flex items-center gap-3">
          <Button onClick={save} disabled={busy}>
            Save profile
          </Button>
          {saved && <span className="text-sm text-muted-foreground">Saved.</span>}
          {error && <span className="text-sm text-destructive">{error}</span>}
        </div>
      </CardContent>
    </Card>
  )
}
```

- [ ] **Step 3: Create `src/admin/Dashboard.tsx`**

```tsx
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { api, type ResumeContent, type SessionUser } from '@/lib/api'
import { adminSections } from './sections.config'
import ProfileEditor from './ProfileEditor'
import SectionEditor, { type Item } from './SectionEditor'

export default function Dashboard({
  user,
  onLogout,
}: {
  user: SessionUser
  onLogout: () => void
}) {
  const [content, setContent] = useState<ResumeContent | null>(null)
  const [loadError, setLoadError] = useState(false)

  function reload() {
    setLoadError(false)
    api
      .getContent()
      .then(setContent)
      .catch(() => setLoadError(true))
  }

  useEffect(() => {
    reload()
  }, [])

  async function logout() {
    await api.logout()
    onLogout()
  }

  return (
    <div className="container mx-auto max-w-3xl px-6 py-10">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Profile Admin</h1>
          <p className="text-sm text-muted-foreground">
            Signed in as {user.email}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" asChild>
            <a href="/" target="_blank" rel="noreferrer">
              View site
            </a>
          </Button>
          <Button variant="ghost" size="sm" onClick={logout}>
            Log out
          </Button>
        </div>
      </header>

      {loadError ? (
        <div className="flex flex-col items-start gap-3">
          <p className="text-sm text-destructive">
            Could not load content. Please try again.
          </p>
          <Button variant="outline" size="sm" onClick={reload}>
            Retry
          </Button>
        </div>
      ) : !content ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : (
        <div className="flex flex-col gap-6">
          <ProfileEditor profile={content.profile} />
          {adminSections.map((section) => (
            <SectionEditor
              key={section.path}
              section={section}
              items={content[sectionKey(section.path)] as Item[]}
              onChanged={reload}
            />
          ))}
        </div>
      )}
    </div>
  )
}

type SectionKey = Exclude<keyof ResumeContent, 'profile'>

function sectionKey(path: string): SectionKey {
  const map: Record<string, SectionKey> = {
    'skill-groups': 'skillGroups',
    experiences: 'experiences',
    projects: 'projects',
    education: 'education',
    awards: 'awards',
  }
  return map[path]
}
```

- [ ] **Step 4: Typecheck**

Run: `npx tsc -b`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/admin/SectionEditor.tsx src/admin/ProfileEditor.tsx src/admin/Dashboard.tsx
git commit -m "feat(admin): add dashboard, profile editor, and section editor"
```

---

## Phase 5 — Dev/prod wiring & verification

### Task 17: Vite proxy + root scripts

**Files:**
- Modify: `vite.config.ts`
- Modify: `package.json` (root)

- [ ] **Step 1: Update `vite.config.ts`**

```ts
import path from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    proxy: {
      '/api': 'http://localhost:3001',
      '/auth': 'http://localhost:3001',
    },
  },
})
```

- [ ] **Step 2: Install `concurrently` at the root**

Run: `npm install -D concurrently`
Expected: adds `concurrently` to root devDependencies.

- [ ] **Step 3: Update root `package.json` scripts** to:

```json
  "scripts": {
    "dev": "concurrently -k -n web,api -c blue,green \"vite\" \"npm --prefix server run dev\"",
    "dev:web": "vite",
    "dev:api": "npm --prefix server run dev",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "server:setup": "npm --prefix server install && npm --prefix server run db:generate && npm --prefix server run db:push && npm --prefix server run db:seed",
    "server:test": "npm --prefix server test"
  }
```

- [ ] **Step 4: Commit**

```bash
git add vite.config.ts package.json package-lock.json
git commit -m "chore: add vite proxy and root dev/test scripts"
```

---

### Task 18: End-to-end manual verification + README

**Files:**
- Create: `README.md` (or update if exists)

- [ ] **Step 1: Create a GitHub OAuth app and Google OAuth client**

- GitHub: Settings → Developer settings → OAuth Apps → New. Homepage `http://localhost:5173`, callback `http://localhost:5173/auth/github/callback`. Copy client id/secret into `server/.env`.
- Google: Cloud Console → Credentials → Create OAuth client (Web). Authorized redirect URI `http://localhost:5173/auth/google/callback`. Copy client id/secret into `server/.env`.
- Set `ALLOWED_EMAILS` in `server/.env` to your GitHub primary email and/or Google email. Set a strong `JWT_SECRET`.

- [ ] **Step 2: Run the whole stack**

Run: `npm run dev`
Expected: Vite on `http://localhost:5173`, API on `:3001`.

- [ ] **Step 3: Verify the public site** — open `http://localhost:5173/`, confirm all sections render content from the API (matches the seed).

- [ ] **Step 4: Verify the admin** — open `http://localhost:5173/admin`, click "Continue with GitHub", complete OAuth. Expected: redirected to `/admin` dashboard. Edit the profile summary, Save, then reload the public site and confirm the change appears. Add/edit/delete an experience and confirm it reflects on the public site.

- [ ] **Step 5: Verify access control** — log out, then in a private window set `ALLOWED_EMAILS` to a different email, restart the API, and attempt login. Expected: "Access denied" (403).

- [ ] **Step 6: Run the backend test suite**

Run: `npm run server:test`
Expected: all suites PASS.

- [ ] **Step 7: Write `README.md`** documenting: prerequisites (Node), `npm install` + `npm run server:setup`, env setup, `npm run dev`, where the admin lives (`/admin`), how to run tests, and the Azure deploy notes (App Service runs `npm --prefix server start` with `NODE_ENV=production` after `npm run build`; choose Azure SQL or SQLite-on-`/home`; set OAuth redirect URIs to the `${APP_URL}` domain).

```md
# Hao Jie — Profile + Back Office

Personal resume site (Vite + React + Tailwind) with a Node/Express + Prisma admin API.

## Develop
1. `npm install`
2. `npm run server:setup`   # installs server deps, creates + seeds the SQLite DB
3. Copy `server/.env.example` to `server/.env` and fill OAuth + JWT values.
4. `npm run dev`            # web on :5173, API on :3001
   - Public site: http://localhost:5173
   - Admin:       http://localhost:5173/admin

## Test
`npm run server:test`

## Deploy (Azure App Service)
- Build the site: `npm run build` (outputs `dist/`).
- Run the server in production: `NODE_ENV=production npm --prefix server start`
  (Express serves `dist/` + the API from one process/URL).
- Database: keep SQLite on the App Service persistent `/home`, or switch
  `server/prisma/schema.prisma` provider to `sqlserver` and set `DATABASE_URL`
  to your Azure SQL connection string.
- Set `APP_URL` to your `https://<app>.azurewebsites.net` and register the
  GitHub/Google redirect URIs as `${APP_URL}/auth/<provider>/callback`.
```

- [ ] **Step 8: Commit**

```bash
git add README.md
git commit -m "docs: add README with dev, test, and Azure deploy notes"
```

---

## Self-Review Notes (completed by plan author)

- **Spec coverage:** dynamic API (Task 4), monorepo + admin-in-Vite (Tasks 13–16), Express+Prisma+SQLite (Tasks 1–2), GitHub+Google OAuth restricted to owner (Tasks 5,7), lean CRUD on all six content types (Tasks 4,6), public site reads live (Tasks 8–11), config/`.env.example` (Task 1), Azure deploy notes (Task 18), backend tests for guard + CRUD + content ordering (Tasks 4–6). All covered.
- **Type consistency:** `SessionUser`, `ResumeContent`, `SectionConfig`/`AdminSection`, and the section `path`→content-key mapping are used consistently across backend and frontend tasks. The string-list-as-JSON convention is applied symmetrically in `toRow`/`toOutput`, `getContent`, the seed, and the frontend `list` field handling.
- **Ordering caveat:** `server/src/sections.ts` imports `requireAuth` (Task 5) and is created in Task 4; the plan flags this and recommends creating `auth/session.ts` first or stubbing. Similarly Task 13's router references `AdminApp`/`Dashboard` built in Tasks 15–16, flagged with a placeholder option to keep builds green.
