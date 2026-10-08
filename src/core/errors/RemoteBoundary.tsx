import { Component, type ErrorInfo, type PropsWithChildren, type ReactNode } from 'react'

interface Props extends PropsWithChildren {
  portalName: string
  fallback?: ReactNode
}

interface State {
  hasError: boolean
}

// One error boundary per remote portal (rules/2-anexos/H-front.md, "Un portal
// caído no tumba la aplicación"): a portal that fails to load or throws while
// rendering only takes down its own route, not the whole shell. Combined with
// shareStrategy: 'loaded-first' in vite.config.ts, which only fetches a
// remote when its route is opened — a portal that's down doesn't block the
// shell from starting at all.
export class RemoteBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(`[RemoteBoundary] ${this.props.portalName} failed to load`, error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-6 text-center">
            <p className="text-sm font-medium text-amber-800">
              {this.props.portalName} isn't available right now.
            </p>
            <p className="mt-1 text-sm text-amber-700">The rest of the application keeps working.</p>
          </div>
        )
      )
    }
    return this.props.children
  }
}
