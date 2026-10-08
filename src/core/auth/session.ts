// The one session store in the whole system — every portal consumes this via
// Module Federation, never its own token storage (rules/2-anexos/H-front.md).
// A single Administrator role, no RBAC (library-docs/02-domain/domain-map.md), so
// there is nothing to store beyond "is there a valid token".

const TOKEN_KEY = 'lms.accessToken'

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token)
}

export function clearSession(): void {
  localStorage.removeItem(TOKEN_KEY)
}

export function isAuthenticated(): boolean {
  return getToken() !== null
}
