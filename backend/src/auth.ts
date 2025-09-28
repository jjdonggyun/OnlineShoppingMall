import type { Request, Response, NextFunction } from 'express'
import jwt, { type SignOptions, type Secret } from 'jsonwebtoken'

type JwtUser = { uid: string; role: 'USER'|'ADMIN' }

const ACCESS_SECRET: Secret  = process.env.JWT_ACCESS_SECRET as string
const REFRESH_SECRET: Secret = process.env.JWT_REFRESH_SECRET as string

type Expires = SignOptions['expiresIn'] // number | ms.StringValue

const ACCESS_EXPIRES: Expires  =
  (process.env.ACCESS_TOKEN_TTL  ?? '15m') as unknown as Expires
const REFRESH_EXPIRES: Expires =
  (process.env.REFRESH_TOKEN_TTL ?? '30d') as unknown as Expires

export function signAccessToken(payload: JwtUser): string {
  return jwt.sign(payload, ACCESS_SECRET, { expiresIn: ACCESS_EXPIRES })
}
export function signRefreshToken(payload: JwtUser & { ver:number }): string {
  return jwt.sign(payload, REFRESH_SECRET, { expiresIn: REFRESH_EXPIRES })
}

export function setRefreshCookie(res: Response, token: string) {
  const secure = process.env.COOKIE_SECURE === 'true'
  const domain = process.env.COOKIE_DOMAIN || 'localhost'
  res.cookie('rt', token, {
    httpOnly: true,
    secure,
    sameSite: secure ? 'none' : 'lax',
    ...(domain !== 'localhost' ? { domain } : {}),
    path: '/api/auth/refresh',
    maxAge: 1000 * 60 * 60 * 24 * 30,
  })
}
export function clearRefreshCookie(res: Response) {
  const secure = process.env.COOKIE_SECURE === 'true'
  const domain = process.env.COOKIE_DOMAIN || 'localhost'
  res.clearCookie('rt', {
    httpOnly: true,
    secure,
    sameSite: secure ? 'none' : 'lax',
    ...(domain !== 'localhost' ? { domain } : {}),
    path: '/api/auth/refresh',
  })
}

export function requireAuth(req: Request & { user?: JwtUser }, res: Response, next: NextFunction) {
  const hdr = req.headers.authorization
  if (!hdr?.startsWith('Bearer ')) return res.status(401).json({error:'UNAUTHORIZED'})
  try {
    const token = hdr.slice(7)
    const payload = jwt.verify(token, ACCESS_SECRET) as JwtUser
    req.user = payload
    next()
  } catch {
    return res.status(401).json({error:'UNAUTHORIZED'})
  }
}
export function requireRole(role: 'ADMIN'|'USER') {
  return (req: Request & { user?: JwtUser }, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({error:'UNAUTHORIZED'})
    const ok = req.user.role === 'ADMIN' || req.user.role === role
    if (!ok) return res.status(403).json({error:'FORBIDDEN'})
    next()
  }
}
