import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { z } from 'zod'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import {
  useCreateAppointment,
  useDeleteAppointment,
  useUpdateAppointment,
} from '@/features/appointments/api'
import { toLocalInputValue } from '@/features/appointments/calendar'
import type { Appointment } from '@/types/api'

const REMINDERS = ['none', '5', '15', '30', '60', '1440'] as const

const appointmentFormSchema = z
  .object({
    title: z.string().min(1).max(200),
    description: z.string().max(5000),
    location: z.string().max(200),
    start_at: z.string().min(1),
    end_at: z.string().min(1),
    category: z.string().max(50),
    reminder: z.enum(REMINDERS),
  })
  .refine((values) => new Date(values.end_at) > new Date(values.start_at), {
    path: ['end_at'],
    message: 'endAfterStart',
  })

type AppointmentFormValues = z.infer<typeof appointmentFormSchema>

function toFormValues(appointment?: Appointment, defaultDay?: Date): AppointmentFormValues {
  if (!appointment) {
    // Créneau par défaut : 9h–10h le jour cliqué (ou aujourd'hui)
    const start = defaultDay ? new Date(defaultDay) : new Date()
    start.setHours(9, 0, 0, 0)
    const end = new Date(start)
    end.setHours(10)
    return {
      title: '',
      description: '',
      location: '',
      start_at: toLocalInputValue(start.toISOString()),
      end_at: toLocalInputValue(end.toISOString()),
      category: '',
      reminder: 'none',
    }
  }
  return {
    title: appointment.title,
    description: appointment.description,
    location: appointment.location ?? '',
    start_at: toLocalInputValue(appointment.start_at),
    end_at: toLocalInputValue(appointment.end_at),
    category: appointment.category ?? '',
    reminder:
      appointment.reminder_minutes_before !== null &&
      (REMINDERS as readonly string[]).includes(String(appointment.reminder_minutes_before))
        ? (String(appointment.reminder_minutes_before) as (typeof REMINDERS)[number])
        : 'none',
  }
}

function toPayload(values: AppointmentFormValues) {
  return {
    title: values.title,
    description: values.description,
    location: values.location || null,
    start_at: new Date(values.start_at).toISOString(),
    end_at: new Date(values.end_at).toISOString(),
    category: values.category || null,
    reminder_minutes_before: values.reminder === 'none' ? null : Number(values.reminder),
  }
}

interface AppointmentFormProps {
  open: boolean
  onClose: () => void
  appointment?: Appointment
  defaultDay?: Date
}

export function AppointmentForm({ open, onClose, appointment, defaultDay }: AppointmentFormProps) {
  const { t } = useTranslation()
  const createAppointment = useCreateAppointment()
  const updateAppointment = useUpdateAppointment()
  const deleteAppointment = useDeleteAppointment()

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<AppointmentFormValues>({
    resolver: zodResolver(appointmentFormSchema),
    defaultValues: toFormValues(appointment, defaultDay),
  })

  // Réinitialise le formulaire quand on ouvre pour un autre rendez-vous
  useEffect(() => {
    if (open) reset(toFormValues(appointment, defaultDay))
  }, [open, appointment, defaultDay, reset])

  const onSubmit = async (values: AppointmentFormValues) => {
    const payload = toPayload(values)
    if (appointment) {
      await updateAppointment.mutateAsync({ id: appointment.id, ...payload })
      toast.success(t('appointments.toasts.updated'))
    } else {
      await createAppointment.mutateAsync(payload)
      toast.success(t('appointments.toasts.created'))
    }
    onClose()
  }

  const onDelete = async () => {
    if (!appointment) return
    await deleteAppointment.mutateAsync(appointment.id)
    toast.success(t('appointments.toasts.deleted'))
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {appointment ? t('appointments.edit') : t('appointments.new')}
          </DialogTitle>
        </DialogHeader>
        <form className="space-y-4" onSubmit={(e) => void handleSubmit(onSubmit)(e)} noValidate>
          <div className="space-y-2">
            <Label htmlFor="appointment-title">{t('appointments.form.title')}</Label>
            <Input id="appointment-title" {...register('title')} />
            {errors.title && (
              <p className="text-sm text-destructive">{t('appointments.form.titleRequired')}</p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="appointment-start">{t('appointments.form.start')}</Label>
              <Input id="appointment-start" type="datetime-local" {...register('start_at')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="appointment-end">{t('appointments.form.end')}</Label>
              <Input id="appointment-end" type="datetime-local" {...register('end_at')} />
              {errors.end_at && (
                <p className="text-sm text-destructive">
                  {t('appointments.form.endAfterStart')}
                </p>
              )}
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="appointment-location">{t('appointments.form.location')}</Label>
            <Input id="appointment-location" {...register('location')} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="appointment-description">{t('appointments.form.description')}</Label>
            <Textarea id="appointment-description" rows={3} {...register('description')} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="appointment-category">{t('appointments.form.category')}</Label>
              <Input id="appointment-category" {...register('category')} />
            </div>
            <div className="space-y-2">
              <Label>{t('appointments.form.reminder')}</Label>
              <Select
                value={watch('reminder')}
                onValueChange={(value) =>
                  setValue('reminder', value as (typeof REMINDERS)[number])
                }
              >
                <SelectTrigger className="w-full" aria-label={t('appointments.form.reminder')}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {REMINDERS.map((reminder) => (
                    <SelectItem key={reminder} value={reminder}>
                      {t(`appointments.reminders.${reminder}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-between gap-2">
            {appointment ? (
              <Button
                type="button"
                variant="destructive"
                onClick={() => void onDelete()}
                disabled={isSubmitting}
              >
                {t('appointments.delete')}
              </Button>
            ) : (
              <span />
            )}
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={onClose}>
                {t('appointments.form.cancel')}
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {t('appointments.form.save')}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
