import { useTranslation } from 'react-i18next'

import { dayKey, monthGridDays } from '@/features/appointments/calendar'
import { cn } from '@/lib/utils'
import type { Appointment } from '@/types/api'

const WEEKDAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const

interface MonthCalendarProps {
  year: number
  month: number
  appointments: Appointment[]
  onDayClick: (day: Date) => void
  onAppointmentClick: (appointment: Appointment) => void
}

export function MonthCalendar({
  year,
  month,
  appointments,
  onDayClick,
  onAppointmentClick,
}: MonthCalendarProps) {
  const { t } = useTranslation()
  const todayKey = dayKey(new Date())

  const byDay = new Map<string, Appointment[]>()
  for (const appointment of appointments) {
    const key = dayKey(new Date(appointment.start_at))
    byDay.set(key, [...(byDay.get(key) ?? []), appointment])
  }

  return (
    <div className="overflow-hidden rounded-lg border">
      <div className="grid grid-cols-7 border-b bg-muted/50">
        {WEEKDAYS.map((weekday) => (
          <div
            key={weekday}
            className="px-1 py-2 text-center text-xs font-medium text-muted-foreground"
          >
            {t(`appointments.weekdays.${weekday}`)}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {monthGridDays(year, month).map((day) => {
          const key = dayKey(day)
          const inMonth = day.getMonth() === month
          const dayAppointments = byDay.get(key) ?? []
          return (
            <div
              key={key}
              role="button"
              tabIndex={0}
              data-testid={`calendar-day-${key}`}
              aria-label={t('appointments.addOn', { date: day.toLocaleDateString('fr-FR') })}
              onClick={() => onDayClick(day)}
              onKeyDown={(e) => e.key === 'Enter' && onDayClick(day)}
              className={cn(
                'min-h-24 cursor-pointer space-y-1 border-b border-r p-1 transition-colors hover:bg-accent/50',
                !inMonth && 'bg-muted/30 text-muted-foreground',
              )}
            >
              <div
                className={cn(
                  'ml-auto flex size-6 items-center justify-center rounded-full text-xs',
                  key === todayKey && 'bg-primary font-semibold text-primary-foreground',
                )}
              >
                {day.getDate()}
              </div>
              {dayAppointments.map((appointment) => (
                <button
                  key={appointment.id}
                  type="button"
                  data-testid="calendar-appointment"
                  onClick={(e) => {
                    e.stopPropagation()
                    onAppointmentClick(appointment)
                  }}
                  className="block w-full truncate rounded border-l-2 bg-accent px-1 py-0.5 text-left text-xs hover:bg-accent/80"
                  style={{ borderLeftColor: appointment.color ?? 'var(--primary)' }}
                >
                  <span className="font-medium">
                    {new Date(appointment.start_at).toLocaleTimeString('fr-FR', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>{' '}
                  {appointment.title}
                </button>
              ))}
            </div>
          )
        })}
      </div>
    </div>
  )
}
