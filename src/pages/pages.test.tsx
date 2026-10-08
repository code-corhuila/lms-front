import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'

import { DashboardPage } from './DashboardPage'
import { NotFoundPage } from './NotFoundPage'

describe('DashboardPage', () => {
  it('renders the heading and the four placeholder stats', () => {
    render(<DashboardPage />)

    expect(screen.getByRole('heading', { name: 'Dashboard' })).toBeInTheDocument()
    for (const label of ['Active loans', 'Overdue loans', 'Registered students', 'Books in catalog']) {
      expect(screen.getByText(label)).toBeInTheDocument()
    }
    expect(screen.getAllByText('—')).toHaveLength(4)
  })
})

describe('NotFoundPage', () => {
  it('shows a 404 with a link back to the dashboard', () => {
    render(
      <MemoryRouter>
        <NotFoundPage />
      </MemoryRouter>,
    )

    expect(screen.getByText('404')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Back to dashboard' })).toHaveAttribute('href', '/dashboard')
  })
})
