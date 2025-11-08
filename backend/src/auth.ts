// auth.ts
import type { Request, Response, NextFunction, CookieOptions } from 'express'
import jwt, { type Secret, type SignOptions } from 'jsonwebtoken'

/** ====== 타입 ====== */
export type Role = 'USER' | 'ADMIN'
export type JwtUser = { uid: string; role: Role }

/** ====== 환경변수/설정 ====== */
const ACCESS_SECRET: Secret  = process.env.JWT_ACCESS_SECRET as string
const REFRESH_SECRET: Secret = process.env.JWT_REFRESH_SECRET as string

type Expires = SignOptions['expiresIn']
const ACCESS_EXPIRES: Expires  = (process.env.ACCESS_TOKEN_TTL  ?? '15m') as Expires
const REFRESH_EXPIRES: Expires = (process.env.REFRESH_TOKEN_TTL ?? '30d') as Expires

export const ACCESS_COOKIE = 'at'
export const REFRESH_COOKIE = 'rt'

const baseCookieOpts: CookieOptions = {
  httpOnly: true,
  sameSite: process.env.COOKIE_SECURE === 'true' ? 'none' : 'lax',
  secure: process.env.COOKIE_SECURE === 'true',
  path: '/',
  ...(process.env.COOKIE_DOMAIN && process.env.COOKIE_DOMAIN !== 'localhost'
      ? { domain: process.env.COOKIE_DOMAIN } : {}),
}

/** ====== 토큰 발급 ====== */
export function signAccessToken(payload: JwtUser): string {
  return jwt.sign(payload, ACCESS_SECRET, { expiresIn: ACCESS_EXPIRES })
}
export function signRefreshToken(payload: JwtUser & { ver: number }): string {
  return jwt.sign(payload, REFRESH_SECRET, { expiresIn: REFRESH_EXPIRES })
}

/** ====== 쿠키 세팅/삭제 ====== */
export function setAccessCookie(res: Response, token: string) {
  // access cookie는 보통 짧게. 필요시 maxAge 생략 가능
  res.cookie(ACCESS_COOKIE, token, { ...baseCookieOpts, maxAge: 1000 * 60 * 15 }) // 15m
}
export function setRefreshCookie(res: Response, token: string) {
  res.cookie(REFRESH_COOKIE, token, { ...baseCookieOpts, maxAge: 1000 * 60 * 60 * 24 * 30 }) // 30d
}
export function clearAccessCookie(res: Response) {
  res.clearCookie(ACCESS_COOKIE, { ...baseCookieOpts, maxAge: 0 })
}
export function clearRefreshCookie(res: Response) {
  res.clearCookie(REFRESH_COOKIE, { ...baseCookieOpts, maxAge: 0 })
}

/** ====== 토큰 추출 ====== */
export function getAccessTokenFromReq(req: Request): string | undefined {
  const bearer = req.headers.authorization
  const fromHeader = bearer?.startsWith('Bearer ') ? bearer.slice(7) : undefined
  const fromCookie = (req as any).cookies?.[ACCESS_COOKIE] as string | undefined
  return fromHeader || fromCookie
}

/** ====== 미들웨어 ====== */
export function requireAuth(req: Request & { user?: JwtUser }, res: Response, next: NextFunction) {
  const token = getAccessTokenFromReq(req)
  if (!token) return res.status(401).json({ error: 'UNAUTHORIZED' })
  try {
    const payload = jwt.verify(token, ACCESS_SECRET) as JwtUser
    req.user = payload
    next()
  } catch {
    return res.status(401).json({ error: 'UNAUTHORIZED' })
  }
}

export function requireRole(role: Role) {
  return (req: Request & { user?: JwtUser }, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ error: 'UNAUTHORIZED' })
    const ok = req.user.role === 'ADMIN' || req.user.role === role
    if (!ok) return res.status(403).json({ error: 'FORBIDDEN' })
    next()
  }
}

/** 관리자 전용 숏컷 */
export function requireAdmin(req: Request & { user?: JwtUser }, res: Response, next: NextFunction) {
  if (!req.user) return res.status(401).json({ error: 'UNAUTHORIZED' })
  if (req.user.role !== 'ADMIN') return res.status(403).json({ error: 'FORBIDDEN' })
  next()
}

/** ====== (선택) Request 타입 보강 ====== */
// 별도 파일(src/types/express.d.ts)로 분리해도 OK
declare global {
  namespace Express {
    interface Request {
      user?: JwtUser
    }
  }
}
