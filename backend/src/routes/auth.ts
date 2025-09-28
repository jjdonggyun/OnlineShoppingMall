import { Router } from 'express'
import { z } from 'zod'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import { v4 as uuidv4 } from 'uuid'
import User from '../models/User'
import { clearRefreshCookie, setRefreshCookie, signAccessToken, signRefreshToken } from '../auth'
import { sendMail, buildVerifyEmailTemplate } from '../utils/mailer'

const r = Router()

const RegisterDTO = z.object({
  email: z.string().email(),
  password: z.string().min(6)
})
const LoginDTO = z.object({
  email: z.string().email(),
  password: z.string().min(6)
})
const ResendDTO = z.object({ email: z.string().email() })

// 1) 회원가입 (개선): 메일 성공 후 저장
r.post('/register', async (req, res) => {
  const dto = RegisterDTO.parse(req.body)

  // A. 미리 존재 검사
  const exists = await User.findOne({ email: dto.email })
  if (exists) return res.status(409).json({ error: 'EMAIL_EXISTS' })

  // B. 필요한 값들 생성
  const passwordHash = await bcrypt.hash(dto.password, 10)
  const token = uuidv4()
  const expires = new Date(Date.now() + 1000 * 60 * 60 * 24) // 24h

  // C. 먼저 메일 전송 시도 (실패 시 DB에 아무것도 저장 안 됨)
  const verifyUrl = `${process.env.CLIENT_URL}/verify-email?token=${token}&email=${encodeURIComponent(dto.email)}`
  try {
    await sendMail(dto.email, '이메일 인증을 완료해 주세요', buildVerifyEmailTemplate(verifyUrl))
  } catch (err) {
    console.error('[register] sendMail failed:', err)
    return res.status(502).json({ error: 'MAIL_SEND_FAILED' }) // 502 Bad Gateway 의미상 적절
  }

  // D. 메일 성공했으니 이제 DB 저장
  try {
    const user = new User({
      email: dto.email,
      passwordHash,
      role: 'USER',
      emailVerified: false,
      verificationToken: token,
      verificationTokenExpires: expires,
    })
    await user.save()
  } catch (err: any) {
    // 메일과 DB 사이 경쟁 상태 방어(E11000: duplicate key)
    if (err?.code === 11000) {
      return res.status(409).json({ error: 'EMAIL_EXISTS' })
    }
    console.error('[register] save failed:', err)
    return res.status(500).json({ error: 'SERVER_ERROR' })
  }

  return res.status(201).json({ ok: true, message: '가입 완료. 이메일을 확인하세요.' })
})

// 2) 로그인: 미인증 거부
r.post('/login', async (req, res) => {
  const { email, password } = LoginDTO.parse(req.body)
  const user = await User.findOne({ email })
  if (!user) return res.status(401).json({ error: 'INVALID_CREDENTIALS' })

  const ok = await bcrypt.compare(password, user.passwordHash)
  if (!ok) return res.status(401).json({ error: 'INVALID_CREDENTIALS' })

  if (!user.emailVerified) {
    return res.status(403).json({ error: 'EMAIL_NOT_VERIFIED' })
  }

  const access = signAccessToken({ uid: String(user._id), role: user.role as any })
  const refresh = signRefreshToken({ uid: String(user._id), role: user.role as any, ver: user.tokenVersion })
  setRefreshCookie(res, refresh)
  return res.json({ accessToken: access, user: { id: String(user._id), email: user.email, role: user.role } })
})

// 3) 이메일 인증 완료
r.get('/verify-email', async (req, res) => {
  const token = String(req.query.token || '')
  const email = String(req.query.email || '')
  if (!token || !email) return res.status(400).json({ error: 'BAD_REQUEST' })

  // ① 이메일로 먼저 사용자 찾기
  const user = await User.findOne({ email })
  if (!user) return res.status(404).json({ error: 'NOT_FOUND' })

  // ② 이미 인증된 경우: 토큰 없어도 OK 처리
  if (user.emailVerified) {
    return res.json({ ok: true, message: '이미 이메일 인증이 완료되었습니다.' })
  }

  // ③ 토큰 일치/만료 확인
  if (!user.verificationToken || user.verificationToken !== token) {
    return res.status(400).json({ error: 'INVALID_TOKEN' })
  }
  if (!user.verificationTokenExpires || user.verificationTokenExpires < new Date()) {
    return res.status(400).json({ error: 'TOKEN_EXPIRED' })
  }

  // ④ 인증 처리
  user.emailVerified = true
  user.verificationToken = null
  user.verificationTokenExpires = null
  await user.save()

  return res.json({ ok: true, message: '이메일 인증 완료' })
})


// 4) 인증 메일 재발송
r.post('/resend-verification', async (req, res) => {
  const { email } = ResendDTO.parse(req.body)
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

// 5) refresh / logout / me 그대로
r.post('/refresh', async (req, res) => {
  const token = req.cookies?.rt
  if (!token) return res.status(401).json({ error: 'NO_REFRESH' })
  try {
    const payload = jwt.verify(token, process.env.JWT_REFRESH_SECRET!) as { uid:string; role:'USER'|'ADMIN'; ver:number }
    const user = await User.findById(payload.uid)
    if (!user) return res.status(401).json({ error: 'INVALID_REFRESH' })
    if (user.tokenVersion !== payload.ver) return res.status(401).json({ error: 'ROTATED' })

    const access = signAccessToken({ uid: String(user._id), role: user.role as any })
    const refresh = signRefreshToken({ uid: String(user._id), role: user.role as any, ver: user.tokenVersion })
    setRefreshCookie(res, refresh)
    return res.json({ accessToken: access })
  } catch {
    return res.status(401).json({ error: 'INVALID_REFRESH' })
  }
})

r.post('/logout', async (_req, res) => {
  clearRefreshCookie(res)
  return res.json({ ok: true })
})

r.get('/me', async (req, res) => {
  const hdr = req.headers.authorization
  if (!hdr?.startsWith('Bearer ')) return res.status(401).json({error:'UNAUTHORIZED'})
  try {
    const payload = (await import('jsonwebtoken')).default.verify(hdr.slice(7), process.env.JWT_ACCESS_SECRET!) as any
    const user = await User.findById(payload.uid)
    if (!user) return res.status(404).json({ error: 'NOT_FOUND' })
    return res.json({ id: String(user._id), email: user.email, role: user.role })
  } catch {
    return res.status(401).json({error:'UNAUTHORIZED'})
  }
})

export default r
