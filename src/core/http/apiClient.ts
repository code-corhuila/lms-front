import axios from 'axios'

import { clearSession, getToken } from '../auth/session'

// The one HTTP client in the whole system — every portal consumes this via
// Module Federation (rules/2-anexos/H-front.md, "La regla que implementan los
// dos"). Only this file knows where the gateway is; a portal only ever asks
// for relative paths like /api/v1/students.
export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? '/api/v1',
  timeout: 10_000, // rules/2-anexos/H-front.md: 10s per request, then TIMEOUT
})

apiClient.interceptors.request.use((config) => {
  const token = getToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  config.headers['X-Correlation-Id'] = crypto.randomUUID()
  return config
})

export interface ShellError {
  error: string
  message: string
  traceId?: string
}

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // A 401 always means "log in again" — there is no refresh-token flow in v1
    // (library-docs/07-api/authentication.md).
    if (error.response?.status === 401) {
      clearSession()
      if (window.location.pathname !== '/login') {
        window.location.assign('/login')
      }
    }

    // Every fault a portal sees is shaped here, in the one place that knows
    // about HTTP status codes — a portal never inspects error.response itself
    // (rules/2-anexos/H-front.md, "Errores").
    if (error.code === 'ECONNABORTED') {
      const shellError: ShellError = { error: 'TIMEOUT', message: 'The request took too long. Please try again.' }
      return Promise.reject(shellError)
    }
    const body = error.response?.data as Partial<ShellError> | undefined
    const shellError: ShellError = {
      error: body?.error ?? 'INTERNAL_ERROR',
      message: body?.message ?? 'Something went wrong. Please try again.',
      traceId: body?.traceId,
    }
    return Promise.reject(shellError)
  },
)
