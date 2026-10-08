import { createServer, type IncomingHttpHeaders, type ServerResponse } from 'node:http'
import type { AddressInfo } from 'node:net'

export interface ReceivedRequest {
  method: string
  url: string
  headers: IncomingHttpHeaders
  body: string
}

type Handler = (request: ReceivedRequest, res: ServerResponse) => void | Promise<void>

// What lms-api-gateway has to answer a cross-origin preflight with when
// VITE_API_BASE_URL points at another origin: apiClient always sends
// Authorization and X-Correlation-Id, neither of which is CORS-safelisted.
export const GATEWAY_CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type, X-Correlation-Id',
}

// A real HTTP server on an ephemeral 127.0.0.1 port standing in for
// lms-api-gateway, so apiClient's interceptors run over an actual socket
// (jsdom's XMLHttpRequest, CORS preflight included) instead of a mocked adapter.
export async function startFakeGateway(handler: Handler, corsHeaders = GATEWAY_CORS_HEADERS) {
  const received: ReceivedRequest[] = []
  const server = createServer(async (req, res) => {
    for (const [name, value] of Object.entries(corsHeaders)) {
      res.setHeader(name, value)
    }
    if (req.method === 'OPTIONS') {
      res.writeHead(204).end()
      return
    }
    let body = ''
    for await (const chunk of req) {
      body += chunk
    }
    const request = { method: req.method ?? '', url: req.url ?? '', headers: req.headers, body }
    received.push(request)
    await handler(request, res)
  })

  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  const { port } = server.address() as AddressInfo

  return {
    port,
    baseURL: `http://127.0.0.1:${port}/api/v1`,
    received,
    close() {
      // Handlers that never answer (timeout tests) would keep close() waiting forever.
      server.closeAllConnections()
      return new Promise<void>((resolve) => server.close(() => resolve()))
    },
  }
}

export type FakeGateway = Awaited<ReturnType<typeof startFakeGateway>>

export function sendJson(res: ServerResponse, status: number, body: unknown) {
  res.writeHead(status, { 'Content-Type': 'application/json' }).end(JSON.stringify(body))
}

// A port nothing listens on: bind one, then release it.
export async function closedPort() {
  const gateway = await startFakeGateway(() => {})
  await gateway.close()
  return gateway.port
}
