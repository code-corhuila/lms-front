import { type FormEvent, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'

import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { isAuthenticated, setToken } from '../core/auth/session'
import { apiClient, type ShellError } from '../core/http/apiClient'

// Implements HU-01 (library-docs/04-requirements/user-stories.md):
// "As the administrator, I want to log in with a secure username and password."
export function LoginPage() {
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (isAuthenticated()) {
    return <Navigate to="/dashboard" replace />
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setIsSubmitting(true)
    try {
      const { data } = await apiClient.post<{ accessToken: string }>('/auth/login', { username, password })
      setToken(data.accessToken)
      navigate('/dashboard')
    } catch (err) {
      // The API deliberately returns the same generic error for a wrong username
      // or a wrong password (INV-002 on Administrator) — the UI must not try to
      // guess which one it was. apiClient's interceptor already reshapes any
      // failure into a ShellError — no need to dig into err.response here.
      setError((err as ShellError).message ?? 'Unable to reach the server. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-600 text-xl font-bold text-white">
            L
          </div>
          <h1 className="text-xl font-semibold text-slate-900">LMS Library</h1>
          <p className="text-sm text-slate-500">Sign in to manage the library</p>
        </div>

        <Card>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="username" className="mb-1 block text-sm font-medium text-slate-700">
                Username
              </label>
              <input
                id="username"
                name="username"
                autoComplete="username"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100"
              />
            </div>

            <div>
              <label htmlFor="password" className="mb-1 block text-sm font-medium text-slate-700">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100"
              />
            </div>

            {error && (
              <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-error-600">
                {error}
              </p>
            )}

            <Button type="submit" className="w-full" isLoading={isSubmitting}>
              Sign in
            </Button>
          </form>
        </Card>
      </div>
    </div>
  )
}
