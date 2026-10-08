// Ambient types for what each remote exposes, so App.tsx can import them with
// full type-checking even though the actual module only exists at runtime,
// resolved by @module-federation/vite against each entry in registry.ts.
declare module 'membership_portal/routes' {
  import type { RouteObject } from 'react-router-dom'
  export const membershipRoutes: RouteObject[]
}

declare module 'catalog_portal/routes' {
  import type { RouteObject } from 'react-router-dom'
  export const catalogRoutes: RouteObject[]
}

declare module 'circulation_portal/routes' {
  import type { RouteObject } from 'react-router-dom'
  export const circulationRoutes: RouteObject[]
}
