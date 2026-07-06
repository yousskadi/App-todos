import { useTranslation } from 'react-i18next'

import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { TaskFilters as Filters } from '@/features/tasks/api'
import type { TaskPriority, TaskStatus } from '@/types/api'

const STATUSES: TaskStatus[] = ['todo', 'in_progress', 'done', 'archived']
const PRIORITIES: TaskPriority[] = ['urgent', 'high', 'normal', 'low']
const ALL = 'all'

interface TaskFiltersProps {
  filters: Filters
  onChange: (filters: Filters) => void
}

export function TaskFilters({ filters, onChange }: TaskFiltersProps) {
  const { t } = useTranslation()

  return (
    <div className="flex flex-col gap-2 sm:flex-row">
      <Input
        className="sm:max-w-xs"
        placeholder={t('tasks.search')}
        value={filters.q ?? ''}
        onChange={(event) => onChange({ ...filters, q: event.target.value })}
      />
      <Select
        value={filters.status ?? ALL}
        onValueChange={(value) =>
          onChange({ ...filters, status: value === ALL ? undefined : (value as TaskStatus) })
        }
      >
        <SelectTrigger className="sm:w-40" aria-label={t('tasks.form.priority')}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>{t('tasks.status.all')}</SelectItem>
          {STATUSES.map((status) => (
            <SelectItem key={status} value={status}>
              {t(`tasks.status.${status}`)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        value={filters.priority ?? ALL}
        onValueChange={(value) =>
          onChange({ ...filters, priority: value === ALL ? undefined : (value as TaskPriority) })
        }
      >
        <SelectTrigger className="sm:w-40" aria-label={t('tasks.form.priority')}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>{t('tasks.status.all')}</SelectItem>
          {PRIORITIES.map((priority) => (
            <SelectItem key={priority} value={priority}>
              {t(`tasks.priority.${priority}`)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
