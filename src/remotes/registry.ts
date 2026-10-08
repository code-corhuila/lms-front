// Which portals exist and where their remoteEntry lives — matched by
// vite.config.ts's federation({ remotes }) map, per
// rules/2-anexos/H-front.md, "Qué portales existen y dónde se montan".
export const remotes = {
  membershipPortal: {
    federationName: 'membership_portal',
    devUrl: import.meta.env.VITE_MEMBERSHIP_PORTAL_URL ?? 'http://localhost:3001/remoteEntry.js',
  },
  catalogPortal: {
    federationName: 'catalog_portal',
    devUrl: import.meta.env.VITE_CATALOG_PORTAL_URL ?? 'http://localhost:3002/remoteEntry.js',
  },
  circulationPortal: {
    federationName: 'circulation_portal',
    devUrl: import.meta.env.VITE_CIRCULATION_PORTAL_URL ?? 'http://localhost:3003/remoteEntry.js',
  },
} as const
