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
import cartRouter from './routes/cart'
import path from 'path'

const app = express()

// dev: 모두 허용 / prod: 필요한 도메인만
if (process.env.NODE_ENV !== 'production') {
  app.use(cors({ origin: true, credentials: true }))
} else {
  app.use(cors({ origin: [/your\.domain$/], credentials: true }))
}


app.use(helmet())
app.use(cors({ origin: [/localhost:\d+$/], credentials: true }))
app.use(express.json())
app.use(cookieParser())
app.use(pinoHttp())

app.get('/api/health', (_req,res)=>res.json({ok:true}))
app.use('/api/auth', authRoutes)
app.use('/api/products', productRoutes)
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')))

app.use('/api/cart', cartRouter)

const port = process.env.PORT || 4000
const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/shopmall'

connectDB(uri).then(async () => {
  // // seed some products if empty
  // const count = await Product.countDocuments()
  // if (count === 0) {
  //   await Product.insertMany(
  //     Array.from({length: 12}).map((_,i)=> ({
  //       name: `소프트 니트 가디건 ${i+1}`,
  //       price: 39000 + i*1000,
  //       image: `https://picsum.photos/seed/fashion${i}/600/800`,
  //       badge: i % 3 === 0 ? 'NEW' : (i % 5 === 0 ? 'BEST' : undefined)
  //     }))
  //   )
  //   console.log('[seed] sample products inserted')
  // }
  app.listen(port, () => console.log(`API on http://localhost:${port}`))
})
