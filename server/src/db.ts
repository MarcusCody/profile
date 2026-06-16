import { PrismaClient } from '@prisma/client'

export const prisma = new PrismaClient()

/**
 * Retries a DB operation while the (free, serverless) database is waking up
 * from auto-pause. A paused database rejects connections for ~30-60s, so we
 * retry connection-level failures with a delay instead of surfacing a 500.
 */
export async function withDbRetry<T>(
  fn: () => Promise<T>,
  attempts = 6,
  delayMs = 8000,
): Promise<T> {
  let lastErr: unknown
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn()
    } catch (err: any) {
      const code = err?.code
      const msg = String(err?.message ?? '')
      const isConnError =
        code === 'P1001' ||
        code === 'P1002' ||
        err?.name === 'PrismaClientInitializationError' ||
        msg.includes("Can't reach database server")
      if (!isConnError || i === attempts - 1) throw err
      lastErr = err
      await new Promise((resolve) => setTimeout(resolve, delayMs))
    }
  }
  throw lastErr
}
