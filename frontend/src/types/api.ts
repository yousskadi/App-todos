export interface User {
  id: string
  email: string
  display_name: string
  created_at: string
}

export interface AccessTokenOut {
  access_token: string
  token_type: string
  user: User
}

export type TaskPriority = 'urgent' | 'high' | 'normal' | 'low'
export type TaskStatus = 'todo' | 'in_progress' | 'done' | 'archived'

export interface Task {
  id: string
  title: string
  description: string
  priority: TaskPriority
  status: TaskStatus
  category: string | null
  tags: string[]
  color: string | null
  due_date: string | null
  completed_at: string | null
  created_at: string
  updated_at: string
}

export interface TaskListOut {
  items: Task[]
  total: number
}

export interface Appointment {
  id: string
  title: string
  description: string
  location: string | null
  start_at: string
  end_at: string
  category: string | null
  color: string | null
  reminder_minutes_before: number | null
  created_at: string
  updated_at: string
}

export interface AppointmentListOut {
  items: Appointment[]
  total: number
}
