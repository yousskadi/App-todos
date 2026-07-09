import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { api } from '@/lib/api'
import type { Task, TaskListOut, TaskPriority, TaskStatus } from '@/types/api'

export interface TaskFilters {
  q?: string
  status?: TaskStatus
  priority?: TaskPriority
  category?: string
}

export interface TaskPayload {
  title: string
  description?: string
  priority?: TaskPriority
  category?: string | null
  tags?: string[]
  color?: string | null
  due_date?: string | null
}

export function useTasks(filters: TaskFilters) {
  return useQuery({
    queryKey: ['tasks', filters],
    queryFn: async () => {
      const params = Object.fromEntries(
        Object.entries(filters).filter(([, value]) => value !== undefined && value !== ''),
      )
      const response = await api.get<TaskListOut>('/tasks', { params })
      return response.data
    },
  })
}

function useInvalidatingMutation<Args>(mutationFn: (args: Args) => Promise<unknown>) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tasks'] }),
  })
}

export function useCreateTask() {
  return useInvalidatingMutation((payload: TaskPayload) => api.post<Task>('/tasks', payload))
}

export function useUpdateTask() {
  return useInvalidatingMutation(({ id, ...payload }: TaskPayload & { id: string }) =>
    api.patch<Task>(`/tasks/${id}`, payload),
  )
}

export function useCompleteTask() {
  return useInvalidatingMutation((id: string) => api.post<Task>(`/tasks/${id}/complete`))
}

export function useArchiveTask() {
  return useInvalidatingMutation((id: string) => api.post<Task>(`/tasks/${id}/archive`))
}

export function useDeleteTask() {
  return useInvalidatingMutation((id: string) => api.delete(`/tasks/${id}`))
}
