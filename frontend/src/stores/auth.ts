// src/stores/auth.ts
import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

/** 서버 응답 id/_id/uid 무엇이 와도 uid로 통일 */
export type User = {
  uid: string
  email: string
  role: 'USER' | 'ADMIN'
  id?: string
  _id?: string
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
          // ✅ 서버 쿠키 기반으로 세션 복원
          const r = await fetch('/api/auth/me', { credentials: 'include' })
          if (!r.ok) { set({ user: undefined }); return }
          const me = await r.json() // { uid/id/_id, email, role, ... }
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
      storage: createJSONStorage(() => localStorage), // 🚨 배포 시 민감하면 제거/세션스토리지 변경
      partialize: (s) => ({ user: s.user, accessToken: s.accessToken }),
    }
  )
)
