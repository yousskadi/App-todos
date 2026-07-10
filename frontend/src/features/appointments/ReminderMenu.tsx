import { Bell, BellOff } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  DEFAULT_REMINDER_OPTIONS,
  getDefaultReminderMinutes,
  setDefaultReminderMinutes,
} from '@/features/appointments/reminderPrefs'

interface ReminderMenuProps {
  enabled: boolean
  onEnabledChange: (enabled: boolean) => void
}

/** Interrupteur permanent des rappels + choix du délai par défaut, dans l'en-tête. */
export function ReminderMenu({ enabled, onEnabledChange }: ReminderMenuProps) {
  const { t } = useTranslation()
  const [defaultMinutes, setDefaultMinutes] = useState(getDefaultReminderMinutes)

  const changeDefault = (value: string) => {
    const minutes = value === 'none' ? null : Number(value)
    setDefaultMinutes(minutes)
    setDefaultReminderMinutes(minutes)
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={t('reminders.menu')}>
          {enabled ? <Bell /> : <BellOff />}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuCheckboxItem
          checked={enabled}
          onCheckedChange={onEnabledChange}
          onSelect={(e) => e.preventDefault()}
        >
          {t('reminders.toggle')}
        </DropdownMenuCheckboxItem>
        <DropdownMenuSeparator />
        <DropdownMenuLabel>{t('reminders.defaultDelay')}</DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={String(defaultMinutes ?? 'none')}
          onValueChange={changeDefault}
        >
          {DEFAULT_REMINDER_OPTIONS.map((minutes) => (
            <DropdownMenuRadioItem
              key={minutes ?? 'none'}
              value={String(minutes ?? 'none')}
              disabled={!enabled}
              onSelect={(e) => e.preventDefault()}
            >
              {t(`appointments.reminders.${minutes ?? 'none'}`)}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
