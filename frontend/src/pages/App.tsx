import Nav from '../components/Nav'                      // 상단 공용 네비게이션(레이아웃 헤더 느낌)
import Hero from '../components/Hero'                    // 상단 배너/히어로 섹션(고정 UI 영역)
import ProductCard, { Product } from '../components/ProductCard' // 상품 카드(리스트 아이템 템플릿과 유사)
import { useQuery } from '@tanstack/react-query'         // 서버 데이터 페칭/캐시 (Mendix의 Data source + 캐시 개념)

function useProducts() {
  // 서버에서 상품 목록을 가져오고 캐시하는 커스텀 훅
  // Mendix로 치면 "Call REST" + 결과를 페이지/클라이언트에 캐시해두는 패턴
  return useQuery({
    queryKey: ['products'],                              // 캐시 키 (동일 키면 캐시 재사용)
    queryFn: async () => {
      const r = await fetch('/api/products')             // REST 호출 (GET /api/products)
      return r.json() as Promise<Product[]>              // JSON → Product[]로 파싱
    }
  })
}

export default function App() {
  // 데이터와 로딩 상태를 구독 (Mendix의 data source + isLoading)
  const { data, isLoading } = useProducts()

  return (
    <div className="min-h-screen bg-white text-[#222]">
      {/* 공통 헤더 */}
      <Nav />
      {/* 상단 배너/프로모션 영역 */}
      <Hero />

      {/* 본문 컨테이너 */}
      <main className="container-max mt-6">
        <h2 className="text-lg font-semibold mb-3">추천 상품</h2>

        {/* 그리드 레이아웃: 반응형 카드 목록 (Mendix의 List View + responsive columns 느낌) */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">

          {/* 로딩 스켈레톤: 데이터 로딩 중 UI 깜빡임 방지 (Mendix에선 로딩 인디케이터 위젯) */}
          {isLoading && Array.from({length:8}).map((_,i)=>(
            <div key={i} className="space-y-2">
              {/* 이미지 자리 */}
              <div className="aspect-[3/4] skeleton"></div>
              {/* 상품명 자리 */}
              <div className="h-4 w-3/4 skeleton"></div>
              {/* 가격 자리 */}
              <div className="h-4 w-1/2 skeleton"></div>
            </div>
          ))}

          {/* 데이터가 있으면 카드로 렌더링 (Mendix ListView의 템플릿 반복과 동일) */}
          {data?.map(p => <ProductCard key={p.id} p={p} />)}
        </div>
      </main>

      {/* 푸터 */}
      <Footer />
    </div>
  )
}

function Footer() {
  // 단순 푸터(정적 텍스트). Mendix 레이아웃의 푸터 슬롯과 유사
  return (
    <div className="mt-20">
      <hr/>
      <div className="text-center text-xs text-gray-500 py-8">
        © 2025 Sample Mall
      </div>
    </div>
  )
}
