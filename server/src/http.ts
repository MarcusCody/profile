import type { Request, Response, NextFunction } from 'express'

type AsyncHandler = (
  req: Request,
  res: Response,
  next: NextFunction,
) => unknown | Promise<unknown>

/**
 * Wraps an async route handler so rejected promises are forwarded to Express's
 * error pipeline instead of crashing the process (Express 4 does not await
 * handlers).
 */
export const wrap =
  (fn: AsyncHandler) => (req: Request, res: Response, next: NextFunction) =>
    Promise.resolve(fn(req, res, next)).catch(next)

/**
 * Terminal error-handling middleware. Maps Prisma "record not found" (P2025)
 * to 404 and everything else to 500, with a small JSON body.
 */
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
