// backend/index.ts
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
import bannersRouter from './routes/banners'
import collectionsRouter from './routes/collections'

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
app.use('/api/banners', bannersRouter)
app.use('/api/collections', collectionsRouter)

const port = process.env.PORT || 4000
const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/shopmall'

connectDB(uri).then(async () => {
  app.listen(port, () => console.log(`API on http://localhost:${port}`))
})
