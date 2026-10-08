import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it } from 'vitest'

import { RequireAuth } from './RequireAuth'
import { setToken } from './session'

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/login" element={<p>Login screen</p>} />
        <Route path="/dashboard" element={<RequireAuth><p>Secret content</p></RequireAuth>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('RequireAuth', () => {
  it('redirects to /login without a session', () => {
    renderAt('/dashboard')

    expect(screen.getByText('Login screen')).toBeInTheDocument()
    expect(screen.queryByText('Secret content')).not.toBeInTheDocument()
  })

  it('renders the children inside the app layout with a session', () => {
    setToken('abc')
    renderAt('/dashboard')

    expect(screen.getByText('Secret content')).toBeInTheDocument()
    expect(screen.getByText('Administrator panel')).toBeInTheDocument()
  })
})
