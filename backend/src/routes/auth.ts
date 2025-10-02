import { Router } from 'express'
import { z } from 'zod'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import User from '../models/User'
import PhoneVerification from '../models/PhoneVerification'
import {
  clearRefreshCookie, setRefreshCookie, setAccessCookie,
  signAccessToken, signRefreshToken
} from '../auth'

const r = Router()

// ===== helpers =====
function getAccessTokenFromReq(req: any): string | undefined {
  const hdr: string | undefined = req.headers?.authorization
  const fromHeader = hdr?.startsWith('Bearer ') ? hdr.slice(7) : undefined
  const fromCookie: string | undefined = req.cookies?.at
  return fromHeader || fromCookie
}
function signPhoneToken(phone: string) {
  return jwt.sign({ phone }, process.env.PHONE_TOKEN_SECRET!, { expiresIn: '10m' })
}
function verifyPhoneToken(token: string): string | null {
  try {
    const p = jwt.verify(token, process.env.PHONE_TOKEN_SECRET!) as { phone:string }
    return p.phone
  } catch { return null }
}

// ===== DTO =====
const BirthDTO = z.object({
  year: z.number().int().gte(1900).lte(2100),
  month: z.number().int().gte(1).lte(12),
  day: z.number().int().gte(1).lte(31),
}).optional()

const RegisterDTO = z.object({
  email: z.string().email(),
  password: z.string().min(6),

  name: z.string().min(1),
  userId: z.string().min(4).max(20).regex(/^[a-zA-Z0-9_.-]+$/),
  phone: z.string().min(10).max(13),
  birth: BirthDTO,
  smsOptIn: z.boolean(),
  emailOptIn: z.boolean(),
  recommenderId: z.string().trim().optional().nullable(),

  // ★ 휴대폰 인증 성공 시 받은 토큰 필수
  phoneToken: z.string().min(10),
})

const LoginDTO = z.object({ email: z.string().email(), password: z.string().min(6) })

// ===== 1) 휴대폰 인증코드 발송 =====
r.post('/phone/request', async (req, res) => {
  const phone: string = String(req.body?.phone || '').trim()
  if (!phone) return res.status(400).json({ error: 'BAD_REQUEST' })

  // 6자리 코드 생성
  const code = Math.floor(100000 + Math.random() * 900000).toString()
  const codeHash = await bcrypt.hash(code, 10)
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000) // 5분

  await PhoneVerification.findOneAndUpdate(
    { phone },
    { $set: { codeHash, expiresAt, attempts: 0, verified: false } },
    { upsert: true }
  )

  // 실제로는 여기서 SMS 발송(외부 서비스 연동)
  // 데브 환경에서는 코드 반환해 테스트 편하게!
  const payload: any = { ok: true }
  if (process.env.NODE_ENV !== 'production') payload.devCode = code
  return res.json(payload)
})

// ===== 2) 휴대폰 인증코드 검증 =====
r.post('/phone/verify', async (req, res) => {
  const phone: string = String(req.body?.phone || '').trim()
  const code: string = String(req.body?.code || '').trim()
  if (!phone || !code) return res.status(400).json({ error: 'BAD_REQUEST' })

  const pv = await PhoneVerification.findOne({ phone })
  if (!pv) return res.status(404).json({ error: 'NOT_FOUND' })
  if (pv.expiresAt < new Date()) return res.status(400).json({ error: 'CODE_EXPIRED' })
  if (pv.attempts >= 5) return res.status(429).json({ error: 'TOO_MANY_ATTEMPTS' })

  // 시도 증가
  pv.attempts += 1
  await pv.save()

  const ok = await bcrypt.compare(code, pv.codeHash)
  if (!ok) return res.status(401).json({ error: 'INVALID_CODE' })

  pv.verified = true
  await pv.save()

  const phoneToken = signPhoneToken(phone)
  return res.json({ ok: true, phoneToken })
})

// ===== 3) 회원가입 (휴대폰 인증 토큰 필수) =====
r.post('/register', async (req, res) => {
  const parsed = RegisterDTO.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'BAD_REQUEST', details: parsed.error.flatten() })
  const dto = parsed.data

  // 토큰 검증 및 번호 일치 확인
  const phoneFromToken = verifyPhoneToken(dto.phoneToken)
  if (!phoneFromToken || phoneFromToken !== dto.phone) {
    return res.status(403).json({ error: 'PHONE_NOT_VERIFIED' })
  }

  // 중복 검사
  const existsEmail = await User.findOne({ email: dto.email })
  if (existsEmail) return res.status(409).json({ error: 'EMAIL_EXISTS' })
  const existsUserId = await User.findOne({ userId: dto.userId.toLowerCase() })
  if (existsUserId) return res.status(409).json({ error: 'USERID_EXISTS' })

  const passwordHash = await bcrypt.hash(dto.password, 10)

  // 생일 -> Date
  let birth: Date | null = null
  if (dto.birth) {
    const { year, month, day } = dto.birth
    birth = new Date(Date.UTC(year, month - 1, day))
  }

  try {
    await User.create({
      email: dto.email,
      passwordHash,
      role: 'USER',
      tokenVersion: 0,

      name: dto.name,
      userId: dto.userId,
      phone: dto.phone,
      birth,
      smsOptIn: dto.smsOptIn,
      emailOptIn: dto.emailOptIn,
      recommenderId: dto.recommenderId ?? null,
    })
  } catch (err: any) {
    if (err?.code === 11000) {
      if (err?.keyPattern?.userId) return res.status(409).json({ error: 'USERID_EXISTS' })
      return res.status(409).json({ error: 'EMAIL_EXISTS' })
    }
    console.error('[register] save failed:', err)
    return res.status(500).json({ error: 'SERVER_ERROR' })
  }

  return res.status(201).json({ ok: true, message: '가입 완료되었습니다.' })
})

