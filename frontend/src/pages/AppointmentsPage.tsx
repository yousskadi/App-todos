import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { useAppointments } from '@/features/appointments/api'
import { AppointmentForm } from '@/features/appointments/AppointmentForm'
import { MonthCalendar } from '@/features/appointments/MonthCalendar'
import type { Appointment } from '@/types/api'

export function AppointmentsPage() {
  const { t } = useTranslation()
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())
  const [formOpen, setFormOpen] = useState(false)
  const [editingAppointment, setEditingAppointment] = useState<Appointment | undefined>(undefined)
  const [defaultDay, setDefaultDay] = useState<Date | undefined>(undefined)

  // La grille affiche jusqu'à une semaine avant/après le mois : on couvre large
  const { data, isLoading } = useAppointments({
    from: new Date(year, month, -7).toISOString(),
    to: new Date(year, month + 1, 8).toISOString(),
  })

  const goToMonth = (delta: number) => {
    const target = new Date(year, month + delta, 1)
    setYear(target.getFullYear())
    setMonth(target.getMonth())
  }

  const goToToday = () => {
    const today = new Date()
    setYear(today.getFullYear())
    setMonth(today.getMonth())
  }

  const openCreate = (day?: Date) => {
    setEditingAppointment(undefined)
    setDefaultDay(day)
    setFormOpen(true)
  }

  const openEdit = (appointment: Appointment) => {
    setEditingAppointment(appointment)
    setDefaultDay(undefined)
    setFormOpen(true)
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

      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            onClick={() => goToMonth(-1)}
            aria-label={t('appointments.previousMonth')}
          >
            <ChevronLeft />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => goToMonth(1)}
            aria-label={t('appointments.nextMonth')}
          >
            <ChevronRight />
          </Button>
          <Button variant="outline" onClick={goToToday}>
            {t('appointments.today')}
          </Button>
        </div>
        <p className="text-lg font-medium capitalize" data-testid="calendar-month">
          {new Date(year, month, 1).toLocaleDateString('fr-FR', {
            month: 'long',
            year: 'numeric',
          })}
        </p>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">{t('common.loading')}</p>
      ) : (
        <MonthCalendar
          year={year}
          month={month}
          appointments={data?.items ?? []}
          onDayClick={(day) => openCreate(day)}
          onAppointmentClick={openEdit}
        />
      )}

      <AppointmentForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        appointment={editingAppointment}
        defaultDay={defaultDay}
      />
    </div>
  )
}
