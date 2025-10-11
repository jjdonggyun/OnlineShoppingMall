// routes/cart.ts (네가 보낸 기존 파일에 최소 수정)
import { Router } from 'express'
import { Types } from 'mongoose'
import { requireAuth } from '../auth'
import Cart from '../models/Cart'
import Product from '../models/Product'
import { hydrateCart } from '../utils/cart'

const r = Router()

async function ensureCart(userId: string) {
  let cart = await Cart.findOne({ user: userId })
  if (!cart) cart = await Cart.create({ user: userId, items: [] })
  return cart
}

// 동일 옵션 판별 키
const keyOf = (i: any) =>
  `${String(i.product)}::${i.option?.sku ?? `${i.option?.variantIndex ?? ''}-${i.option?.size ?? ''}`}`



// PUT /api/cart/items/line/:line   { option }
r.put('/items/line/:line', requireAuth, async (req: any, res) => {
  const line = Number(req.params.line)
  const { option } = req.body || {}

  if (!Number.isFinite(line) || line < 0) {
    return res.status(400).json({ error: 'BAD_LINE' })
  }

  const cart = await ensureCart(req.user.uid)
  if (line >= cart.items.length) {
    return res.status(404).json({ error: 'NOT_IN_CART' })
  }

  const target = cart.items[line]
  const productId = String(target.product)

  // 옵션형 상품이면 option 필수 검증
  const product = await Product.findById(productId).lean()
  if (!product) return res.status(404).json({ error: 'NOT_FOUND' })
  const requiresOption = Array.isArray((product as any).variants) && (product as any).variants.length > 0
  if (requiresOption) {
    const ok = option && typeof option === 'object' && option.size && (option.variantIndex !== undefined)
    if (!ok) return res.status(400).json({ error: 'OPTION_REQUIRED' })
  }

  // 변경하려는 옵션으로 key 생성
  const newItem = { product: target.product, option: option || undefined }
  const newKey = keyOf(newItem as any)

  // "같은 상품 + 같은 옵션" 라인이 이미 있으면 수량 합치고 현재 라인은 제거(머지)
  const existingIdx = cart.items.findIndex((i, idx) => idx !== line && keyOf(i) === newKey)
  if (existingIdx >= 0) {
    cart.items[existingIdx].qty += target.qty
    cart.items.splice(line, 1)
  } else {
    // 단순 옵션만 교체
    target.option = option || undefined
  }

  await cart.save()
  res.json(await hydrateCart(cart))
})

r.patch('/items/line/:line', requireAuth, async (req: any, res) => {
  const line = Number(req.params.line)
  const { qty } = req.body || {}
  if (!Number.isFinite(line) || line < 0) return res.status(400).json({ error: 'BAD_LINE' })
  const n = Number(qty)
  if (!Number.isFinite(n)) return res.status(400).json({ error: 'BAD_QTY' })

  const cart = await ensureCart(req.user.uid)
  if (line >= cart.items.length) return res.status(404).json({ error: 'NOT_IN_CART' })

  if (n <= 0) cart.items.splice(line, 1)
  else cart.items[line].qty = n

  await cart.save()
  res.json(await hydrateCart(cart))
})

// [추가] 라인별 삭제
r.delete('/items/line/:line', requireAuth, async (req: any, res) => {
  const line = Number(req.params.line)
  if (!Number.isFinite(line) || line < 0) return res.status(400).json({ error: 'BAD_LINE' })

  const cart = await ensureCart(req.user.uid)
  if (line >= cart.items.length) return res.status(404).json({ error: 'NOT_IN_CART' })

  cart.items.splice(line, 1)
  await cart.save()
  res.json(await hydrateCart(cart))
})


// GET 그대로
r.get('/', requireAuth, async (req: any, res) => {
  const cart = await ensureCart(req.user.uid)
  const data = await hydrateCart(cart)
  res.json(data)
})

