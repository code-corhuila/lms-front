import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { setToken } from '../core/auth/session'
import App from './App'

// The real modules only exist at runtime, served by each portal's
// remoteEntry.js. The catalog one throws to stand in for a portal that's down.
vi.mock('membership_portal/routes', () => ({
  membershipRoutes: [{ index: true, element: <p>Students list</p> }],
}))
vi.mock('catalog_portal/routes', () => {
  throw new Error('catalog portal is down')
})
vi.mock('circulation_portal/routes', () => ({
  circulationRoutes: [
    { index: true, element: <p>Loans list</p> },
    { path: 'overdue', element: <p>Overdue loans list</p> },
  ],
}))

function renderAt(path: string) {
  window.history.pushState({}, '', path)
  return render(<App />)
}

describe('App routes', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  it('/ redirects to /login without a session', () => {
    renderAt('/')

    expect(screen.getByRole('button', { name: 'Sign in' })).toBeInTheDocument()
    expect(window.location.pathname).toBe('/login')
  })

  it('/ redirects to /dashboard with a session', () => {
    setToken('abc')
    renderAt('/')

    expect(screen.getByRole('heading', { name: 'Dashboard' })).toBeInTheDocument()
    expect(window.location.pathname).toBe('/dashboard')
  })

  it.each(['/dashboard', '/students', '/books', '/loans/overdue'])('%s requires a session', (path) => {
    renderAt(path)

    expect(window.location.pathname).toBe('/login')
  })

  it('/students loads the membership portal routes', async () => {
    setToken('abc')
    renderAt('/students')

    expect(await screen.findByText('Students list')).toBeInTheDocument()
  })

  it('/loans/overdue resolves a nested remote route', async () => {
    setToken('abc')
    renderAt('/loans/overdue')

    expect(await screen.findByText('Overdue loans list')).toBeInTheDocument()
  })

  it('a portal that fails to load only blanks its own route', async () => {
    setToken('abc')
    renderAt('/books')

    expect(await screen.findByText("Catalog isn't available right now.")).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Dashboard' })).toBeInTheDocument()
  })

  it('unknown routes show the 404 page', () => {
    renderAt('/does-not-exist')

    expect(screen.getByText('404')).toBeInTheDocument()
  })
})
