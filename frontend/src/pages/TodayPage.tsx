import { CalendarX2, MapPin, PartyPopper } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { useAppointments } from '@/features/appointments/api'
import {
  categoryOf,
  FALLBACK_COLOR,
  FALLBACK_ICON,
} from '@/features/categories/categories'
import { useTasks } from '@/features/tasks/api'
import { TaskCard } from '@/features/tasks/TaskCard'
import { TaskForm } from '@/features/tasks/TaskForm'
import { useAuth } from '@/context/AuthContext'
import type { Appointment, Task } from '@/types/api'

const UPCOMING_DAYS = 7
const UPCOMING_MAX = 5

function AppointmentRow({ appointment, locale }: { appointment: Appointment; locale: string }) {
  const category = categoryOf(appointment.category)
  const Icon = category?.icon ?? FALLBACK_ICON
  const color = appointment.color ?? category?.color ?? FALLBACK_COLOR

  return (
    <li className="flex items-center gap-3 rounded-md border p-2">
      <div
        className="flex size-9 shrink-0 items-center justify-center rounded-md"
        style={{ color, backgroundColor: `${color}1f` }}
      >
        <Icon className="size-5" aria-hidden />
      </div>
      <div className="min-w-0">
        <p className="truncate font-medium">{appointment.title}</p>
        <p className="truncate text-sm text-muted-foreground">
          <span className="capitalize">
            {new Date(appointment.start_at).toLocaleString(locale, {
              weekday: 'short',
              day: 'numeric',
              month: 'short',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
          {appointment.location && (
            <>
              {' · '}
              <MapPin className="inline size-3 align-[-1px]" aria-hidden /> {appointment.location}
            </>
          )}
        </p>
      </div>
    </li>
  )
}

export function TodayPage() {
  const { t, i18n } = useTranslation()
  const { user } = useAuth()
  const [editingTask, setEditingTask] = useState<Task | undefined>(undefined)

  // Figé au montage : recalculé à chaque rendu, from/to changeraient sans
  // cesse et la queryKey de react-query relancerait la requête en boucle
  const [now] = useState(() => new Date())
  const endOfToday = new Date(now)
  endOfToday.setHours(23, 59, 59, 999)
  const horizon = new Date(now)
  horizon.setDate(horizon.getDate() + UPCOMING_DAYS)

  const { data: tasksData, isLoading: tasksLoading } = useTasks({})
  const { data: appointmentsData, isLoading: appointmentsLoading } = useAppointments({
    from: now.toISOString(),
    to: horizon.toISOString(),
  })

  // Tâches non terminées dues aujourd'hui ou en retard
  const dueTasks = (tasksData?.items ?? [])
    .filter(
      (task) =>
        task.status !== 'done' &&
        task.status !== 'archived' &&
        task.due_date &&
        new Date(task.due_date) <= endOfToday,
    )
    .sort((a, b) => (a.due_date ?? '').localeCompare(b.due_date ?? ''))

  const upcoming = (appointmentsData?.items ?? [])
    .slice()
    .sort((a, b) => a.start_at.localeCompare(b.start_at))
    .slice(0, UPCOMING_MAX)

  const startOfToday = new Date(now)
  startOfToday.setHours(0, 0, 0, 0)

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">
          {t('today.greeting', { name: user?.display_name })}
        </h2>
        <p className="capitalize text-muted-foreground">
          {now.toLocaleDateString(i18n.language, {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          })}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="space-y-3">
          <div className="flex items-baseline justify-between">
            <h3 className="font-medium">{t('today.tasksTitle')}</h3>
            <Link to="/tasks" className="text-sm text-primary hover:underline">
              {t('today.allTasks')}
            </Link>
          </div>
          {tasksLoading ? (
            <p className="text-muted-foreground">{t('common.loading')}</p>
          ) : dueTasks.length > 0 ? (
            <div className="space-y-2">
              {dueTasks.map((task) => (
                <div key={task.id} className="space-y-1">
                  {task.due_date && new Date(task.due_date) < startOfToday && (
                    <Badge variant="destructive">{t('today.overdue')}</Badge>
                  )}
                  <TaskCard task={task} onEdit={setEditingTask} />
                </div>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="flex items-center gap-3 text-muted-foreground">
                <PartyPopper className="size-5 shrink-0 text-primary" aria-hidden />
                {t('today.noTasks')}
              </CardContent>
            </Card>
          )}
        </section>

        <section className="space-y-3">
          <div className="flex items-baseline justify-between">
            <h3 className="font-medium">{t('today.appointmentsTitle')}</h3>
            <Link to="/appointments" className="text-sm text-primary hover:underline">
              {t('today.calendar')}
            </Link>
          </div>
          {appointmentsLoading ? (
            <p className="text-muted-foreground">{t('common.loading')}</p>
          ) : upcoming.length > 0 ? (
            <ul className="space-y-2">
              {upcoming.map((appointment) => (
                <AppointmentRow
                  key={appointment.id}
                  appointment={appointment}
                  locale={i18n.language}
                />
              ))}
            </ul>
          ) : (
            <Card>
              <CardContent className="flex items-center gap-3 text-muted-foreground">
                <CalendarX2 className="size-5 shrink-0" aria-hidden />
                {t('today.noAppointments')}
              </CardContent>
            </Card>
          )}
        </section>
      </div>

      <TaskForm
        open={editingTask !== undefined}
        onClose={() => setEditingTask(undefined)}
        task={editingTask}
      />
    </div>
  )
}
