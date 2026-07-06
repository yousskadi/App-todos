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
import { useCreateTask, useUpdateTask } from '@/features/tasks/api'
import type { Task, TaskPriority } from '@/types/api'

const PRIORITIES: TaskPriority[] = ['urgent', 'high', 'normal', 'low']

const taskFormSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(5000),
  priority: z.enum(['urgent', 'high', 'normal', 'low']),
  category: z.string().max(50),
  tags: z.string(),
  due_date: z.string(),
})

type TaskFormValues = z.infer<typeof taskFormSchema>

function toFormValues(task?: Task): TaskFormValues {
  return {
    title: task?.title ?? '',
    description: task?.description ?? '',
    priority: task?.priority ?? 'normal',
    category: task?.category ?? '',
    tags: task?.tags.join(', ') ?? '',
    // datetime-local attend "YYYY-MM-DDTHH:mm" en heure locale
    due_date: task?.due_date ? task.due_date.slice(0, 16) : '',
  }
}

function toPayload(values: TaskFormValues) {
  return {
    title: values.title,
    description: values.description,
    priority: values.priority,
    category: values.category || null,
    tags: values.tags
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean),
    due_date: values.due_date ? new Date(values.due_date).toISOString() : null,
  }
}

interface TaskFormProps {
  open: boolean
  onClose: () => void
  task?: Task
}

export function TaskForm({ open, onClose, task }: TaskFormProps) {
  const { t } = useTranslation()
  const createTask = useCreateTask()
  const updateTask = useUpdateTask()

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<TaskFormValues>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: toFormValues(task),
  })

  // Réinitialise le formulaire quand on ouvre pour une autre tâche
  useEffect(() => {
    if (open) reset(toFormValues(task))
  }, [open, task, reset])

  const onSubmit = async (values: TaskFormValues) => {
    const payload = toPayload(values)
    if (task) {
      await updateTask.mutateAsync({ id: task.id, ...payload })
      toast.success(t('tasks.toasts.updated'))
    } else {
      await createTask.mutateAsync(payload)
      toast.success(t('tasks.toasts.created'))
    }
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{task ? t('tasks.edit') : t('tasks.new')}</DialogTitle>
        </DialogHeader>
        <form className="space-y-4" onSubmit={(e) => void handleSubmit(onSubmit)(e)} noValidate>
          <div className="space-y-2">
            <Label htmlFor="task-title">{t('tasks.form.title')}</Label>
            <Input id="task-title" {...register('title')} />
            {errors.title && (
              <p className="text-sm text-destructive">{t('tasks.form.titleRequired')}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="task-description">{t('tasks.form.description')}</Label>
            <Textarea id="task-description" rows={3} {...register('description')} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t('tasks.form.priority')}</Label>
              <Select
                value={watch('priority')}
                onValueChange={(value) => setValue('priority', value as TaskPriority)}
              >
                <SelectTrigger className="w-full" aria-label={t('tasks.form.priority')}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITIES.map((priority) => (
                    <SelectItem key={priority} value={priority}>
                      {t(`tasks.priority.${priority}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="task-category">{t('tasks.form.category')}</Label>
              <Input id="task-category" {...register('category')} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="task-tags">{t('tasks.form.tags')}</Label>
            <Input id="task-tags" {...register('tags')} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="task-due-date">{t('tasks.form.dueDate')}</Label>
            <Input id="task-due-date" type="datetime-local" {...register('due_date')} />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              {t('tasks.form.cancel')}
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {t('tasks.form.save')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
