import { useQuery } from '@tanstack/react-query'

export type Hashtag = {
  id: string
  label: string
  emoji?: string | null
  type: 'MENU' | 'CATEGORY' | 'TAG' | 'CHANNEL'
  value: string
  active?: boolean
  order?: number
  createdAt?: string
  updatedAt?: string
}

export function usePublicHashtags(type?: Hashtag['type']) {
  // 공개: active=true만, 선택적으로 type 필터
  return useQuery({
    queryKey: ['hashtags', 'public', { type: type ?? 'ALL' }],
    queryFn: async () => {
      const qs = type ? `?type=${encodeURIComponent(type)}` : ''
      const r = await fetch(`/api/hashtags${qs}`)
      if (!r.ok) return [] as Hashtag[]
      return r.json() as Promise<Hashtag[]>
    },
  })
}

export function useAdminHashtags(type?: Hashtag['type']) {
  // 관리자: 전체(비활성 포함), 선택적으로 type 필터
  return useQuery({
    queryKey: ['hashtags', 'admin', { type: type ?? 'ALL' }],
    queryFn: async () => {
      const qs = type ? `?type=${encodeURIComponent(type)}` : ''
      const r = await fetch(`/api/hashtags/admin${qs}`, { credentials: 'include' })
      if (!r.ok) return [] as Hashtag[]
      return r.json() as Promise<Hashtag[]>
    },
  })
}
