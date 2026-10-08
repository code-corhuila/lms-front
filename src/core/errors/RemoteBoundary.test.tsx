import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { RemoteBoundary } from './RemoteBoundary'

function Exploding(): never {
  throw new Error('remoteEntry.js failed to load')
}

describe('RemoteBoundary', () => {
  it('renders its children when nothing fails', () => {
    render(
      <RemoteBoundary portalName="Catalog">
        <p>Catalog content</p>
      </RemoteBoundary>,
    )

    expect(screen.getByText('Catalog content')).toBeInTheDocument()
  })

  it('shows the default fallback naming the portal when a child throws', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

    render(
      <RemoteBoundary portalName="Catalog">
        <Exploding />
      </RemoteBoundary>,
    )

    expect(screen.getByText("Catalog isn't available right now.")).toBeInTheDocument()
    expect(screen.getByText('The rest of the application keeps working.')).toBeInTheDocument()
    expect(consoleError).toHaveBeenCalledWith(
      '[RemoteBoundary] Catalog failed to load',
      expect.any(Error),
      expect.anything(),
    )
  })

  it('uses a custom fallback when one is given', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})

    render(
      <RemoteBoundary portalName="Catalog" fallback={<p>Custom fallback</p>}>
        <Exploding />
      </RemoteBoundary>,
    )

    expect(screen.getByText('Custom fallback')).toBeInTheDocument()
    expect(screen.queryByText("Catalog isn't available right now.")).not.toBeInTheDocument()
  })

  it('only takes down its own subtree', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})

    render(
      <>
        <RemoteBoundary portalName="Catalog">
          <Exploding />
        </RemoteBoundary>
        <RemoteBoundary portalName="Loans">
          <p>Loans content</p>
        </RemoteBoundary>
      </>,
    )

    expect(screen.getByText("Catalog isn't available right now.")).toBeInTheDocument()
    expect(screen.getByText('Loans content')).toBeInTheDocument()
  })
})
