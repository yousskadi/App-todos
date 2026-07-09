import { zodResolver } from '@hookform/resolvers/zod'
import { isAxiosError } from 'axios'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { z } from 'zod'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/context/AuthContext'

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

type LoginForm = z.infer<typeof loginSchema>

export function LoginPage() {
  const { user, login } = useAuth()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [serverError, setServerError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({ resolver: zodResolver(loginSchema) })

  if (user) return <Navigate to="/today" replace />

  const onSubmit = async (values: LoginForm) => {
    setServerError(null)
    try {
      await login(values.email, values.password)
      navigate('/today', { replace: true })
    } catch (error) {
      if (isAxiosError(error) && error.response?.status === 401) {
        setServerError(t('auth.errors.invalidCredentials'))
      } else {
        setServerError(t('common.error'))
      }
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>{t('auth.loginTitle')}</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={(e) => void handleSubmit(onSubmit)(e)} noValidate>
            <div className="space-y-2">
              <Label htmlFor="email">{t('auth.email')}</Label>
              <Input id="email" type="email" autoComplete="email" {...register('email')} />
              {errors.email && (
                <p className="text-sm text-destructive">{t('auth.errors.emailInvalid')}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">{t('auth.password')}</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                {...register('password')}
              />
            </div>
            {serverError && <p className="text-sm text-destructive">{serverError}</p>}
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {t('auth.login')}
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            {t('auth.noAccount')}{' '}
            <Link className="underline" to="/register">
              {t('auth.register')}
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
