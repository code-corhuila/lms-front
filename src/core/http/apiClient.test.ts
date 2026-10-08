import { AxiosError, type AxiosAdapter, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { getToken, setToken } from '../auth/session'
import { apiClient } from './apiClient'

// Replaces axios's network layer, so every test runs the real interceptors
// against a fake server response.
function respondWith(status: number, data: unknown = {}) {
  const adapter = vi.fn<AxiosAdapter>(async (config) => {
    const response: AxiosResponse = { data, status, statusText: '', headers: {}, config }
    if (status >= 400) {
      throw new AxiosError('Request failed', String(status), config, null, response)
    }
    return response
  })
  apiClient.defaults.adapter = adapter
  return adapter
}

function sentConfig(adapter: ReturnType<typeof respondWith>): InternalAxiosRequestConfig {
  return adapter.mock.calls[0][0]
}

const originalAdapter = apiClient.defaults.adapter

describe('apiClient', () => {
  const assign = vi.fn()

  beforeEach(() => {
    vi.stubGlobal('location', { pathname: '/dashboard', assign })
  })

  afterEach(() => {
    apiClient.defaults.adapter = originalAdapter
    vi.unstubAllGlobals()
    assign.mockReset()
  })

  it('defaults to the /api/v1 base URL with a 10s timeout', () => {
    expect(apiClient.defaults.baseURL).toBe('/api/v1')
    expect(apiClient.defaults.timeout).toBe(10_000)
  })

  describe('request interceptor', () => {
    it('attaches the bearer token when there is a session', async () => {
      setToken('my-token')
      const adapter = respondWith(200)

      await apiClient.get('/students')

      expect(sentConfig(adapter).headers.Authorization).toBe('Bearer my-token')
    })

    it('sends no Authorization header without a session', async () => {
      const adapter = respondWith(200)

      await apiClient.get('/students')

      expect(sentConfig(adapter).headers.Authorization).toBeUndefined()
    })

    it('sends a fresh X-Correlation-Id UUID on every request', async () => {
      const adapter = respondWith(200)

      await apiClient.get('/a')
      await apiClient.get('/b')

      const first = adapter.mock.calls[0][0].headers['X-Correlation-Id']
      const second = adapter.mock.calls[1][0].headers['X-Correlation-Id']
      expect(first).toMatch(/^[0-9a-f-]{36}$/)
      expect(second).toMatch(/^[0-9a-f-]{36}$/)
      expect(first).not.toBe(second)
    })
  })

  describe('response interceptor', () => {
    it('passes successful responses through untouched', async () => {
      respondWith(200, { id: '1' })

      const { data } = await apiClient.get('/students/1')

      expect(data).toEqual({ id: '1' })
    })

    it('on 401 clears the session and redirects to /login', async () => {
      setToken('expired')
      respondWith(401, { error: 'UNAUTHORIZED', message: 'Token expired' })

      await expect(apiClient.get('/students')).rejects.toEqual({
        error: 'UNAUTHORIZED',
        message: 'Token expired',
        traceId: undefined,
      })
      expect(getToken()).toBeNull()
      expect(assign).toHaveBeenCalledWith('/login')
    })

    it('on 401 while already on /login does not redirect again', async () => {
      vi.stubGlobal('location', { pathname: '/login', assign })
      respondWith(401, { error: 'INVALID_CREDENTIALS', message: 'Invalid credentials' })

      await expect(apiClient.post('/auth/login')).rejects.toMatchObject({ error: 'INVALID_CREDENTIALS' })
      expect(assign).not.toHaveBeenCalled()
    })

    it('keeps the session on non-401 errors', async () => {
      setToken('still-valid')
      respondWith(403, { error: 'FORBIDDEN', message: 'Nope' })

      await expect(apiClient.get('/students')).rejects.toMatchObject({ error: 'FORBIDDEN' })
      expect(getToken()).toBe('still-valid')
      expect(assign).not.toHaveBeenCalled()
    })

    it('reshapes an API error body into a ShellError, keeping the traceId', async () => {
      respondWith(409, { error: 'BOOK_UNAVAILABLE', message: 'No copies left', traceId: 't-123', extra: 'x' })

      await expect(apiClient.post('/loans')).rejects.toEqual({
        error: 'BOOK_UNAVAILABLE',
        message: 'No copies left',
        traceId: 't-123',
      })
    })

    it('falls back to INTERNAL_ERROR when the body is not an API error', async () => {
      respondWith(500, '<html>Bad Gateway</html>')

      await expect(apiClient.get('/students')).rejects.toEqual({
        error: 'INTERNAL_ERROR',
        message: 'Something went wrong. Please try again.',
        traceId: undefined,
      })
    })

    it('falls back to INTERNAL_ERROR on a network error with no response', async () => {
      apiClient.defaults.adapter = async (config) => {
        throw new AxiosError('Network Error', 'ERR_NETWORK', config)
      }

      await expect(apiClient.get('/students')).rejects.toEqual({
        error: 'INTERNAL_ERROR',
        message: 'Something went wrong. Please try again.',
        traceId: undefined,
      })
    })

    it('maps a timeout (ECONNABORTED) to TIMEOUT', async () => {
      apiClient.defaults.adapter = async (config) => {
        throw new AxiosError('timeout of 10000ms exceeded', 'ECONNABORTED', config)
      }

      await expect(apiClient.get('/students')).rejects.toEqual({
        error: 'TIMEOUT',
        message: 'The request took too long. Please try again.',
      })
    })
  })
})
