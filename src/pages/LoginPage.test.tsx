import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { getToken, setToken } from '../core/auth/session'
import { apiClient } from '../core/http/apiClient'
import { LoginPage } from './LoginPage'

function renderLogin() {
  return render(
    <MemoryRouter initialEntries={['/login']}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/dashboard" element={<p>Dashboard screen</p>} />
      </Routes>
    </MemoryRouter>,
  )
}

async function fillAndSubmit(username = 'admin', password = 'secret') {
  const user = userEvent.setup()
  await user.type(screen.getByLabelText('Username'), username)
  await user.type(screen.getByLabelText('Password'), password)
  await user.click(screen.getByRole('button', { name: 'Sign in' }))
}

describe('LoginPage', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('redirects to /dashboard when already logged in', () => {
    setToken('abc')
    renderLogin()

    expect(screen.getByText('Dashboard screen')).toBeInTheDocument()
  })

  it('renders the sign-in form with required fields', () => {
    renderLogin()

    expect(screen.getByLabelText('Username')).toBeRequired()
    expect(screen.getByLabelText('Password')).toBeRequired()
    expect(screen.getByLabelText('Password')).toHaveAttribute('type', 'password')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('posts the credentials, stores the token and goes to /dashboard', async () => {
    const post = vi.spyOn(apiClient, 'post').mockResolvedValue({ data: { accessToken: 'new-token' } })
    renderLogin()

    await fillAndSubmit('admin', 'secret')

    expect(post).toHaveBeenCalledWith('/auth/login', { username: 'admin', password: 'secret' })
    expect(getToken()).toBe('new-token')
    expect(await screen.findByText('Dashboard screen')).toBeInTheDocument()
  })

  it('shows the API message on failure and stays on the page', async () => {
    vi.spyOn(apiClient, 'post').mockRejectedValue({ error: 'INVALID_CREDENTIALS', message: 'Invalid credentials' })
    renderLogin()

    await fillAndSubmit()

    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid credentials')
    expect(getToken()).toBeNull()
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeEnabled()
  })

  it('shows a generic message when the error has no message', async () => {
    vi.spyOn(apiClient, 'post').mockRejectedValue({})
    renderLogin()

    await fillAndSubmit()

    expect(await screen.findByRole('alert')).toHaveTextContent('Unable to reach the server. Please try again.')
  })

  it('disables the button while the request is in flight', async () => {
    let resolve!: (value: { data: { accessToken: string } }) => void
    vi.spyOn(apiClient, 'post').mockReturnValue(new Promise((r) => (resolve = r)))
    renderLogin()

    await fillAndSubmit()

    expect(screen.getByRole('button', { name: 'Sign in' })).toBeDisabled()
    resolve({ data: { accessToken: 't' } })
    expect(await screen.findByText('Dashboard screen')).toBeInTheDocument()
  })
})
