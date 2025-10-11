// src/stores/useWishlist.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../stores/auth'
import { useEffect, useMemo } from 'react'

export function useWishlist() {
  const qc = useQueryClient()
  const { user } = useAuth(s => ({ user: s.user }))
  const uid = user?.uid ?? user?.id ?? 'anon' // uid 우선, 없으면 id, 없으면 anon

  // ✅ 유저별 캐시 키
  const KEY = useMemo(() => ['wishlist', 'ids', uid] as const, [uid])

  // ✅ 로그인 상태가 바뀌면 즉시 최신화
  useEffect(() => {
    if (user) {
      // 로그인 직후 강제 재요청
      qc.invalidateQueries({ queryKey: KEY })
    } else {
      // 로그아웃 시 캐시 정리
      qc.removeQueries({ queryKey: ['wishlist'] })
    }
  }, [user, qc, KEY])

  const idsQ = useQuery<string[]>({
    queryKey: KEY,
    enabled: !!user,              // 비로그인 시 요청 안 함
    retry: false,
    staleTime: 0,                 // ✅ 항상 신선하게 (로그인 직후 즉시 refetch)
    refetchOnMount: 'always',     // ✅ 마운트 때마다 재요청
    refetchOnReconnect: true,
    refetchOnWindowFocus: false,  // 필요없으면 꺼둠
    queryFn: async () => {
      const r = await fetch('/api/wishlist/ids', { credentials: 'include' })
      if (!r.ok) return []
      try { return await r.json() } catch { return [] }
    },
  })

  const add = useMutation({
    mutationFn: async (productId: string) => {
      const r = await fetch(`/api/wishlist/${productId}`, { method: 'POST', credentials: 'include' })
      if (!r.ok) throw new Error('ADD_FAIL')
    },
    onMutate: async (productId: string) => {
      await qc.cancelQueries({ queryKey: KEY })
      const prev = qc.getQueryData<string[]>(KEY) || []
      qc.setQueryData<string[]>(KEY, Array.from(new Set([...prev, productId])))
      return { prev }
    },
    onError: (_e, _v, ctx: any) => { if (ctx?.prev) qc.setQueryData(KEY, ctx.prev) },
    onSettled: () => qc.invalidateQueries({ queryKey: KEY }),
  })

  const remove = useMutation({
    mutationFn: async (productId: string) => {
      const r = await fetch(`/api/wishlist/${productId}`, { method: 'DELETE', credentials: 'include' })
      if (!r.ok) throw new Error('DEL_FAIL')
    },
    onMutate: async (productId: string) => {
      await qc.cancelQueries({ queryKey: KEY })
      const prev = qc.getQueryData<string[]>(KEY) || []
      qc.setQueryData<string[]>(KEY, prev.filter(id => id !== productId))
      return { prev }
    },
    onError: (_e, _v, ctx: any) => { if (ctx?.prev) qc.setQueryData(KEY, ctx.prev) },
    onSettled: () => qc.invalidateQueries({ queryKey: KEY }),
  })

  function isWished(id?: string) {
    const list = idsQ.data
    if (!id || !list) return false
    return list.includes(id)
  }

  return {
    ids: user ? (idsQ.data || []) : [],
    isLoading: idsQ.isLoading,
    isWished,
    add: (id: string) => add.mutateAsync(id),
    remove: (id: string) => remove.mutateAsync(id),
  }
}
