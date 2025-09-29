import { Router } from 'express'
import { z } from 'zod'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import { v4 as uuidv4 } from 'uuid'
import User from '../models/User'
import {
  clearRefreshCookie,
  setRefreshCookie,
  setAccessCookie,          // ★ 추가: access 토큰도 쿠키로
  signAccessToken,
  signRefreshToken
} from '../auth'
import { sendMail, buildVerifyEmailTemplate } from '../utils/mailer'

const r = Router()

// ====== DTO ======
const RegisterDTO = z.object({
  email: z.string().email(),
  password: z.string().min(6)
})
const LoginDTO = z.object({
  email: z.string().email(),
  password: z.string().min(6)
})
const ResendDTO = z.object({ email: z.string().email() })

// ====== 유틸: 요청에서 Access 토큰 읽기 (헤더 or 쿠키) ======
function getAccessTokenFromReq(req: any): string | undefined {
  const hdr: string | undefined = req.headers?.authorization
  const fromHeader = hdr?.startsWith('Bearer ') ? hdr.slice(7) : undefined
  const fromCookie: string | undefined = req.cookies?.at
  return fromHeader || fromCookie
}

// 1) 회원가입: 메일 성공 후 DB 저장
r.post('/register', async (req, res) => {
  const parsed = RegisterDTO.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ error: 'BAD_REQUEST', details: parsed.error.flatten() })
  }
  const dto = parsed.data

  // A. 중복 검사
  const exists = await User.findOne({ email: dto.email })
  if (exists) return res.status(409).json({ error: 'EMAIL_EXISTS' })

  // B. 값 준비
  const passwordHash = await bcrypt.hash(dto.password, 10)
  const token = uuidv4()
  const expires = new Date(Date.now() + 1000 * 60 * 60 * 24) // 24h

  // C. 메일 먼저 발송
  const verifyUrl = `${process.env.CLIENT_URL}/verify-email?token=${token}&email=${encodeURIComponent(dto.email)}`
  try {
    await sendMail(dto.email, '이메일 인증을 완료해 주세요', buildVerifyEmailTemplate(verifyUrl))
  } catch (err) {
    console.error('[register] sendMail failed:', err)
    return res.status(502).json({ error: 'MAIL_SEND_FAILED' })
  }

  // D. 메일 성공 → DB 저장
  try {
    const user = new User({
      email: dto.email,
      passwordHash,
      role: 'USER',
      emailVerified: false,
      verificationToken: token,
      verificationTokenExpires: expires,
      tokenVersion: 0,
    })
    await user.save()
  } catch (err: any) {
    if (err?.code === 11000) {
      return res.status(409).json({ error: 'EMAIL_EXISTS' })
    }
    console.error('[register] save failed:', err)
    return res.status(500).json({ error: 'SERVER_ERROR' })
  }

  return res.status(201).json({ ok: true, message: '가입 완료. 이메일을 확인하세요.' })
})

// 2) 로그인: 이메일 미인증은 거부, 성공 시 at/rt 쿠키 설정
r.post('/login', async (req, res) => {
  const parsed = LoginDTO.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ error: 'BAD_REQUEST', details: parsed.error.flatten() })
  }
  const { email, password } = parsed.data

  const user = await User.findOne({ email })
  if (!user) return res.status(401).json({ error: 'INVALID_CREDENTIALS' })

  const ok = await bcrypt.compare(password, user.passwordHash)
  if (!ok) return res.status(401).json({ error: 'INVALID_CREDENTIALS' })

  if (!user.emailVerified) {
    return res.status(403).json({ error: 'EMAIL_NOT_VERIFIED' })
  }

  const access = signAccessToken({ uid: String(user._id), role: user.role as any })
  const refresh = signRefreshToken({ uid: String(user._id), role: user.role as any, ver: user.tokenVersion ?? 0 })

  // ★ Access/Refresh 모두 쿠키로 내려서 이후 요청에 자동 첨부되게 함
  setAccessCookie(res, access)     // Path='/' , HttpOnly
  setRefreshCookie(res, refresh)   // Path='/' , HttpOnly

  return res.json({
    user: { id: String(user._id), email: user.email, role: user.role }
    // accessToken 바디로 내려줄 필요 없음(쿠키로 사용). 필요하면 아래 주석 해제:
    // , accessToken: access
  })
})

