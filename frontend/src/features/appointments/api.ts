import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { api } from '@/lib/api'
import type { Appointment, AppointmentListOut } from '@/types/api'

export interface AppointmentPayload {
  title: string
  description?: string
  location?: string | null
  start_at: string
  end_at: string
  category?: string | null
  color?: string | null
  reminder_minutes_before?: number | null
}

export function useAppointments(range: { from: string; to: string }) {
  return useQuery({
    queryKey: ['appointments', range],
    queryFn: async () => {
      const response = await api.get<AppointmentListOut>('/appointments', {
        params: { from: range.from, to: range.to, limit: 500 },
      })
      return response.data
    },
  })
}

function useInvalidatingMutation<Args>(mutationFn: (args: Args) => Promise<unknown>) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['appointments'] }),
  })
}

export function useCreateAppointment() {
  return useInvalidatingMutation((payload: AppointmentPayload) =>
    api.post<Appointment>('/appointments', payload),
  )
}

export function useUpdateAppointment() {
  return useInvalidatingMutation(({ id, ...payload }: AppointmentPayload & { id: string }) =>
    api.patch<Appointment>(`/appointments/${id}`, payload),
  )
}

export function useDeleteAppointment() {
  return useInvalidatingMutation((id: string) => api.delete(`/appointments/${id}`))
}