// ===== 4) 로그인 (이메일 인증 체크 제거) =====
r.post('/login', async (req, res) => {
  const parsed = LoginDTO.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'BAD_REQUEST', details: parsed.error.flatten() })
  const { email, password } = parsed.data

  const user = await User.findOne({ email })
  if (!user) return res.status(401).json({ error: 'INVALID_CREDENTIALS' })
  const ok = await bcrypt.compare(password, user.passwordHash)
  if (!ok) return res.status(401).json({ error: 'INVALID_CREDENTIALS' })

  const access  = signAccessToken({ uid: String(user._id), role: user.role as any })
  const refresh = signRefreshToken({ uid: String(user._id), role: user.role as any, ver: user.tokenVersion ?? 0 })
  setAccessCookie(res, access)
  setRefreshCookie(res, refresh)

  return res.json({ user: { id: String(user._id), email: user.email, role: user.role } })
})

// ===== 5) 내 정보/토큰 재발급/로그아웃 등 기존 그대로 =====
r.get('/me', async (req: any, res) => {
  const token = getAccessTokenFromReq(req)
  if (!token) return res.status(401).json({ error: 'UNAUTHORIZED' })
  try {
    const payload = jwt.verify(token, process.env.JWT_ACCESS_SECRET!) as { uid: string, role: 'USER'|'ADMIN' }
    const u = await User.findById(payload.uid)
    if (!u) return res.status(404).json({ error: 'NOT_FOUND' })
    return res.json({
      id: String(u._id),
      email: u.email,
      role: u.role,
      name: u.name,
      userId: u.userId,
      phone: u.phone,
      birth: u.birth,
      smsOptIn: u.smsOptIn,
      emailOptIn: u.emailOptIn,
      recommenderId: u.recommenderId,
    })
  } catch {
    return res.status(401).json({ error: 'UNAUTHORIZED' })
  }
})

// 내 정보 수정
r.put('/me', async (req: any, res) => {
  // 액세스 토큰 확인
  const hdr: string | undefined = req.headers?.authorization
  const fromHeader = hdr?.startsWith('Bearer ') ? hdr.slice(7) : undefined
  const token: string | undefined = fromHeader || req.cookies?.at
  if (!token) return res.status(401).json({ error: 'UNAUTHORIZED' })

  let uid: string
  try {
    const payload = jwt.verify(token, process.env.JWT_ACCESS_SECRET!) as { uid: string }
    uid = payload.uid
  } catch {
    return res.status(401).json({ error: 'UNAUTHORIZED' })
  }

  // 수정 허용 필드만
  const BirthDTO = z.object({
    year: z.number().int().gte(1900).lte(2100),
    month: z.number().int().gte(1).lte(12),
    day: z.number().int().gte(1).lte(31),
  }).optional()

  const UpdateDTO = z.object({
    name: z.string().min(1).optional(),
    phone: z.string().min(10).max(13).optional(), // 형식: 010-1234-5678
    smsOptIn: z.boolean().optional(),
    emailOptIn: z.boolean().optional(),
    birth: BirthDTO,
  })

  const parsed = UpdateDTO.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'BAD_REQUEST', details: parsed.error.flatten() })
  const dto = parsed.data

  const patch: any = {}
  if (dto.name !== undefined) patch.name = dto.name
  if (dto.phone !== undefined) patch.phone = dto.phone
  if (dto.smsOptIn !== undefined) patch.smsOptIn = dto.smsOptIn
  if (dto.emailOptIn !== undefined) patch.emailOptIn = dto.emailOptIn
  if (dto.birth) patch.birth = new Date(Date.UTC(dto.birth.year, dto.birth.month - 1, dto.birth.day))

  const u = await User.findByIdAndUpdate(uid, { $set: patch }, { new: true })
  if (!u) return res.status(404).json({ error: 'NOT_FOUND' })

  return res.json({
    id: String(u._id),
    email: u.email,
    role: u.role,
    name: u.name,
    userId: u.userId,
    phone: u.phone,
    birth: u.birth,
    smsOptIn: u.smsOptIn,
    emailOptIn: u.emailOptIn,
    recommenderId: u.recommenderId,
  })
})

export default r