// 3) 이메일 인증 완료
r.get('/verify-email', async (req, res) => {
  const token = String(req.query.token || '')
  const email = String(req.query.email || '')
  if (!token || !email) return res.status(400).json({ error: 'BAD_REQUEST' })

  const user = await User.findOne({ email })
  if (!user) return res.status(404).json({ error: 'NOT_FOUND' })

  if (user.emailVerified) {
    return res.json({ ok: true, message: '이미 이메일 인증이 완료되었습니다.' })
  }

  if (!user.verificationToken || user.verificationToken !== token) {
    return res.status(400).json({ error: 'INVALID_TOKEN' })
  }
  if (!user.verificationTokenExpires || user.verificationTokenExpires < new Date()) {
    return res.status(400).json({ error: 'TOKEN_EXPIRED' })
  }

  user.emailVerified = true
  user.verificationToken = null
  user.verificationTokenExpires = null
  await user.save()

  return res.json({ ok: true, message: '이메일 인증 완료' })
})

// 4) 인증 메일 재발송
r.post('/resend-verification', async (req, res) => {
  const parsed = ResendDTO.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ error: 'BAD_REQUEST', details: parsed.error.flatten() })
  }
  const { email } = parsed.data

  const user = await User.findOne({ email })
  if (!user) return res.status(404).json({ error: 'NOT_FOUND' })
  if (user.emailVerified) return res.status(400).json({ error: 'ALREADY_VERIFIED' })

  const token = uuidv4()
  user.verificationToken = token
  user.verificationTokenExpires = new Date(Date.now() + 1000 * 60 * 60 * 24)
  await user.save()

  const verifyUrl = `${process.env.CLIENT_URL}/verify-email?token=${token}&email=${encodeURIComponent(email)}`
  try {
    await sendMail(email, '이메일 인증 다시 보내기', buildVerifyEmailTemplate(verifyUrl))
  } catch (err) {
    console.error('[resend-verification] sendMail failed:', err)
    return res.status(502).json({ error: 'MAIL_SEND_FAILED' })
  }

  return res.json({ ok: true, message: '인증 메일 재발송' })
})

// 5) 토큰 재발급(refresh): rt 쿠키 검증 → 새 at/rt 발급 + 쿠키로 재세팅
r.post('/refresh', async (req: any, res) => {
  const token: string | undefined = req.cookies?.rt
  if (!token) return res.status(401).json({ error: 'NO_REFRESH' })

  try {
    const payload = jwt.verify(token, process.env.JWT_REFRESH_SECRET!) as { uid:string; role:'USER'|'ADMIN'; ver:number }
    const user = await User.findById(payload.uid)
    if (!user) return res.status(401).json({ error: 'INVALID_REFRESH' })
    if (user.tokenVersion !== payload.ver) return res.status(401).json({ error: 'ROTATED' })

    const access = signAccessToken({ uid: String(user._id), role: user.role as any })
    const refresh = signRefreshToken({ uid: String(user._id), role: user.role as any, ver: user.tokenVersion ?? 0 })

    setAccessCookie(res, access)   // ★ 추가
    setRefreshCookie(res, refresh)

    return res.json({ ok: true })
    // 필요하면 accessToken 바디로도:
    // return res.json({ accessToken: access })
  } catch {
    return res.status(401).json({ error: 'INVALID_REFRESH' })
  }
})

// 6) 로그아웃: rt/at 쿠키 제거
r.post('/logout', async (_req, res) => {
  clearRefreshCookie(res) // rt
  // at도 제거
  const secure = process.env.COOKIE_SECURE === 'true'
  const domain = process.env.COOKIE_DOMAIN || 'localhost'
  res.clearCookie('at', {
    httpOnly: true,
    secure,
    sameSite: secure ? 'none' : 'lax',
    ...(domain !== 'localhost' ? { domain } : {}),
    path: '/', // setAccessCookie와 동일
  })
  return res.json({ ok: true })
})

// 7) 내 정보: 헤더 or 쿠키에서 access 검증
r.get('/me', async (req: any, res) => {
  const token = getAccessTokenFromReq(req)
  if (!token) return res.status(401).json({ error: 'UNAUTHORIZED' })
  try {
    const payload = jwt.verify(token, process.env.JWT_ACCESS_SECRET!) as { uid: string, role: 'USER'|'ADMIN' }
    const user = await User.findById(payload.uid)
    if (!user) return res.status(404).json({ error: 'NOT_FOUND' })
    return res.json({ id: String(user._id), email: user.email, role: user.role })
  } catch {
    return res.status(401).json({ error: 'UNAUTHORIZED' })
  }
})

export default r
