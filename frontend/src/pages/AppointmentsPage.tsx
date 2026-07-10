import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { useAppointments } from '@/features/appointments/api'
import { AppointmentForm } from '@/features/appointments/AppointmentForm'
import { addDays, atHour, startOfDay, startOfWeek, weekDays } from '@/features/appointments/calendar'
import { MonthCalendar } from '@/features/appointments/MonthCalendar'
import { TimeGrid } from '@/features/appointments/TimeGrid'
import type { Appointment } from '@/types/api'

const VIEWS = ['month', 'week', 'day'] as const
type CalendarView = (typeof VIEWS)[number]

/** Créneau par défaut quand on clique une case du mois, qui n'a pas d'heure. */
const MONTH_DEFAULT_HOUR = 9

/** Suffixe des clés i18n `previousMonth`, `nextWeek`, … selon la vue. */
const NAV_SUFFIX: Record<CalendarView, string> = { month: 'Month', week: 'Week', day: 'Day' }

export function AppointmentsPage() {
  const { t } = useTranslation()
  const [view, setView] = useState<CalendarView>('month')
  // Figé au montage : un `new Date()` recalculé à chaque rendu ferait boucler la requête
  const [anchor, setAnchor] = useState(() => startOfDay(new Date()))
  const [formOpen, setFormOpen] = useState(false)
  const [editingAppointment, setEditingAppointment] = useState<Appointment | undefined>(undefined)
  const [defaultStart, setDefaultStart] = useState<Date | undefined>(undefined)

  const range = useMemo(() => {
    if (view === 'month') {
      // La grille affiche jusqu'à une semaine avant/après le mois : on couvre large
      const from = new Date(anchor.getFullYear(), anchor.getMonth(), -7)
      const to = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 8)
      return { from: from.toISOString(), to: to.toISOString() }
    }
    const from = view === 'week' ? startOfWeek(anchor) : startOfDay(anchor)
    return { from: from.toISOString(), to: addDays(from, view === 'week' ? 7 : 1).toISOString() }
  }, [view, anchor])

  const { data, isLoading } = useAppointments(range)

  const goBy = (delta: number) => {
    setAnchor((current) => {
      if (view === 'month') return new Date(current.getFullYear(), current.getMonth() + delta, 1)
      return addDays(current, view === 'week' ? 7 * delta : delta)
    })
  }

  const goToToday = () => setAnchor(startOfDay(new Date()))

  const openCreate = (start?: Date) => {
    setEditingAppointment(undefined)
    setDefaultStart(start)
    setFormOpen(true)
  }

  const openEdit = (appointment: Appointment) => {
    setEditingAppointment(appointment)
    setDefaultStart(undefined)
    setFormOpen(true)
  }

  const periodLabel = () => {
    if (view === 'month') {
      return anchor.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
    }
    if (view === 'day') {
      return anchor.toLocaleDateString('fr-FR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    }
    const days = weekDays(anchor)
    const first = days[0].toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })
    const last = days[6].toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
    return `${first} – ${last}`
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-xl font-semibold">{t('appointments.title')}</h2>
        <Button onClick={() => openCreate()}>
          <Plus />
          {t('appointments.new')}
        </Button>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            onClick={() => goBy(-1)}
            aria-label={t(`appointments.previous${NAV_SUFFIX[view]}`)}
          >
            <ChevronLeft />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => goBy(1)}
            aria-label={t(`appointments.next${NAV_SUFFIX[view]}`)}
          >
            <ChevronRight />
          </Button>
          <Button variant="outline" onClick={goToToday}>
            {t('appointments.today')}
          </Button>
        </div>

        {/* first-letter et pas capitalize : « vendredi 10 juillet », pas « Vendredi 10 Juillet » */}
        <p className="text-lg font-medium first-letter:uppercase" data-testid="calendar-month">
          {periodLabel()}
        </p>

        <div className="flex items-center gap-1">
          {VIEWS.map((candidate) => (
            <Button
              key={candidate}
              variant={view === candidate ? 'default' : 'outline'}
              size="sm"
              aria-pressed={view === candidate}
              onClick={() => setView(candidate)}
            >
              {t(`appointments.views.${candidate}`)}
            </Button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">{t('common.loading')}</p>
      ) : view === 'month' ? (
        <MonthCalendar
          year={anchor.getFullYear()}
          month={anchor.getMonth()}
          appointments={data?.items ?? []}
          onDayClick={(day) => openCreate(atHour(day, MONTH_DEFAULT_HOUR))}
          onAppointmentClick={openEdit}
        />
      ) : (
        <TimeGrid
          days={view === 'week' ? weekDays(anchor) : [startOfDay(anchor)]}
          appointments={data?.items ?? []}
          onSlotClick={openCreate}
          onAppointmentClick={openEdit}
        />
      )}

      <AppointmentForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        appointment={editingAppointment}
        defaultStart={defaultStart}
      />
    </div>
  )
}
