import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios'

import type { AccessTokenOut } from '@/types/api'

// L'access token vit uniquement en mémoire : inaccessible à un script
// injecté (XSS), contrairement à localStorage. La session survit au
// rechargement grâce au cookie refresh HttpOnly.
let accessToken: string | null = null

export function setAccessToken(token: string | null) {
  accessToken = token
}

let onSessionExpired: (() => void) | null = null

export function setOnSessionExpired(callback: () => void) {
  onSessionExpired = callback
}

export const api = axios.create({ baseURL: '/api/v1' })

api.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`
  }
  return config
})

// Single-flight : si plusieurs requêtes reçoivent un 401 en même temps,
// un seul appel /auth/refresh part, les autres attendent son résultat
let refreshPromise: Promise<AccessTokenOut | null> | null = null

export function tryRefresh(): Promise<AccessTokenOut | null> {
  refreshPromise ??= axios
    .post<AccessTokenOut>('/api/v1/auth/refresh')
    .then((response) => {
      setAccessToken(response.data.access_token)
      return response.data
    })
    .catch(() => {
      setAccessToken(null)
      return null
    })
    .finally(() => {
      refreshPromise = null
    })
  return refreshPromise
}

interface RetriableConfig extends InternalAxiosRequestConfig {
  _retry?: boolean
}

api.interceptors.response.use(undefined, async (error: AxiosError) => {
  const config = error.config as RetriableConfig | undefined
  const isAuthCall = config?.url?.startsWith('/auth/') ?? false
  if (error.response?.status === 401 && config && !config._retry && !isAuthCall) {
    config._retry = true
    const refreshed = await tryRefresh()
    if (refreshed) {
      config.headers.Authorization = `Bearer ${refreshed.access_token}`
      return api(config)
    }
    onSessionExpired?.()
  }
  throw error
})
