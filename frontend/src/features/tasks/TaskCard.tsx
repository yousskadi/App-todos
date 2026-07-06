import { Archive, Check, Pencil, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useArchiveTask, useCompleteTask, useDeleteTask } from '@/features/tasks/api'
import type { Task, TaskPriority } from '@/types/api'

const PRIORITY_VARIANT: Record<TaskPriority, 'destructive' | 'default' | 'secondary' | 'outline'> =
  {
    urgent: 'destructive',
    high: 'default',
    normal: 'secondary',
    low: 'outline',
  }

export function TaskCard({ task, onEdit }: { task: Task; onEdit: (task: Task) => void }) {
  const { t, i18n } = useTranslation()
  const completeTask = useCompleteTask()
  const archiveTask = useArchiveTask()
  const deleteTask = useDeleteTask()

  const isDone = task.status === 'done'

  return (
    <Card
      data-testid="task-card"
      className="border-l-4"
      style={{ borderLeftColor: task.color ?? 'transparent' }}
    >
      <CardContent className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <p className={`font-medium ${isDone ? 'text-muted-foreground line-through' : ''}`}>
            {task.title}
          </p>
          {task.description && (
            <p className="truncate text-sm text-muted-foreground">{task.description}</p>
          )}
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge variant={PRIORITY_VARIANT[task.priority]}>
              {t(`tasks.priority.${task.priority}`)}
            </Badge>
            <Badge variant="outline">{t(`tasks.status.${task.status}`)}</Badge>
            {task.category && <Badge variant="secondary">{task.category}</Badge>}
            {task.tags.map((tag) => (
              <Badge key={tag} variant="outline">
                #{tag}
              </Badge>
            ))}
            {task.due_date && (
              <span className="text-xs text-muted-foreground">
                {new Date(task.due_date).toLocaleString(i18n.language, {
                  dateStyle: 'short',
                  timeStyle: 'short',
                })}
              </span>
            )}
          </div>
        </div>
        <div className="flex shrink-0 gap-1">
          {!isDone && task.status !== 'archived' && (
            <Button
              variant="ghost"
              size="icon"
              aria-label={t('tasks.complete')}
              onClick={() =>
                void completeTask
                  .mutateAsync(task.id)
                  .then(() => toast.success(t('tasks.toasts.completed')))
              }
            >
              <Check />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            aria-label={t('tasks.edit')}
            onClick={() => onEdit(task)}
          >
            <Pencil />
          </Button>
          {task.status !== 'archived' && (
            <Button
              variant="ghost"
              size="icon"
              aria-label={t('tasks.archive')}
              onClick={() =>
                void archiveTask
                  .mutateAsync(task.id)
                  .then(() => toast.success(t('tasks.toasts.archived')))
              }
            >
              <Archive />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            aria-label={t('tasks.delete')}
            onClick={() => {
              if (window.confirm(`${t('tasks.delete')} « ${task.title} » ?`)) {
                void deleteTask
                  .mutateAsync(task.id)
                  .then(() => toast.success(t('tasks.toasts.deleted')))
              }
            }}
          >
            <Trash2 />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
