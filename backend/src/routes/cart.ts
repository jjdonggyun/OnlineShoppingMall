// GET /api/cart : 내 장바구니 조회
// POST /api/cart/items : 아이템 추가(있으면 수량 가산)
// PATCH /api/cart/items/:productId : 수량 수정(0 이하면 삭제)
// DELETE /api/cart/items/:productId : 아이템 제거\
// (옵션) POST /api/cart/clear : 전체 비우기

import { Router } from 'express'
import { Types } from 'mongoose'
import { requireAuth } from '../auth'
import Cart from '../models/Cart'
import Product from '../models/Product'
import { hydrateCart } from '../utils/cart'

const r = Router()

// 현재 로그인 유저의 카트를 가져오거나 없으면 생성
async function ensureCart(userId: string) {
  let cart = await Cart.findOne({ user: userId })
  if (!cart) cart = await Cart.create({ user: userId, items: [] })
  return cart
}

// 내 장바구니 조회
r.get('/', requireAuth, async (req: any, res) => {
  const cart = await ensureCart(req.user.uid)
  const data = await hydrateCart(cart)
  res.json(data)
})

// 아이템 추가 { productId, qty? } (qty 기본 1)
r.post('/items', requireAuth, async (req: any, res) => {
  const { productId, qty } = req.body || {}
  if (!productId) return res.status(400).json({ error: 'BAD_REQUEST' })
  if (!Types.ObjectId.isValid(productId)) return res.status(400).json({ error: 'BAD_PRODUCT' })

  const product = await Product.findById(productId).lean()
  if (!product) return res.status(404).json({ error: 'NOT_FOUND' })

  const addQty = Math.max(1, Number(qty) || 1)
  const cart = await ensureCart(req.user.uid)

  const idx = cart.items.findIndex(i => String(i.product) === productId)
  if (idx >= 0) cart.items[idx].qty += addQty
  else cart.items.push({ product: new Types.ObjectId(productId), qty: addQty })

  await cart.save()
  const data = await hydrateCart(cart)
  res.status(201).json(data)
})

// 수량 수정 { qty }
r.patch('/items/:productId', requireAuth, async (req: any, res) => {
  const { productId } = req.params
  const { qty } = req.body || {}
  if (!Types.ObjectId.isValid(productId)) return res.status(400).json({ error: 'BAD_PRODUCT' })

  const cart = await ensureCart(req.user.uid)
  const idx = cart.items.findIndex(i => String(i.product) === productId)
  if (idx < 0) return res.status(404).json({ error: 'NOT_IN_CART' })

  const n = Number(qty)
  if (!Number.isFinite(n)) return res.status(400).json({ error: 'BAD_QTY' })

  if (n <= 0) {
    cart.items.splice(idx, 1)
  } else {
    cart.items[idx].qty = n
  }
  await cart.save()
  const data = await hydrateCart(cart)
  res.json(data)
})

// 아이템 제거
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

// 전체 비우기(선택)
r.post('/clear', requireAuth, async (req: any, res) => {
  const cart = await ensureCart(req.user.uid)
  cart.items = []
  await cart.save()
  const data = await hydrateCart(cart)
  res.json(data)
})

r.post('/merge', requireAuth, async (req: any, res) => {
  const items: Array<{ productId: string; qty: number }> = Array.isArray(req.body?.items) ? req.body.items : []
  if (!items.length) {
    const cart = await ensureCart(req.user.uid)
    const data = await hydrateCart(cart)
    return res.json(data)
  }

  const cart = await ensureCart(req.user.uid)

  for (const it of items) {
    const { productId, qty } = it || {}
    if (!Types.ObjectId.isValid(productId)) continue
    const q = Math.max(1, Number(qty) || 1)

    const exists = await Product.exists({ _id: productId })
    if (!exists) continue

    const idx = cart.items.findIndex(i => String(i.product) === productId)
    if (idx >= 0) cart.items[idx].qty += q
    else cart.items.push({ product: new Types.ObjectId(productId), qty: q })
  }

  await cart.save()
  const data = await hydrateCart(cart)
  res.json(data)
})

export default r
