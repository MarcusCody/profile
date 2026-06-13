# Hao Jie — Profile + Back Office

Personal resume site (Vite + React + Tailwind) with a Node/Express + Prisma admin API.

> This project uses **npm** as its package manager (a `package-lock.json` is committed; there is no `yarn.lock`).

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
Run these steps in order on the host:

1. Build the static site: `npm install && npm run build` (outputs `dist/`).
2. Install server deps: `npm --prefix server install`
   (this runs `prisma generate` automatically via the server's `postinstall`,
   so `@prisma/client` is always generated for the target environment).
3. Sync the schema on the prod DB: `npm --prefix server run db:push`.
   If starting from an empty DB, also seed once: `npm --prefix server run db:seed`.
4. Start the server: `NODE_ENV=production npm --prefix server start`
   (Express serves `dist/` + the API from one process/URL; unknown `/api` and
   `/auth` routes return a JSON 404 instead of the SPA HTML).

Notes:
- Database: keep SQLite on the App Service persistent `/home`, or switch
  `server/prisma/schema.prisma` provider to `sqlserver` and set `DATABASE_URL`
  to your Azure SQL connection string.
- Set `APP_URL` to your `https://<app>.azurewebsites.net` and register the
  GitHub/Google redirect URIs as `${APP_URL}/auth/<provider>/callback`.
