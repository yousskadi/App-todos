import { CalendarCheck2, LogOut, Moon, Sun } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { NavLink, Outlet } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { NotificationBell } from '@/features/appointments/NotificationBell'
import { useReminders } from '@/features/appointments/useReminders'
import { useAuth } from '@/context/AuthContext'
import { useTheme } from '@/context/ThemeContext'
import { cn } from '@/lib/utils'

export function AppLayout() {
  const { user, logout } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const { t } = useTranslation()
  useReminders()

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <CalendarCheck2 className="size-5" aria-hidden />
              </div>
              <h1 className="text-lg font-semibold">{t('app.title')}</h1>
            </div>
            <nav className="flex items-center gap-1">
              {(['today', 'tasks', 'appointments'] as const).map((section) => (
                <NavLink
                  key={section}
                  to={`/${section}`}
                  className={({ isActive }) =>
                    cn(
                      'rounded-md px-3 py-1.5 text-sm transition-colors',
                      isActive
                        ? 'bg-primary/10 font-medium text-primary'
                        : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                    )
                  }
                >
                  {t(`nav.${section}`)}
                </NavLink>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden text-sm text-muted-foreground sm:inline">
              {user?.display_name}
            </span>
            <NotificationBell />
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              aria-label={t('common.toggleTheme')}
            >
              {theme === 'dark' ? <Sun /> : <Moon />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => void logout()}
              aria-label={t('common.logout')}
            >
              <LogOut />
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  )
}
