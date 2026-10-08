import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { Button } from './Button'
import { Card } from './Card'
import { EmptyState } from './EmptyState'

describe('Button', () => {
  it('defaults to the primary variant and type passthrough', () => {
    render(<Button type="submit">Save</Button>)

    const button = screen.getByRole('button', { name: 'Save' })
    expect(button).toHaveClass('bg-primary-600')
    expect(button).toHaveAttribute('type', 'submit')
    expect(button).toBeEnabled()
  })

  it.each([
    ['secondary', 'border-slate-300'],
    ['danger', 'bg-error-600'],
    ['ghost', 'bg-transparent'],
  ] as const)('applies the %s variant classes', (variant, expectedClass) => {
    render(<Button variant={variant}>Go</Button>)

    expect(screen.getByRole('button')).toHaveClass(expectedClass)
  })

  it('merges a custom className', () => {
    render(<Button className="w-full">Go</Button>)

    expect(screen.getByRole('button')).toHaveClass('w-full', 'bg-primary-600')
  })

  it('is disabled and shows a spinner while loading', () => {
    const { container } = render(<Button isLoading>Save</Button>)

    expect(screen.getByRole('button')).toBeDisabled()
    expect(container.querySelector('.animate-spin')).toBeInTheDocument()
  })

  it('has no spinner when not loading', () => {
    const { container } = render(<Button>Save</Button>)

    expect(container.querySelector('.animate-spin')).not.toBeInTheDocument()
  })

  it('calls onClick when clicked, but not when disabled', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()
    const { rerender } = render(<Button onClick={onClick}>Go</Button>)

    await user.click(screen.getByRole('button'))
    expect(onClick).toHaveBeenCalledTimes(1)

    rerender(<Button onClick={onClick} disabled>Go</Button>)
    await user.click(screen.getByRole('button'))
    expect(onClick).toHaveBeenCalledTimes(1)
  })
})

describe('Card', () => {
  it('renders its children with base and custom classes', () => {
    render(<Card className="extra">Inside</Card>)

    const card = screen.getByText('Inside')
    expect(card).toHaveClass('rounded-xl', 'bg-white', 'extra')
  })
})

describe('EmptyState', () => {
  it('renders title, description and the user story tag', () => {
    render(<EmptyState title="Students" description="Owned by the membership portal" hu="HU-02" />)

    expect(screen.getByRole('heading', { name: 'Students' })).toBeInTheDocument()
    expect(screen.getByText('Owned by the membership portal')).toBeInTheDocument()
    expect(screen.getByText('Implemented in HU-02')).toBeInTheDocument()
  })
})
