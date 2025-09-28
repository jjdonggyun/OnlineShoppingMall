import Nav from '../components/Nav'
import Hero from '../components/Hero'
import ProductCard, { Product } from '../components/ProductCard'
import { useQuery } from '@tanstack/react-query'

function useProducts() {
  return useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const r = await fetch('/api/products')
      return r.json() as Promise<Product[]>
    }
  })
}

export default function App() {
  const { data, isLoading } = useProducts()

  return (
    <div className="min-h-screen bg-white text-[#222]">
      <Nav />
      <Hero />
      <main className="container-max mt-6">
        <h2 className="text-lg font-semibold mb-3">추천 상품</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {isLoading && Array.from({length:8}).map((_,i)=>(
            <div key={i} className="space-y-2">
              <div className="aspect-[3/4] skeleton"></div>
              <div className="h-4 w-3/4 skeleton"></div>
              <div className="h-4 w-1/2 skeleton"></div>
            </div>
          ))}
          {data?.map(p => <ProductCard key={p.id} p={p} />)}
        </div>
      </main>
      <Footer />
    </div>
  )
}

function Footer() {
  return <div className="mt-20"><hr/><div className="text-center text-xs text-gray-500 py-8">© 2025 Sample Mall</div></div>
}
