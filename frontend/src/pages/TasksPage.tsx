import { ClipboardList, Plus } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { useTasks, type TaskFilters as Filters } from '@/features/tasks/api'
import { TaskCard } from '@/features/tasks/TaskCard'
import { TaskFilters } from '@/features/tasks/TaskFilters'
import { TaskForm } from '@/features/tasks/TaskForm'
import type { Task } from '@/types/api'

export function TasksPage() {
  const { t } = useTranslation()
  const [filters, setFilters] = useState<Filters>({})
  const [formOpen, setFormOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | undefined>(undefined)
  const { data, isLoading } = useTasks(filters)

  const openCreate = () => {
    setEditingTask(undefined)
    setFormOpen(true)
  }

  const openEdit = (task: Task) => {
    setEditingTask(task)
    setFormOpen(true)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-xl font-semibold">{t('tasks.title')}</h2>
        <Button onClick={openCreate}>
          <Plus />
          {t('tasks.new')}
        </Button>
      </div>

      <TaskFilters filters={filters} onChange={setFilters} />

      {isLoading ? (
        <p className="text-muted-foreground">{t('common.loading')}</p>
      ) : data && data.items.length > 0 ? (
        <div className="space-y-2">
          {data.items.map((task) => (
            <TaskCard key={task.id} task={task} onEdit={openEdit} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3 py-12 text-center">
          <div className="flex size-14 items-center justify-center rounded-full bg-primary/10">
            <ClipboardList className="size-7 text-primary" aria-hidden />
          </div>
          <p className="text-muted-foreground">{t('tasks.empty')}</p>
          <p className="text-sm text-muted-foreground/70">{t('tasks.emptyHint')}</p>
        </div>
      )}

      <TaskForm open={formOpen} onClose={() => setFormOpen(false)} task={editingTask} />
    </div>
  )
}