// 아이템 추가 { productId, qty?, option? }
r.post('/items', requireAuth, async (req: any, res) => {
  const { productId, qty, option } = req.body || {}
  if (!productId) return res.status(400).json({ error: 'BAD_REQUEST' })
  if (!Types.ObjectId.isValid(productId)) return res.status(400).json({ error: 'BAD_PRODUCT' })

  const product = await Product.findById(productId).lean()
  if (!product) return res.status(404).json({ error: 'NOT_FOUND' })

  const requiresOption = Array.isArray((product as any).variants) && (product as any).variants.length > 0
  if (requiresOption) {
    const ok = option && typeof option === 'object' && option.size && (option.variantIndex !== undefined)
    if (!ok) return res.status(400).json({ error: 'OPTION_REQUIRED' })
  }

  const addQty = Math.max(1, Number(qty) || 1)
  const cart = await ensureCart(req.user.uid)

  const keyOf = (i: any) =>
    `${String(i.product)}::${i.option?.sku ?? `${i.option?.variantIndex ?? ''}-${i.option?.size ?? ''}`}`

  const newItem = { product: new Types.ObjectId(productId), qty: addQty, option: option || undefined }
  const idx = cart.items.findIndex(i => keyOf(i) === keyOf(newItem as any))
  if (idx >= 0) cart.items[idx].qty += addQty
  else cart.items.push(newItem as any)

  await cart.save()
  res.status(201).json(await hydrateCart(cart))
})

// 수량 수정 { qty } (하위호환: productId의 '첫 매칭 라인'만 수정)
r.patch('/items/:productId', requireAuth, async (req: any, res) => {
  const { productId } = req.params
  const { qty } = req.body || {}
  if (!Types.ObjectId.isValid(productId)) return res.status(400).json({ error: 'BAD_PRODUCT' })

  const cart = await ensureCart(req.user.uid)
  const idx = cart.items.findIndex(i => String(i.product) === productId)
  if (idx < 0) return res.status(404).json({ error: 'NOT_IN_CART' })

  const n = Number(qty)
  if (!Number.isFinite(n)) return res.status(400).json({ error: 'BAD_QTY' })

  if (n <= 0) cart.items.splice(idx, 1)
  else cart.items[idx].qty = n

  await cart.save()
  const data = await hydrateCart(cart)
  res.json(data)
})

// 아이템 제거 (하위호환: 해당 product의 모든 라인 삭제)
r.delete('/items/:productId', requireAuth, async (req: any, res) => {
  const { productId } = req.params
  if (!Types.ObjectId.isValid(productId)) return res.status(400).json({ error: 'BAD_PRODUCT' })
  const cart = await ensureCart(req.user.uid)

  const before = cart.items.length
  cart.items = cart.items.filter(i => String(i.product) !== productId)
  if (cart.items.length === before) return res.status(404).json({ error: 'NOT_IN_CART' })

  await cart.save()
  const data = await hydrateCart(cart)
  res.json(data)
})

// 전체 비우기 그대로
r.post('/clear', requireAuth, async (req: any, res) => {
  const cart = await ensureCart(req.user.uid)
  cart.items = []
  await cart.save()
  const data = await hydrateCart(cart)
  res.json(data)
})

// 병합 { items:[{productId, qty, option?}] }
r.post('/merge', requireAuth, async (req: any, res) => {
  const items: Array<{ productId: string; qty: number; option?: any }> =
    Array.isArray(req.body?.items) ? req.body.items : []

  const cart = await ensureCart(req.user.uid)

  for (const it of items) {
    const { productId, qty, option } = it || {}
    if (!Types.ObjectId.isValid(productId)) continue
    const q = Math.max(1, Number(qty) || 1)

    const product = await Product.findById(productId).lean()
    if (!product) continue

    const requiresOption = Array.isArray((product as any).variants) && (product as any).variants.length > 0
    if (requiresOption) {
      const ok = option && typeof option === 'object' && option.size && (option.variantIndex !== undefined)
      if (!ok) continue
    }

    const newItem = { product: new Types.ObjectId(productId), qty: q, option: option || undefined }
    const idx = cart.items.findIndex(i => keyOf(i) === keyOf(newItem as any))
    if (idx >= 0) cart.items[idx].qty += q
    else cart.items.push(newItem as any)
  }

  await cart.save()
  const data = await hydrateCart(cart)
  res.json(data)
})

export default r
