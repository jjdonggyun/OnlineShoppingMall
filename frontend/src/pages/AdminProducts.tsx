// pages/AdminProducts.tsx
import { useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import Nav from '../components/Nav'
import { useAuth } from '../stores/auth'
import type { Product } from '../types/product'

type AdminListResp = {
    page: number
    limit: number
    total: number
    pages: number
    items: (Product & {
        categories?: string[]
        updatedAt?: string
    })[]
}

function useAdminCategories() {
    return useQuery({
        queryKey: ['admin', 'categories'],
        queryFn: async () => {
            const r = await fetch('/api/products/admin/categories/distinct', { credentials: 'include' })
            if (!r.ok) return [] as string[]
            return r.json() as Promise<string[]>
        }
    })
}

function useAdminProducts(params: URLSearchParams) {
    const q = params.toString()
    return useQuery({
        queryKey: ['admin', 'products', q],
        queryFn: async () => {
            const r = await fetch(`/api/products/admin?${q}`, { credentials: 'include' })
            if (!r.ok) throw new Error('LOAD_FAIL')
            return r.json() as Promise<AdminListResp>
        }
    })
}

export default function AdminProducts() {
    const nav = useNavigate()
    const qc = useQueryClient()
    const { user } = useAuth(s => ({ user: s.user }))
    const [sp, setSp] = useSearchParams()

    useEffect(() => {
        if (!user || user.role !== 'ADMIN') nav('/', { replace: true })
    }, [user, nav])

    // URL 파라미터 기본값 주입
    useEffect(() => {
        const init = new URLSearchParams(sp)
        if (!init.get('page')) init.set('page', '1')
        if (!init.get('limit')) init.set('limit', '20')
        if (!init.get('status')) init.set('status', 'ALL')
        if (!init.get('category')) init.set('category', 'ALL')
        if (init.toString() !== sp.toString()) setSp(init, { replace: true })
    }, []) // eslint-disable-line

    const { data, isLoading } = useAdminProducts(sp)
    const { data: cats } = useAdminCategories()

    const q = sp.get('q') ?? ''
    const status = sp.get('status') ?? 'ALL'
    const category = sp.get('category') ?? 'ALL'
    const page = Number(sp.get('page') ?? '1')
    const limit = Number(sp.get('limit') ?? '20')

    function setParam(name: string, value: string) {
        const next = new URLSearchParams(sp)
        if (value) next.set(name, value)
        else next.delete(name)
        if (name !== 'page') next.set('page', '1')
        setSp(next)
    }

    async function toggleStatus(p: Product) {
        const to = p.status === 'SOLD_OUT' ? 'ACTIVE' : 'SOLD_OUT'
        if (!confirm(to === 'SOLD_OUT' ? '이 상품을 품절 처리할까요?' : '판매 재개할까요?')) return
        const r = await fetch(`/api/products/${p.id}/status`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ status: to })
        })
        if (r.ok) qc.invalidateQueries({ queryKey: ['admin', 'products'] })
        else alert('상태 변경 실패')
    }

    async function removeProduct(id: string) {
        if (!confirm('정말 삭제하시겠습니까?')) return
        const r = await fetch(`/api/products/${id}`, { method: 'DELETE', credentials: 'include' })
        if (r.ok) qc.invalidateQueries({ queryKey: ['admin', 'products'] })
        else alert('삭제 실패')
    }

    return (
        <div className="min-h-screen bg-white text-[#222]">
            <Nav />

            <div className="mx-auto w-full max-w-[1200px] px-3 sm:px-4 py-8">
                {/* 헤더 */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                        <h1 className="text-2xl font-bold">상품 관리</h1>
                        <p className="text-sm text-gray-500 mt-1">등록/수정/품절/삭제를 한 화면에서</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <Link to="/admin/hashtags" className="px-4 py-2 rounded-lg border text-sm">
                            해시태그 관리
                        </Link>
                        <Link to="/admin/products/new" className="px-4 py-2 rounded-lg bg-black text-white text-sm">
                            + 새 상품
                        </Link>
                        <Link to="/admin/products/soldout" className="px-4 py-2 rounded-lg border text-sm">
                            품절 상품
                        </Link>
                        <Link to="/admin/banners" className="px-4 py-2 rounded-lg border text-sm">배너 관리</Link>
                        <Link to="/admin/orders" className="px-4 py-2 rounded-lg border text-sm">
                            주문 관리
                        </Link>
                    </div>
                </div>

                {/* 필터 바 */}
                <div className="mt-6 grid gap-2 sm:gap-3 grid-cols-2 sm:grid-cols-4">
                    <input
                        className="col-span-2 sm:col-span-1 border rounded px-3 py-2"
                        placeholder="상품명/배지/카테고리 검색"
                        defaultValue={q}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                const v = (e.target as HTMLInputElement).value
                                setParam('q', v)
                            }
                        }}
                    />
                    <select
                        className="border rounded px-3 py-2"
                        value={status}
                        onChange={(e) => setParam('status', e.target.value)}
                    >
                        <option value="ALL">전체 상태</option>
                        <option value="ACTIVE">판매중</option>
                        <option value="SOLD_OUT">품절</option>
                    </select>
                    <select
                        className="border rounded px-3 py-2"
                        value={category}
                        onChange={(e) => setParam('category', e.target.value)}
                    >
                        <option value="ALL">전체 카테고리</option>
                        {cats?.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <select
                        className="border rounded px-3 py-2"
                        value={String(limit)}
                        onChange={(e) => setParam('limit', e.target.value)}
                    >
                        {[10, 20, 50, 100].map(n => <option key={n} value={n}>{n}개씩 보기</option>)}
                    </select>
                </div>

                {/* ===== 모바일 카드 뷰 ===== */}
                <div className="md:hidden mt-4 space-y-3">
                    {isLoading && Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="border rounded-xl p-3">
                            <div className="w-full aspect-[4/3] skeleton rounded-lg" />
                            <div className="h-4 w-2/3 skeleton rounded mt-2" />
                            <div className="h-4 w-1/3 skeleton rounded mt-1" />
                            <div className="h-8 w-full skeleton rounded mt-3" />
                        </div>
                    ))}

                    {data?.items.map(p => (
                        <div key={p.id} className="border rounded-xl p-3">
                            <div className="flex gap-3">
                                <img
                                    src={p.images?.[0] || 'https://via.placeholder.com/160x160?text=No+Image'}
                                    alt={p.name}
                                    className="w-24 h-24 rounded-lg object-cover flex-shrink-0"
                                />
                                <div className="min-w-0">
                                    <div className="flex items-start gap-2">
                                        <Link to={`/products/${p.id}`} className="font-semibold line-clamp-2 break-words">
                                            {p.name}
                                        </Link>
                                        {p.badge && <span className="text-rose-500 text-xs flex-shrink-0">[{p.badge}]</span>}
                                    </div>
                                    <div className="text-sm mt-1">{p.price.toLocaleString()}원</div>
                                    <div className="mt-1">
                                        <span className={[
                                            'px-2 py-1 rounded text-xs',
                                            p.status === 'SOLD_OUT' ? 'bg-gray-900 text-white' : 'bg-emerald-100 text-emerald-800'
                                        ].join(' ')}>
                                            {p.status}
                                        </span>
                                    </div>
                                    {(p.categories?.length ?? 0) > 0 && (
                                        <div className="mt-1 flex flex-wrap gap-1">
                                            {p.categories!.slice(0, 4).map((c, i) => (
                                                <span key={i} className="text-[10px] px-1.5 py-0.5 rounded-full border">{c}</span>
                                            ))}
                                            {p.categories!.length > 4 && (
                                                <span className="text-[10px] text-gray-500">+{p.categories!.length - 4}</span>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* 액션 버튼(모바일 큰 터치영역) */}
                            <div className="mt-3 grid grid-cols-3 gap-2">
                                <Link
                                    to={`/admin/products/${p.id}/edit`}
                                    className="text-center px-3 py-2 rounded-lg border hover:bg-gray-50 text-sm"
                                >
                                    편집
                                </Link>
                                <button
                                    onClick={() => toggleStatus(p)}
                                    className="px-3 py-2 rounded-lg border hover:bg-gray-50 text-sm"
                                >
                                    {p.status === 'SOLD_OUT' ? '판매 재개' : '품절 처리'}
                                </button>
                                <button
                                    onClick={() => removeProduct(p.id)}
                                    className="px-3 py-2 rounded-lg border hover:bg-red-50 text-red-600 text-sm"
                                >
                                    삭제
                                </button>
                            </div>
                        </div>
                    ))}

                    {(!isLoading && (data?.items.length ?? 0) === 0) && (
                        <div className="text-center text-gray-400 py-10">결과가 없습니다.</div>
                    )}
                </div>

                {/* ===== 데스크톱 테이블 뷰 ===== */}
                <div className="hidden md:block mt-4 overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="text-left border-b">
                                <th className="py-2 pr-3">이미지</th>
                                <th className="py-2 pr-3">상품명</th>
                                <th className="py-2 pr-3">가격</th>
                                <th className="py-2 pr-3">상태</th>
                                <th className="py-2 pr-3">카테고리</th>
                                <th className="py-2 pr-3">수정일</th>
                                <th className="py-2">작업</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading && (
                                <tr><td colSpan={7} className="py-8 text-center text-gray-400">불러오는 중…</td></tr>
                            )}

                            {data?.items.map(p => (
                                <tr key={p.id} className="border-b hover:bg-gray-50">
                                    <td className="py-2 pr-3">
                                        <img
                                            src={p.images?.[0] || 'https://via.placeholder.com/80x80?text=No+Image'}
                                            className="w-16 h-16 object-cover rounded"
                                            alt={p.name}
                                        />
                                    </td>
                                    <td className="py-2 pr-3">
                                        <Link to={`/products/${p.id}`} className="hover:underline">{p.name}</Link>
                                        {p.badge && <span className="ml-1 text-rose-500">[{p.badge}]</span>}
                                    </td>
                                    <td className="py-2 pr-3">{p.price.toLocaleString()}원</td>
                                    <td className="py-2 pr-3">
                                        <span className={[
                                            'px-2 py-1 rounded text-xs',
                                            p.status === 'SOLD_OUT' ? 'bg-gray-900 text-white' : 'bg-emerald-100 text-emerald-800'
                                        ].join(' ')}>{p.status}</span>
                                    </td>
                                    <td className="py-2 pr-3">
                                        {(p.categories ?? []).join(', ')}
                                    </td>
                                    <td className="py-2 pr-3">
                                        {p.updatedAt ? new Date(p.updatedAt).toLocaleString() : '-'}
                                    </td>
                                    <td className="py-2">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <Link to={`/admin/products/${p.id}/edit`} className="px-2 py-1 rounded border hover:bg-gray-100">
                                                편집
                                            </Link>
                                            <button onClick={() => toggleStatus(p)} className="px-2 py-1 rounded border hover:bg-gray-100">
                                                {p.status === 'SOLD_OUT' ? '판매 재개' : '품절 처리'}
                                            </button>
                                            <button onClick={() => removeProduct(p.id)} className="px-2 py-1 rounded border hover:bg-red-50 text-red-600">
                                                삭제
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}

                            {(!isLoading && (data?.items.length ?? 0) === 0) && (
                                <tr><td colSpan={7} className="py-8 text-center text-gray-400">결과가 없습니다.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* 페이지네이션 (공용) */}
                {data && data.pages > 1 && (
                    <div className="mt-4 flex items-center justify-center gap-2">
                        <button
                            className="px-3 py-1 rounded border disabled:opacity-50"
                            disabled={page <= 1}
                            onClick={() => setParam('page', String(page - 1))}
                        >
                            이전
                        </button>
                        <div className="text-sm text-gray-600">
                            {page} / {data.pages} (총 {data.total}개)
                        </div>
                        <button
                            className="px-3 py-1 rounded border disabled:opacity-50"
                            disabled={page >= data.pages}
                            onClick={() => setParam('page', String(page + 1))}
                        >
                            다음
                        </button>
                    </div>
                )}
            </div>
        </div>
    )
}
