import { Suspense, lazy } from 'react'
import { Navigate, Route, BrowserRouter as Router, Routes, type RouteObject } from 'react-router-dom'

import { RequireAuth } from '../core/auth/RequireAuth'
import { RemoteBoundary } from '../core/errors/RemoteBoundary'
import { LoginPage } from '../pages/LoginPage'
import { DashboardPage } from '../pages/DashboardPage'
import { NotFoundPage } from '../pages/NotFoundPage'

// Route tree mirrors library-docs/12-ux-ui/navigation-map.md. All three
// domain portals are real Module Federation remotes now
// (rules/2-anexos/H-front.md) — loaded from src/remotes/registry.ts's
// devUrl entries, each wrapped in its own RemoteBoundary so one down portal
// only blanks its own route.
function renderRemoteRoutes(routes: RouteObject[]) {
  return (
    <Routes>
      {routes.map((route) => (
        <Route key={route.path ?? 'index'} index={route.index} path={route.path} element={route.element} />
      ))}
    </Routes>
  )
}

const MembershipRoutes = lazy(() =>
  import('membership_portal/routes').then((m) => ({ default: () => renderRemoteRoutes(m.membershipRoutes) })),
)
const CatalogRoutes = lazy(() =>
  import('catalog_portal/routes').then((m) => ({ default: () => renderRemoteRoutes(m.catalogRoutes) })),
)
const CirculationRoutes = lazy(() =>
  import('circulation_portal/routes').then((m) => ({ default: () => renderRemoteRoutes(m.circulationRoutes) })),
)

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/login" element={<LoginPage />} />

        <Route path="/dashboard" element={<RequireAuth><DashboardPage /></RequireAuth>} />

        <Route
          path="/students/*"
          element={
            <RequireAuth>
              <RemoteBoundary portalName="Students (Membership)">
                <Suspense fallback={<p className="p-6 text-sm text-slate-500">Loading Students…</p>}>
                  <MembershipRoutes />
                </Suspense>
              </RemoteBoundary>
            </RequireAuth>
          }
        />
        <Route
          path="/books/*"
          element={
            <RequireAuth>
              <RemoteBoundary portalName="Catalog">
                <Suspense fallback={<p className="p-6 text-sm text-slate-500">Loading Catalog…</p>}>
                  <CatalogRoutes />
                </Suspense>
              </RemoteBoundary>
            </RequireAuth>
          }
        />
        <Route
          path="/loans/*"
          element={
            <RequireAuth>
              <RemoteBoundary portalName="Loans (Circulation)">
                <Suspense fallback={<p className="p-6 text-sm text-slate-500">Loading Loans…</p>}>
                  <CirculationRoutes />
                </Suspense>
              </RemoteBoundary>
            </RequireAuth>
          }
        />

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Router>
  )
}

export default App
