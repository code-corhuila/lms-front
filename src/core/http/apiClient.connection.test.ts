import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { closedPort, type FakeGateway, sendJson, startFakeGateway } from '../../test/fakeGateway'
import { getToken, setToken } from '../auth/session'
import { apiClient } from './apiClient'

// Unlike apiClient.test.ts (which swaps axios's adapter), these go over a real
// socket to a local HTTP server, so they also cover what the adapter mock
// can't: URL joining, header serialization, CORS preflight, real timeouts and
// dropped connections.
describe('apiClient over a real connection', () => {
  const assign = vi.fn()
  let gateway: FakeGateway | undefined

  beforeEach(() => {
    vi.stubGlobal('location', { pathname: '/dashboard', assign })
  })

  afterEach(async () => {
    await gateway?.close()
    gateway = undefined
    vi.unstubAllGlobals()
    assign.mockReset()
  })

  it('reaches the gateway under the base URL with the bearer token and a correlation id', async () => {
    setToken('live-token')
    gateway = await startFakeGateway((_, res) => sendJson(res, 200, { data: [], meta: { total: 0 } }))

    const { data, status } = await apiClient.get('/students?page=1', { baseURL: gateway.baseURL })

    expect(status).toBe(200)
    expect(data).toEqual({ data: [], meta: { total: 0 } })
    const [request] = gateway.received
    expect(request.method).toBe('GET')
    expect(request.url).toBe('/api/v1/students?page=1')
    expect(request.headers.authorization).toBe('Bearer live-token')
    expect(request.headers['x-correlation-id']).toMatch(/^[0-9a-f-]{36}$/)
  })

  it('sends a JSON body on POST', async () => {
    gateway = await startFakeGateway((_, res) => sendJson(res, 200, { accessToken: 't' }))

    await apiClient.post('/auth/login', { username: 'admin', password: 'secret' }, { baseURL: gateway.baseURL })

    const [request] = gateway.received
    expect(request.method).toBe('POST')
    expect(request.headers['content-type']).toContain('application/json')
    expect(JSON.parse(request.body)).toEqual({ username: 'admin', password: 'secret' })
    expect(request.headers.authorization).toBeUndefined()
  })

  it('reshapes a real error response into a ShellError', async () => {
    gateway = await startFakeGateway((_, res) =>
      sendJson(res, 503, { error: 'SERVICE_UNAVAILABLE', message: 'Catalog is down', traceId: 'trace-9' }),
    )

    await expect(apiClient.get('/books', { baseURL: gateway.baseURL })).rejects.toEqual({
      error: 'SERVICE_UNAVAILABLE',
      message: 'Catalog is down',
      traceId: 'trace-9',
    })
  })

  it('a real 401 clears the session and redirects to /login', async () => {
    setToken('expired')
    gateway = await startFakeGateway((_, res) => sendJson(res, 401, { error: 'UNAUTHORIZED', message: 'Token expired' }))

    await expect(apiClient.get('/loans', { baseURL: gateway.baseURL })).rejects.toMatchObject({ error: 'UNAUTHORIZED' })
    expect(getToken()).toBeNull()
    expect(assign).toHaveBeenCalledWith('/login')
  })

  it('maps a gateway that never answers to TIMEOUT once the timeout elapses', async () => {
    gateway = await startFakeGateway(() => {
      // never responds
    })

    const start = performance.now()
    await expect(apiClient.get('/students', { baseURL: gateway.baseURL, timeout: 150 })).rejects.toEqual({
      error: 'TIMEOUT',
      message: 'The request took too long. Please try again.',
    })
    expect(performance.now() - start).toBeGreaterThanOrEqual(140)
  })

  it('maps a refused connection (gateway down) to INTERNAL_ERROR', async () => {
    const port = await closedPort()

    await expect(apiClient.get('/students', { baseURL: `http://127.0.0.1:${port}/api/v1` })).rejects.toEqual({
      error: 'INTERNAL_ERROR',
      message: 'Something went wrong. Please try again.',
      traceId: undefined,
    })
  })

  it('maps a connection dropped mid-request to INTERNAL_ERROR and keeps the session', async () => {
    setToken('still-valid')
    gateway = await startFakeGateway((_, res) => {
      res.socket?.destroy()
    })

    await expect(apiClient.get('/students', { baseURL: gateway.baseURL })).rejects.toMatchObject({
      error: 'INTERNAL_ERROR',
    })
    expect(getToken()).toBe('still-valid')
    expect(assign).not.toHaveBeenCalled()
  })

  it('fails every cross-origin call if the gateway does not allow X-Correlation-Id in CORS', async () => {
    gateway = await startFakeGateway((_, res) => sendJson(res, 200, {}), {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    })

    await expect(apiClient.get('/students', { baseURL: gateway.baseURL })).rejects.toMatchObject({
      error: 'INTERNAL_ERROR',
    })
    // The preflight is rejected, so the real request never reaches the gateway.
    expect(gateway.received).toHaveLength(0)
  })
})
