import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'

import { atHour, dayKey, layoutDay } from '@/features/appointments/calendar'
import { categoryOf } from '@/features/categories/categories'
import { cn } from '@/lib/utils'
import type { Appointment } from '@/types/api'

const WEEKDAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const
const HOURS = Array.from({ length: 24 }, (_, hour) => hour)
/** Hauteur d'une heure, en pixels : convertit aussi les minutes en position. */
const HOUR_HEIGHT = 48
/** Première heure visible à l'ouverture, pour ne pas démarrer au milieu de la nuit. */
const SCROLL_TO_HOUR = 7

interface TimeGridProps {
  days: Date[]
  appointments: Appointment[]
  onSlotClick: (slot: Date) => void
  onAppointmentClick: (appointment: Appointment) => void
}

export function TimeGrid({ days, appointments, onSlotClick, onAppointmentClick }: TimeGridProps) {
  const { t } = useTranslation()
  const scrollRef = useRef<HTMLDivElement>(null)
  const todayKey = dayKey(new Date())
  const gridColumns = `4rem repeat(${days.length}, minmax(0, 1fr))`

  useEffect(() => {
    // Quelques pixels de marge pour ne pas couper le libellé de l'heure, qui déborde vers le haut
    scrollRef.current?.scrollTo({ top: SCROLL_TO_HOUR * HOUR_HEIGHT - 8 })
  }, [])

  return (
    <div className="overflow-hidden rounded-lg border">
      <div className="grid border-b bg-muted/50" style={{ gridTemplateColumns: gridColumns }}>
        <div />
        {days.map((day) => {
          const key = dayKey(day)
          return (
            <div key={key} className="px-1 py-2 text-center">
              <div className="text-xs font-medium text-muted-foreground">
                {t(`appointments.weekdays.${WEEKDAYS[(day.getDay() + 6) % 7]}`)}
              </div>
              <div
                className={cn(
                  'mx-auto mt-1 flex size-6 items-center justify-center rounded-full text-xs',
                  key === todayKey && 'bg-primary font-semibold text-primary-foreground',
                )}
              >
                {day.getDate()}
              </div>
            </div>
          )
        })}
      </div>

      <div ref={scrollRef} className="max-h-[32rem] overflow-y-auto">
        <div className="grid" style={{ gridTemplateColumns: gridColumns }}>
          <div className="border-r">
            {HOURS.map((hour) => (
              <div key={hour} className="relative" style={{ height: HOUR_HEIGHT }}>
                {hour > 0 && (
                  <span className="absolute -top-2 right-1 text-xs text-muted-foreground">
                    {String(hour).padStart(2, '0')}:00
                  </span>
                )}
              </div>
            ))}
          </div>

          {days.map((day) => {
            const key = dayKey(day)
            return (
              <div key={key} className="relative border-r">
                {HOURS.map((hour) => {
                  const slot = () => onSlotClick(atHour(day, hour))
                  return (
                    <div
                      key={hour}
                      role="button"
                      tabIndex={0}
                      data-testid={`timegrid-slot-${key}-${hour}`}
                      aria-label={t('appointments.addAt', {
                        date: day.toLocaleDateString('fr-FR'),
                        time: `${String(hour).padStart(2, '0')}:00`,
                      })}
                      onClick={slot}
                      onKeyDown={(e) => e.key === 'Enter' && slot()}
                      className="cursor-pointer border-b transition-colors hover:bg-accent/50"
                      style={{ height: HOUR_HEIGHT }}
                    />
                  )
                })}

                {layoutDay(appointments, day).map((positioned) => {
                  const { appointment, startMinutes, durationMinutes, column, columns } = positioned
                  const category = categoryOf(appointment.category)
                  const color = appointment.color ?? category?.color
                  const Icon = category?.icon
                  return (
                    <button
                      key={appointment.id}
                      type="button"
                      data-testid="calendar-appointment"
                      onClick={() => onAppointmentClick(appointment)}
                      className="absolute overflow-hidden rounded border border-l-2 bg-accent px-1 py-0.5 text-left text-xs hover:opacity-80"
                      style={{
                        top: (startMinutes / 60) * HOUR_HEIGHT,
                        height: (durationMinutes / 60) * HOUR_HEIGHT,
                        left: `${(column / columns) * 100}%`,
                        width: `calc(${100 / columns}% - 2px)`,
                        borderLeftColor: color ?? 'var(--primary)',
                        backgroundColor: color ? `${color}1f` : undefined,
                      }}
                    >
                      {Icon && (
                        <Icon
                          aria-hidden
                          className="mr-0.5 inline size-3 align-[-2px]"
                          style={{ color: category?.color }}
                        />
                      )}
                      <span className="font-medium">
                        {new Date(appointment.start_at).toLocaleTimeString('fr-FR', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>{' '}
                      {appointment.title}
                    </button>
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
