import 'dotenv/config'
import { connectDB } from './db'
import User from './models/User'
import bcrypt from 'bcrypt'

async function main() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/shopmall'
  await connectDB(uri)

  const email = process.env.ADMIN_EMAIL || 'admin@example.com'
  const rawPassword = process.env.ADMIN_PASSWORD || 'admin1234'
  const passwordHash = await bcrypt.hash(rawPassword, 10)

  // 기존 문서가 있어도 role/verified는 항상 보정
  await User.updateOne(
    { email },
    {
      $set: {
        role: 'ADMIN',
        verified: true,              // ← 스키마가 isVerified면 isVerified: true
        emailVerified: true,
        verifyToken: undefined,      // 남아 있으면 인증 요구될 수 있어서 제거
        emailVerifiedAt: new Date(), // 필드가 있으면 같이 업데이트
      },
      $setOnInsert: {
        email,
        passwordHash, // 최초 생성시에만 비번 해시 입력
      },
    },
    { upsert: true }
  )

  console.log(`Admin ready: ${email} pw=${rawPassword}`)
  process.exit(0)
}

main().catch(e => { console.error(e); process.exit(1) })
