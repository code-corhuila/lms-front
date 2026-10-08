import type { PropsWithChildren } from 'react'
import { Navigate } from 'react-router-dom'

import { AppLayout } from '../../layout/AppLayout'
import { isAuthenticated } from './session'

// Every route under /dashboard, /students, /books, /loans redirects to /login
// without a session — library-docs/12-ux-ui/navigation-map.md, "Navigation rules".
// Renamed from ProtectedRoute to match rules/2-anexos/H-front.md's expected name.
export function RequireAuth({ children }: PropsWithChildren) {
  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />
  }
  return <AppLayout>{children}</AppLayout>
}
