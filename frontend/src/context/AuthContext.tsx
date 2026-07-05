import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'

import { api, setAccessToken, setOnSessionExpired, tryRefresh } from '@/lib/api'
import type { AccessTokenOut, User } from '@/types/api'

interface AuthContextValue {
  user: User | null
  initializing: boolean
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, displayName: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [initializing, setInitializing] = useState(true)

  // Au chargement : si un cookie refresh valide existe, la session reprend
  useEffect(() => {
    setOnSessionExpired(() => setUser(null))
    tryRefresh()
      .then((result) => setUser(result?.user ?? null))
      .finally(() => setInitializing(false))
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const response = await api.post<AccessTokenOut>('/auth/login', { email, password })
    setAccessToken(response.data.access_token)
    setUser(response.data.user)
  }, [])

  const register = useCallback(
    async (email: string, password: string, displayName: string) => {
      await api.post('/auth/register', { email, password, display_name: displayName })
      await login(email, password)
    },
    [login],
  )

  const logout = useCallback(async () => {
    await api.post('/auth/logout').catch(() => {})
    setAccessToken(null)
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider value={{ user, initializing, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth doit être utilisé sous AuthProvider')
  return context
}
