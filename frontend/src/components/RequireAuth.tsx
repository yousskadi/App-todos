import { useTranslation } from 'react-i18next'
import { Navigate, Outlet } from 'react-router-dom'

import { useAuth } from '@/context/AuthContext'

export function RequireAuth() {
  const { user, initializing } = useAuth()
  const { t } = useTranslation()

  if (initializing) {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted-foreground">
        {t('common.loading')}
      </div>
    )
  }
  if (!user) {
    return <Navigate to="/login" replace />
  }
  return <Outlet />
}
