import { Bell } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'

const SUPPORTED = typeof Notification !== 'undefined'

/** Invite à autoriser les notifications tant que l'utilisateur n'a pas tranché. */
export function NotificationBell() {
  const { t } = useTranslation()
  const [permission, setPermission] = useState(SUPPORTED ? Notification.permission : 'denied')

  // Une fois accordée ou refusée, le repli sur toast prend le relais : plus rien à demander
  if (!SUPPORTED || permission !== 'default') return null

  const request = () =>
    void Notification.requestPermission().then((result) => {
      setPermission(result)
      // La cloche disparaît après le choix : on confirme par un toast que l'action a pris
      toast(result === 'granted' ? t('reminders.enabled') : t('reminders.blocked'))
    })

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={request}
      aria-label={t('reminders.enable')}
      title={t('reminders.enable')}
    >
      <Bell />
    </Button>
  )
}
