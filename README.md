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
- Build the site: `npm run build` (outputs `dist/`).
- Run the server in production: `NODE_ENV=production npm --prefix server start`
  (Express serves `dist/` + the API from one process/URL).
- Database: keep SQLite on the App Service persistent `/home`, or switch
  `server/prisma/schema.prisma` provider to `sqlserver` and set `DATABASE_URL`
  to your Azure SQL connection string.
- Set `APP_URL` to your `https://<app>.azurewebsites.net` and register the
  GitHub/Google redirect URIs as `${APP_URL}/auth/<provider>/callback`.
