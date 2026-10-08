import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { type FakeGateway, sendJson, startFakeGateway } from '../../test/fakeGateway'
import { report, summarize, timed, withConcurrency } from '../../test/perf'
import { getToken, setToken } from '../auth/session'
import { apiClient, type ShellError } from './apiClient'

// Load tests for the one HTTP client every portal shares: many requests in
// flight at once over real sockets. Budgets are deliberately loose (CI
// machines are slow and noisy) — they catch order-of-magnitude regressions,
// like a request serializing behind another, not small slowdowns.
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

describe('apiClient under load', () => {
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

  // Not 500 sockets at once: with jsdom's XMLHttpRequest and the server in the
  // same process, the test harness itself starts dropping connections past
  // ~230 simultaneous ones (a plain axios instance does too, so it isn't the
  // shell's interceptors) — and no browser would open that many anyway.
  it('500 requests, 50 in flight at a time, all succeed with their own correlation id', async () => {
    setToken('load-token')
    gateway = await startFakeGateway(async (request, res) => {
      await delay(Math.random() * 25)
      sendJson(res, 200, { echo: request.url })
    })
    const baseURL = gateway.baseURL

    const { result: samples, ms: totalMs } = await timed(() =>
      withConcurrency(500, 50, async (i) => {
        const { result, ms } = await timed(() => apiClient.get(`/books/${i}`, { baseURL }))
        expect(result.data).toEqual({ echo: `/api/v1/books/${i}` })
        return ms
      }),
    )

    const stats = summarize(samples)
    report('apiClient 500 GET (50 in flight)', stats, `total=${totalMs.toFixed(0)}ms rps=${(500 / (totalMs / 1000)).toFixed(0)}`)
    const correlationIds = new Set(gateway.received.map((r) => r.headers['x-correlation-id']))
    expect(correlationIds.size).toBe(500)
    expect(gateway.received.every((r) => r.headers.authorization === 'Bearer load-token')).toBe(true)
    expect(stats.p95).toBeLessThan(5_000)
  })

  it('keeps each response matched to its own request when successes and failures interleave', async () => {
    gateway = await startFakeGateway(async (request, res) => {
      const i = Number(request.url.split('/').pop())
      await delay(Math.random() * 15)
      if (i % 5 === 0) return sendJson(res, 409, { error: 'BOOK_UNAVAILABLE', message: `no copies of ${i}`, traceId: `t-${i}` })
      if (i % 7 === 0) return sendJson(res, 500, '<html>Bad Gateway</html>')
      sendJson(res, 200, { id: i })
    })
    const baseURL = gateway.baseURL

    const results = await Promise.allSettled(Array.from({ length: 100 }, (_, i) => apiClient.post(`/loans/${i}`, {}, { baseURL })))

    results.forEach((result, i) => {
      if (i % 5 === 0) {
        expect(result).toEqual({
          status: 'rejected',
          reason: { error: 'BOOK_UNAVAILABLE', message: `no copies of ${i}`, traceId: `t-${i}` },
        })
      } else if (i % 7 === 0) {
        expect(result).toMatchObject({ status: 'rejected', reason: { error: 'INTERNAL_ERROR' } })
      } else {
        expect(result).toMatchObject({ status: 'fulfilled', value: { data: { id: i } } })
      }
    })
    expect(assign).not.toHaveBeenCalled()
  })

  it('times out 100 hung requests in parallel, not one after another', async () => {
    gateway = await startFakeGateway(() => {
      // never responds
    })
    const baseURL = gateway.baseURL

    const { result: results, ms } = await timed(() =>
      Promise.allSettled(Array.from({ length: 100 }, () => apiClient.get('/students', { baseURL, timeout: 300 }))),
    )

    console.info(`[perf] apiClient 100 concurrent timeouts (300ms each): total=${ms.toFixed(0)}ms`)
    for (const result of results) {
      expect(result).toMatchObject({ status: 'rejected', reason: { error: 'TIMEOUT' } satisfies Partial<ShellError> })
    }
    // Serialized, this would take 100 × 300ms = 30s.
    expect(ms).toBeLessThan(5_000)
  })

  it('a burst of concurrent 401s clears the session and rejects every caller with UNAUTHORIZED', async () => {
    setToken('expired')
    gateway = await startFakeGateway((_, res) => sendJson(res, 401, { error: 'UNAUTHORIZED', message: 'Token expired' }))
    const baseURL = gateway.baseURL

    const results = await Promise.allSettled(Array.from({ length: 50 }, () => apiClient.get('/loans', { baseURL })))

    expect(results.every((r) => r.status === 'rejected' && r.reason.error === 'UNAUTHORIZED')).toBe(true)
    expect(getToken()).toBeNull()
    expect(assign).toHaveBeenCalledWith('/login')
    // There is no dedup: every 401 in flight calls location.assign('/login').
    // Harmless in a browser (the first one already started the navigation),
    // but recorded here so a change in that behavior is noticed.
    console.info(`[perf] apiClient 50 concurrent 401s: location.assign called ${assign.mock.calls.length} times`)
  })
})
