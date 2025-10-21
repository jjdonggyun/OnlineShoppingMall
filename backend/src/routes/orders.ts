import { Router } from 'express'
import { requireAuth } from '../auth'
import Product from '../models/Product'
import Cart from '../models/Cart'
import Order from '../models/Order'

const r = Router()

// ──────────────────────────────── 바로구매
r.post('/single', requireAuth, async (req: any, res) => {
    try {
        const { productId, qty, option, paymentMethod } = req.body || {}
        if (!productId) return res.status(400).json({ error: 'BAD_REQUEST' })

        const product = await Product.findById(productId).lean()
        if (!product) return res.status(404).json({ error: 'NOT_FOUND' })

        const price = product.price
        const qtyNum = Math.max(1, Number(qty) || 1)
        const totalPrice = price * qtyNum

        const order = await Order.create({
            user: req.user.uid,
            items: [{ product: product._id, qty: qtyNum, price, option }],
            totalPrice,
            paymentMethod: paymentMethod || 'CARD',
            status: 'PENDING',
        })

        res.status(201).json({ id: String(order._id), totalPrice: order.totalPrice })
    } catch (e) {
        console.error(e)
        res.status(500).json({ error: 'SERVER_ERROR' })
    }
})

// ──────────────────────────────── 장바구니 선택상품 구매
r.post('/from-cart', requireAuth, async (req: any, res) => {
    try {
        const { lines } = req.body || {}
        if (!Array.isArray(lines)) return res.status(400).json({ error: 'BAD_REQUEST' })

        const cart = await Cart.findOne({ user: req.user.uid }).populate('items.product').lean()
        if (!cart || !cart.items.length) return res.status(404).json({ error: 'CART_EMPTY' })

        const selected = cart.items.filter((_it, idx) => lines.includes(idx))
        if (selected.length === 0) return res.status(400).json({ error: 'NO_ITEMS' })

        const items = selected.map(i => {
            const p = i.product as any  // ✅ populate된 Product 문서로 캐스팅
            return {
                product: p._id,
                qty: i.qty,
                price: p.price,
                option: i.option
            }
        })

        const totalPrice = items.reduce((sum, i) => sum + i.qty * i.price, 0)

        const order = await Order.create({
            user: req.user.uid,
            items,
            totalPrice,
            paymentMethod: 'CARD',
            status: 'PENDING'
        })

        // 선택한 항목을 장바구니에서 제거
        const keep = cart.items.filter((_it, idx) => !lines.includes(idx))
        await Cart.updateOne({ user: req.user.uid }, { $set: { items: keep } })

        res.status(201).json({ id: String(order._id), totalPrice: order.totalPrice })
    } catch (e) {
        console.error(e)
        res.status(500).json({ error: 'SERVER_ERROR' })
    }
})

// ──────────────────────────────── 내 주문 목록
r.get('/my', requireAuth, async (req: any, res) => {
    try {
        const list = await Order.find({ user: req.user.uid })
            .sort({ createdAt: -1 })
            .populate('items.product', 'name images price')
            .lean()

        res.json(list.map(o => ({
            id: String(o._id),
            totalPrice: o.totalPrice,
            status: o.status,
            createdAt: o.createdAt,
            items: o.items.map((i: any) => ({
                name: i.product?.name || '(삭제된 상품)',
                price: i.price,
                qty: i.qty,
                image: i.product?.images?.[0] || null,
                option: i.option,
            }))
        })))
    } catch (e) {
        res.status(500).json({ error: 'SERVER_ERROR' })
    }
})

export default r
