import type { Request, Response, NextFunction } from 'express'
import jwt, { type SignOptions, type Secret } from 'jsonwebtoken'

type JwtUser = { uid: string; role: 'USER'|'ADMIN' }

const ACCESS_SECRET: Secret  = process.env.JWT_ACCESS_SECRET as string
const REFRESH_SECRET: Secret = process.env.JWT_REFRESH_SECRET as string

type Expires = SignOptions['expiresIn']
const ACCESS_EXPIRES: Expires  = (process.env.ACCESS_TOKEN_TTL  ?? '15m') as Expires
const REFRESH_EXPIRES: Expires = (process.env.REFRESH_TOKEN_TTL ?? '30d') as Expires

export function signAccessToken(payload: JwtUser): string {
  return jwt.sign(payload, ACCESS_SECRET, { expiresIn: ACCESS_EXPIRES })
}
export function signRefreshToken(payload: JwtUser & { ver:number }): string {
  return jwt.sign(payload, REFRESH_SECRET, { expiresIn: REFRESH_EXPIRES })
}

// ★ 접근 토큰도 쿠키로 내려줄 수 있게 추가
export function setAccessCookie(res: Response, token: string) {
  const secure = process.env.COOKIE_SECURE === 'true' // dev에선 false
  const domain = process.env.COOKIE_DOMAIN || 'localhost'
  res.cookie('at', token, {
    httpOnly: true,
    secure,
    sameSite: secure ? 'none' : 'lax',
    ...(domain !== 'localhost' ? { domain } : {}),
    path: '/',                 // ★ 전역
    maxAge: 1000 * 60 * 15,    // 15m
  })
}

// (기존) 리프레시 쿠키 — 경로는 그대로 둬도 되고, 전역으로 쓰려면 '/' 로 바꿔도 됨
export function setRefreshCookie(res: Response, token: string) {
  const secure = process.env.COOKIE_SECURE === 'true'
  const domain = process.env.COOKIE_DOMAIN || 'localhost'
  res.cookie('rt', token, {
    httpOnly: true,
    secure,
    sameSite: secure ? 'none' : 'lax',
    ...(domain !== 'localhost' ? { domain } : {}),
    path: '/',                 // ★ 전역(기존 '/api/auth/refresh' -> '/')
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
    path: '/',                 // set과 동일
  })
}

// ★ 헤더 또는 쿠키(at)에서 토큰을 읽도록 변경
export function requireAuth(req: Request & { user?: JwtUser }, res: Response, next: NextFunction) {
  const bearer = req.headers.authorization
  const fromHeader = bearer?.startsWith('Bearer ') ? bearer.slice(7) : undefined
  const fromCookie = (req as any).cookies?.at as string | undefined
  const token = fromHeader || fromCookie
  if (!token) return res.status(401).json({ error: 'UNAUTHORIZED' })
  try {
    const payload = jwt.verify(token, ACCESS_SECRET) as JwtUser
    req.user = payload
    next()
  } catch {
    return res.status(401).json({ error: 'UNAUTHORIZED' })
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
