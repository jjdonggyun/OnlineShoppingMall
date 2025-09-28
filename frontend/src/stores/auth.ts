import { create } from 'zustand'

type User = { id:string; email:string; role:'USER'|'ADMIN' }
type AuthState = {
  user?: User
  accessToken?: string
  setAuth: (a:{user:User; accessToken:string})=>void
  clear: ()=>void
}
export const useAuth = create<AuthState>((set)=>({
  user: undefined,
  accessToken: undefined,
  setAuth: (a)=>set(a),
  clear: ()=>set({ user: undefined, accessToken: undefined })
}))
