# Hao Jie — Profile + Back Office

Personal resume site (Vite + React + Tailwind) with a Node/Express + Prisma admin API.

> This project uses **npm** as its package manager (a `package-lock.json` is committed; there is no `yarn.lock`).

The app uses **SQL Server** (Prisma provider `sqlserver`) in every environment:
a Dockerized SQL Server locally, and **Azure SQL Database** in production.

## Develop
Prerequisites: Node 20+, Docker Desktop (running). On Apple Silicon, enable
Docker Desktop → Settings → General → "Use Rosetta for x86/amd64 emulation".

1. `npm install`
2. Copy `server/.env.example` to `server/.env` and fill the OAuth + JWT values.
3. `npm run server:setup`
   - installs server deps (runs `prisma generate` via `postinstall`)
   - `db:init`: starts the SQL Server container, creates the `profile` and
     `profile_test` databases, pushes the schema, and seeds from `resume.ts`
4. `npm run dev`            # web on :5173, API on :3001
   - Public site: http://localhost:5173
   - Admin:       http://localhost:5173/admin

Handy DB scripts (run from repo root): `npm --prefix server run db:up` /
`db:down` (container), `db:create` (ensure databases), `db:push` (sync schema),
`db:seed` (load resume data), `db:init` (all of the above).

## Test
`npm run server:test`  (requires the SQL Server container running; the suite
uses the separate `profile_test` database and resets its schema each run.)

## Deploy (Azure App Service + Azure SQL Database)
Run these steps in order on the host:

1. Build the static site: `npm install && npm run build` (outputs `dist/`).
2. Install server deps: `npm --prefix server install`
   (this runs `prisma generate` automatically via the server's `postinstall`,
   so `@prisma/client` is always generated for the target environment).
3. Point `DATABASE_URL` at your Azure SQL DB, then sync the schema:
   `npm --prefix server run db:push`. If starting empty, seed once:
   `npm --prefix server run db:seed`.
4. Start the server: `NODE_ENV=production npm --prefix server start`
   (Express serves `dist/` + the API from one process/URL; unknown `/api` and
   `/auth` routes return a JSON 404 instead of the SPA HTML).

Notes:
- **Database:** Azure SQL Database (free tier). Connection string format:
  `sqlserver://<server>.database.windows.net:1433;database=<db>;user=<user>;password=<password>;encrypt=true`.
  Allow your App Service to reach it (Azure SQL → Networking → "Allow Azure
  services and resources to access this server").
- Set `APP_URL` to your `https://<app>.azurewebsites.net` and register the
  GitHub/Google redirect URIs as `${APP_URL}/auth/<provider>/callback`.
- Set all server env vars (`DATABASE_URL`, `JWT_SECRET`, `APP_URL`,
  `ALLOWED_EMAILS`, OAuth client IDs/secrets) in App Service →
  Configuration → Application settings.
