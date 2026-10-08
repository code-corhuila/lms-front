import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it } from 'vitest'

import { getToken, setToken } from '../core/auth/session'
import { AppLayout } from './AppLayout'

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/login" element={<p>Login screen</p>} />
        <Route path="*" element={<AppLayout><p>Page body</p></AppLayout>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('AppLayout', () => {
  it('renders the nav items pointing at each route, plus the page body', () => {
    renderAt('/dashboard')

    const expected = {
      Dashboard: '/dashboard',
      Students: '/students',
      Catalog: '/books',
      Loans: '/loans',
      Overdue: '/loans/overdue',
    }
    for (const [label, href] of Object.entries(expected)) {
      expect(screen.getByRole('link', { name: label })).toHaveAttribute('href', href)
    }
    expect(screen.getByText('Page body')).toBeInTheDocument()
  })

  it('highlights the active nav item', () => {
    renderAt('/books')

    expect(screen.getByRole('link', { name: 'Catalog' })).toHaveClass('bg-primary-50')
    expect(screen.getByRole('link', { name: 'Dashboard' })).not.toHaveClass('bg-primary-50')
  })

  it('log out clears the session and goes to /login', async () => {
    const user = userEvent.setup()
    setToken('abc')
    renderAt('/dashboard')

    await user.click(screen.getByRole('button', { name: 'Log out' }))

    expect(getToken()).toBeNull()
    expect(screen.getByText('Login screen')).toBeInTheDocument()
  })
})
