import { useQuery } from '@tanstack/react-query'

export type Hashtag = {
  id: string
  label: string
  emoji?: string | null
  type: 'CATEGORY' | 'TAG' | 'CHANNEL' | 'MENU'
  value: string
  /** /api/hashtags 에서는 안 내려오므로 optional */
  active?: boolean
  /** 정렬용(있으면 사용) */
  order?: number
}

export function usePublicHashtags() {
  // 공개: active=true만
  return useQuery({
    queryKey: ['hashtags', 'public'],
    queryFn: async () => {
      const r = await fetch('/api/hashtags')
      if (!r.ok) return [] as Hashtag[]
      return r.json() as Promise<Hashtag[]>
    },
  })
}

export function useAdminHashtags() {
  // 관리자: 전체(비활성 포함)
  return useQuery({
    queryKey: ['hashtags', 'admin'],
    queryFn: async () => {
      const r = await fetch('/api/hashtags/admin', {
        credentials: 'include', // ← ADMIN 보호 엔드포인트이므로 쿠키 필요
      })
      if (!r.ok) return [] as Hashtag[]
      return r.json() as Promise<Hashtag[]>
    },
  })
}


export function useTagDict() {
  return useQuery({
    queryKey: ['hashtags','public','TAG'],
    queryFn: async () => {
      const r = await fetch('/api/hashtags?type=TAG')
      if (!r.ok) return {} as Record<string,{label:string; emoji?:string|null}>
      const list = await r.json() as Array<{ value:string; label:string; emoji?:string|null }>
      const map: Record<string,{label:string; emoji?:string|null}> = {}
      for (const h of list) map[h.value] = { label: h.label, emoji: h.emoji ?? null }
      return map
    },
    staleTime: 60_000,
  })
}