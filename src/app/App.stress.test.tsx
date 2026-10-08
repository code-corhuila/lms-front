import { act, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { setToken } from '../core/auth/session'
import { RemoteBoundary } from '../core/errors/RemoteBoundary'
import { apiClient } from '../core/http/apiClient'
import { LoginPage } from '../pages/LoginPage'
import { report, summarize } from '../test/perf'
import App from './App'

// UI stress tests for the shell: repeated mounts, rapid navigation, repeated
// clicks and many failing remotes at once. Render budgets are loose (jsdom on
// a CI runner) and meant to catch order-of-magnitude regressions only.
vi.mock('membership_portal/routes', () => ({
  membershipRoutes: [{ index: true, element: <p>Students list</p> }],
}))
vi.mock('catalog_portal/routes', () => ({
  catalogRoutes: [{ index: true, element: <p>Books list</p> }],
}))
vi.mock('circulation_portal/routes', () => ({
  circulationRoutes: [
    { index: true, element: <p>Loans list</p> },
    { path: 'overdue', element: <p>Overdue loans list</p> },
  ],
}))

function renderAppAt(path: string) {
  window.history.pushState({}, '', path)
  return render(<App />)
}

describe('shell UI under stress', () => {
  beforeEach(() => {
    setToken('abc')
  })

  it('mounts and unmounts the dashboard 200 times without leaking DOM', () => {
    const samples: number[] = []

    for (let i = 0; i < 200; i++) {
      const start = performance.now()
      const { unmount } = renderAppAt('/dashboard')
      samples.push(performance.now() - start)
      expect(screen.getByRole('heading', { name: 'Dashboard' })).toBeInTheDocument()
      unmount()
    }

    const stats = summarize(samples)
    report('App /dashboard mount', stats)
    expect(document.body.querySelectorAll('aside, main')).toHaveLength(0)
    expect(stats.p95).toBeLessThan(250)
  })

  it('survives 250 rapid navigations across every portal route', async () => {
    const consoleError = vi.spyOn(console, 'error')
    renderAppAt('/dashboard')
    const labels = ['Students', 'Catalog', 'Loans', 'Overdue', 'Dashboard']

    const start = performance.now()
    for (let i = 0; i < 250; i++) {
      fireEvent.click(screen.getByRole('link', { name: labels[i % labels.length] }))
    }
    const ms = performance.now() - start

    console.info(`[perf] App 250 nav clicks: total=${ms.toFixed(0)}ms per-click=${(ms / 250).toFixed(2)}ms`)
    // 250 % 5 === 0, so the last click was 'Dashboard'.
    expect(window.location.pathname).toBe('/dashboard')
    expect(screen.getByRole('heading', { name: 'Dashboard' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('link', { name: 'Overdue' }))
    expect(await screen.findByText('Overdue loans list')).toBeInTheDocument()
    expect(consoleError).not.toHaveBeenCalled()
  })

  it('isolates 25 failing remotes out of 50 on the same screen', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    function Exploding(): never {
      throw new Error('remoteEntry.js failed to load')
    }

    const start = performance.now()
    render(
      <>
        {Array.from({ length: 50 }, (_, i) => (
          <RemoteBoundary key={i} portalName={`Portal ${i}`}>
            {i % 2 === 0 ? <Exploding /> : <p>Portal {i} content</p>}
          </RemoteBoundary>
        ))}
      </>,
    )
    console.info(`[perf] 50 RemoteBoundary (25 failing) render: ${(performance.now() - start).toFixed(1)}ms`)

    expect(screen.getAllByText(/isn't available right now\./)).toHaveLength(25)
    expect(screen.getAllByText(/Portal \d+ content/)).toHaveLength(25)
  })
})

describe('LoginPage under repeated submits', () => {
  it('sends a single login request however many times Sign in is clicked while one is in flight', async () => {
    let resolve!: (value: { data: { accessToken: string } }) => void
    const post = vi.spyOn(apiClient, 'post').mockReturnValue(new Promise((r) => (resolve = r)))
    const user = userEvent.setup()
    render(
      <MemoryRouter initialEntries={['/login']}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/dashboard" element={<p>Dashboard screen</p>} />
        </Routes>
      </MemoryRouter>,
    )
    await user.type(screen.getByLabelText('Username'), 'admin')
    await user.type(screen.getByLabelText('Password'), 'secret')

    const button = screen.getByRole('button', { name: 'Sign in' })
    for (let i = 0; i < 20; i++) {
      await user.click(button)
    }

    expect(post).toHaveBeenCalledTimes(1)
    await act(async () => resolve({ data: { accessToken: 't' } }))
    expect(await screen.findByText('Dashboard screen')).toBeInTheDocument()
  })
})
