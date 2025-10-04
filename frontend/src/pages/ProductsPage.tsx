import { useMemo } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useProducts } from '../hooks/useProducts'
import ProductCard from '../components/ProductCard'
import Nav from '../components/Nav'

function useQS() {
  const { search } = useLocation()
  return useMemo(() => new URLSearchParams(search), [search])
}

export default function ProductsPage() {
  const qs = useQS()
  const channel = (qs.get('channel') as 'NEW' | 'BEST' | null) || undefined
  const category = qs.get('category') || undefined
  const tag = qs.get('tag') || undefined
  const sort = (qs.get('sort') as 'price-asc' | 'price-desc' | 'new' | null) || undefined
  const { data, isLoading } = useProducts({ channel, category, tag, sort })

  const title =
    channel === 'NEW' ? 'NEW'
    : channel === 'BEST' ? 'BEST'
    : tag ? `#${tag}`
    : category ? category
    : 'ALL'

  return (
    <div className="min-h-screen bg-white text-[#222]">
      <Nav />
      <div className="mx-auto max-w-[1520px] px-3 sm:px-4 py-8">
        <div className="flex items-end justify-between mb-6">
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">{title}</h1>
          <div className="text-sm space-x-3">
            <QSLink label="최신순" channel={channel} category={category} tag={tag} sort="new" />
            <QSLink label="가격↑" channel={channel} category={category} tag={tag} sort="price-asc" />
            <QSLink label="가격↓" channel={channel} category={category} tag={tag} sort="price-desc" />
          </div>
        </div>

        <div className="grid gap-3 sm:gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {isLoading &&
            Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="aspect-[368/462] skeleton rounded-lg" />
                <div className="h-4 w-3/4 skeleton rounded" />
                <div className="h-4 w-1/2 skeleton rounded" />
              </div>
            ))}
          {data?.map((p) => <ProductCard key={p.id} p={p} />)}
        </div>
      </div>
    </div>
  )
}

function QSLink({ label, channel, category, tag, sort }: {
  label: string
  channel?: 'NEW' | 'BEST'
  category?: string
  tag?: string
  sort?: 'price-asc' | 'price-desc' | 'new'
}) {
  const s = new URLSearchParams()
  if (channel) s.set('channel', channel)
  if (category) s.set('category', category)
  if (tag) s.set('tag', tag)
  if (sort) s.set('sort', sort)
  return (
    <Link className="underline-offset-4 hover:underline" to={`/products?${s.toString()}`}>
      {label}
    </Link>
  )
}
