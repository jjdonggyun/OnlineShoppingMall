// src/stores/auth.ts
import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

/** 서버 응답 id/_id/uid 무엇이 와도 uid로 통일 */
export type User = {
  /** 공통 식별자 */
  uid: string
  id?: string
  _id?: string

  /** 서버 모델과 동일한 필드 */
  email: string
  role: 'USER' | 'ADMIN'
  name: string
  userId: string
  phone: string
  birth?: string | null              // ISO 문자열로 전달되므로 Date 대신 string 처리
  smsOptIn: boolean
  emailOptIn: boolean
  recommenderId?: string | null
  wishlist?: string[]                // ObjectId[] → 문자열 배열
}

type AuthState = {
  user?: User
  accessToken?: string
  setAuth: (a: { user: Partial<User> & { email: string; role: 'USER'|'ADMIN' }, accessToken?: string }) => void
  clear: () => void
  /** 부팅 시 세션 복원: /api/auth/me 를 불러서 user 세팅 */
  bootstrap: () => Promise<void>
}

export const useAuth = create<AuthState>()(
  persist(
    (set, get) => ({
      user: undefined,
      accessToken: undefined,

      setAuth: ({ user, accessToken }) => {
        const uid = (user as any).uid ?? (user as any).id ?? (user as any)._id
        if (!uid) { set({ user: undefined, accessToken: undefined }); return }
        set({
          user: { ...user, uid } as User,
          accessToken: accessToken ?? get().accessToken,
        })
      },

      clear: () => set({ user: undefined, accessToken: undefined }),

      bootstrap: async () => {
        try {
          const r = await fetch('/api/auth/me', { credentials: 'include' })
          if (!r.ok) { set({ user: undefined }); return }
          const me = await r.json()
          const uid = me.uid ?? me.id ?? me._id
          if (!uid) { set({ user: undefined }); return }
          set({ user: { ...me, uid } })
        } catch {
          set({ user: undefined })
        }
      },
    }),
    {
      name: 'auth-store',
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ user: s.user, accessToken: s.accessToken }),
    }
  )
)
