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
