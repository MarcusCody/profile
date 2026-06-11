# Profile Back Office — Design

**Date:** 2026-06-12
**Status:** Approved
**Author:** Hao Jie (with AI assist)

## Summary

The public resume site (`profile/`) is a finished static Vite + React + TypeScript +
Tailwind app whose content is hardcoded in `src/data/resume.ts`. This project adds a
**back office (admin panel)** so the owner can edit all resume content, backed by a real
Node/Express API and a database. After this work, the public site fetches its content
**live** from the API, so edits appear immediately.

## Goals

- A Node/TypeScript backend with a database that owns all resume content.
- An admin UI for CRUD editing of every existing section.
- OAuth login (GitHub + Google) restricted to the owner's account only.
- The public site reads content live from the API.
- Cheap/simple to run; deployable to Azure (student account) when ready.

## Non-Goals (v1 — deliberately deferred)

- Drag-to-reorder UI (order is still editable via stored `sortOrder`; new items append).
- Image / file / PDF uploads.
- Draft vs published workflow / preview.
- Contact-form message capture.
- Multi-user accounts or roles (single author only).

## Decisions (locked)

| Decision | Choice |
| --- | --- |
| Data flow | Dynamic — public site fetches live from API + DB |
| Approach | Standalone Node API + admin inside the existing Vite app (monorepo) |
| Web framework | Express |
| ORM | Prisma |
| Dev database | SQLite |
| Production database | Decided at deploy time (Azure SQL free tier _or_ SQLite on App Service); Prisma provider is a one-line swap |
| Auth | OAuth via GitHub **and** Google, restricted to owner via allowlist; signed httpOnly JWT cookie (no user/session tables) |
| Scope | Lean CRUD on existing sections only |
| Deploy target | Azure App Service (Linux, Node) — single service serves API + built static site |

## Architecture & Repo Layout

Monorepo. A new `server/` Express API sits beside the existing Vite app. The admin UI
lives inside the current React app under `/admin` and reuses the existing Tailwind +
shadcn components for a consistent look.

```
profile/
├── src/
│   ├── components/            # existing public site (look unchanged)
│   ├── admin/                 # NEW: login + section editors
│   ├── lib/api.ts             # NEW: typed fetch client
│   └── data/resume.ts         # becomes the DB seed source
├── server/
│   ├── package.json           # backend deps isolated from frontend
│   ├── prisma/
│   │   ├── schema.prisma      # SQLite (dev); provider swappable
│   │   └── seed.ts            # seeds DB from src/data/resume.ts
│   └── src/
│       ├── index.ts           # Express app entry
│       ├── routes/            # content + per-section CRUD
│       ├── auth/              # GitHub + Google OAuth + cookie session
│       └── middleware/        # auth guard
├── docs/superpowers/specs/    # this spec
└── package.json               # root scripts: `dev` runs site + server together
```

**Dev experience:** Vite dev server proxies `/api` and `/auth` to the Express server on
`localhost:3001`, so locally it behaves like one app. Root `npm run dev` starts both
(via `concurrently`).

**Production:** Express serves the built Vite static files _and_ the API from one process
and one URL, which keeps OAuth callback URLs and CORS trivial.

## Data Model (Prisma)

`sortOrder` preserves today's display order; new items append to the end. String-list
fields (skills, highlights, tags) are stored as JSON arrays.

- **Profile** — singleton row: `name`, `title`, `location`, `email`, `phone`, `whatsapp`,
  `linkedin`, `github`, `summary`.
- **SkillGroup** — `id`, `title`, `skills` (string[]), `sortOrder`.
- **Experience** — `id`, `company`, `role`, `period`, `location`, `highlights` (string[]),
  `sortOrder`.
- **Project** — `id`, `name`, `description`, `tags` (string[]), `sortOrder`.
- **Education** — `id`, `institution`, `qualification`, `period`, `detail?`, `sortOrder`.
- **Award** — `id`, `title`, `issuer`, `date`, `description?`, `sortOrder`.

No user or session tables — auth state is a signed cookie (see Auth).

## API

**Public**

- `GET /api/content` — returns the entire resume payload (profile + all sections, each
  ordered by `sortOrder`) in one cacheable request. This is what the public site renders.

**Auth**

- `GET /auth/github`, `GET /auth/github/callback`
- `GET /auth/google`, `GET /auth/google/callback`
- `POST /auth/logout`
- `GET /api/me` — returns the current admin identity or 401.

**Admin (auth required)**

- `PUT /api/profile`
- For each list section (`skill-groups`, `experiences`, `projects`, `education`,
  `awards`):
  - `POST /api/<section>` — create (appends with next `sortOrder`)
  - `PUT /api/<section>/:id` — update
  - `DELETE /api/<section>/:id` — delete

All admin routes pass through the auth-guard middleware.

## Auth Flow

1. User clicks "Login with GitHub" or "Login with Google" in `/admin`.
2. Standard OAuth authorization-code flow; the callback exchanges the code and fetches the
   user's identity (email / GitHub login).
3. The identity is checked against an allowlist in env (`ALLOWED_EMAILS`, optionally a
   GitHub login allowlist). On match, the server sets a **signed, httpOnly JWT cookie**;
   otherwise access is denied.
4. The auth-guard middleware validates the cookie on every admin route, so although the
   API is publicly reachable, only the owner can write.

## Admin UI

A new `/admin` area in the existing app (adds `react-router-dom`), styled with the
existing Tailwind + shadcn components.

- **Login screen** — two OAuth buttons (GitHub, Google).
- **Dashboard** — one section per content type. `Profile` is a single form; list sections
  show editable rows with add / edit / delete. Saves call the API and reflect immediately.

Adds a few shadcn primitives not yet present: input, textarea, label, and a dialog/toast
for edit forms and feedback.

## Public Site Changes

`App.tsx` and the section components switch from importing `resume.ts` directly to reading
from a small data hook that calls `GET /api/content` (with a loading state). `resume.ts`
remains as the **seed data**, so existing content is preserved on first DB seed.

## Configuration & Environment

`.env` (gitignored), with a committed `.env.example`:

- `DATABASE_URL`
- `JWT_SECRET`
- `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
- `ALLOWED_EMAILS` (comma-separated)
- `APP_URL` (used to build OAuth redirect URIs and cookie domain)

## Deployment (Azure, deferred)

- **Service:** Azure App Service (Linux, Node). One service serves the Express API and the
  built static site. URL example: `https://<name>.azurewebsites.net`.
  - F1 (Free): $0, sleeps when idle + daily CPU quota — fine for occasional use.
  - B1 (Basic): ~$13/mo, always-on — within the $100 student credit.
- **Database (choose at deploy):**
  - Azure SQL Database (free tier) — managed, robust; Prisma `sqlserver` provider.
  - SQLite on App Service persistent `/home` — $0, simplest; acceptable file-locking for a
    single author.
- **OAuth:** Register redirect URIs `${APP_URL}/auth/github/callback` and
  `${APP_URL}/auth/google/callback` in the GitHub and Google apps; set `APP_URL` env.

Prisma provider/connection string is the only change required to switch the production DB.

## Testing

Backend integration tests (Vitest + Supertest) against a temporary SQLite database:

- Auth guard blocks unauthenticated writes (401) on every admin route.
- CRUD round-trips succeed for each section (create → read via `/api/content` → update →
  delete).
- `GET /api/content` returns sections ordered by `sortOrder`.
