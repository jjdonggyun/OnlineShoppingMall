import 'dotenv/config'
import { connectDB } from './db'
import User from './models/User'
import bcrypt from 'bcrypt'

async function main(){
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/shopmall'
  await connectDB(uri)
  const email = 'admin@example.com'
  const passwordHash = await bcrypt.hash('admin1234', 10)
  await User.updateOne({ email }, { $setOnInsert: { email, passwordHash, role: 'ADMIN' } }, { upsert: true })
  console.log('Admin ready:', email, 'pw=admin1234')
  process.exit(0)
}
main().catch(e=>{ console.error(e); process.exit(1) })
