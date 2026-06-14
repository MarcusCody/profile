// Ensures the application databases exist on the local SQL Server instance.
// SQL Server (unlike SQLite) does not auto-create a database from a connection
// string, and `prisma db push` cannot create the database itself — so this runs
// first. It retries while the container is still starting up.
import sql from 'mssql'

const password = process.env.MSSQL_SA_PASSWORD ?? 'Dev_Str0ng_Pass!'
const host = process.env.MSSQL_HOST ?? 'localhost'
const port = Number(process.env.MSSQL_PORT ?? 1433)
const databases = (process.env.MSSQL_DBS ?? 'profile,profile_test')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean)

const config = {
  server: host,
  port,
  user: 'sa',
  password,
  database: 'master',
  options: { encrypt: true, trustServerCertificate: true },
  pool: { max: 1, min: 0 },
}

async function connectWithRetry(attempts = 40, delayMs = 2000) {
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await sql.connect(config)
    } catch (err) {
      if (attempt === attempts) throw err
      console.log(
        `SQL Server not ready (attempt ${attempt}/${attempts}): ${err.message}. Retrying in ${delayMs / 1000}s…`,
      )
      await new Promise((resolve) => setTimeout(resolve, delayMs))
    }
  }
}

const pool = await connectWithRetry()
try {
  for (const db of databases) {
    // CREATE DATABASE cannot be parameterized or run in a transaction.
    await pool.request().query(`IF DB_ID('${db}') IS NULL CREATE DATABASE [${db}];`)
    console.log(`ensured database: ${db}`)
  }
} finally {
  await pool.close()
}
