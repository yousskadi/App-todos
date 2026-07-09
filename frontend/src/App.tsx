import { Navigate, Route, Routes } from 'react-router-dom'

import { RequireAuth } from '@/components/RequireAuth'
import { AppLayout } from '@/layouts/AppLayout'
import { AppointmentsPage } from '@/pages/AppointmentsPage'
import { LoginPage } from '@/pages/LoginPage'
import { RegisterPage } from '@/pages/RegisterPage'
import { TasksPage } from '@/pages/TasksPage'
import { TodayPage } from '@/pages/TodayPage'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route element={<RequireAuth />}>
        <Route element={<AppLayout />}>
          <Route path="/today" element={<TodayPage />} />
          <Route path="/tasks" element={<TasksPage />} />
          <Route path="/appointments" element={<AppointmentsPage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/today" replace />} />
    </Routes>
  )
}
