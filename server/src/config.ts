export const config = {
  port: Number(process.env.PORT ?? 3001),
  appUrl: process.env.APP_URL ?? 'http://localhost:5173',
  jwtSecret: process.env.JWT_SECRET ?? 'dev-insecure-secret',
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
