import 'dotenv/config'
import express from 'express'
import helmet from 'helmet'
import cors from 'cors'
import pinoHttp from 'pino-http'
import cookieParser from 'cookie-parser'
import { connectDB } from './db'
import authRoutes from './routes/auth'
import productRoutes from './routes/products'
import Product from './models/Product'

const app = express()
app.use(helmet())
app.use(cors({ origin: [/localhost:\d+$/], credentials: true }))
app.use(express.json())
app.use(cookieParser())
app.use(pinoHttp())

app.get('/api/health', (_req,res)=>res.json({ok:true}))
app.use('/api/auth', authRoutes)
app.use('/api/products', productRoutes)

const port = process.env.PORT || 4000
const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/shopmall'

connectDB(uri).then(async () => {
  // seed some products if empty
  const count = await Product.countDocuments()
  if (count === 0) {
    await Product.insertMany(
      Array.from({length: 12}).map((_,i)=> ({
        name: `소프트 니트 가디건 ${i+1}`,
        price: 39000 + i*1000,
        image: `https://picsum.photos/seed/fashion${i}/600/800`,
        badge: i % 3 === 0 ? 'NEW' : (i % 5 === 0 ? 'BEST' : undefined)
      }))
    )
    console.log('[seed] sample products inserted')
  }
  app.listen(port, () => console.log(`API on http://localhost:${port}`))
})
