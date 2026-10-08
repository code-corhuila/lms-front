import { describe, expect, it } from 'vitest'

import viteConfigSource from '../../vite.config.ts?raw'
import { remotes } from './registry'

describe('remotes registry', () => {
  it('declares the three domain portals with their federation names', () => {
    expect(Object.values(remotes).map((r) => r.federationName)).toEqual([
      'membership_portal',
      'catalog_portal',
      'circulation_portal',
    ])
  })

  it('defaults each portal to its local dev remoteEntry.js', () => {
    expect(remotes.membershipPortal.devUrl).toBe('http://localhost:3001/remoteEntry.js')
    expect(remotes.catalogPortal.devUrl).toBe('http://localhost:3002/remoteEntry.js')
    expect(remotes.circulationPortal.devUrl).toBe('http://localhost:3003/remoteEntry.js')
  })
})

// vite.config.ts duplicates these URLs (it can't import registry.ts), so this
// guards the "keep these in sync" comment there.
describe('vite.config.ts federation remotes', () => {
  it('stays in sync with the registry', () => {
    for (const remote of Object.values(remotes)) {
      expect(viteConfigSource).toContain(`name: '${remote.federationName}'`)
      expect(viteConfigSource).toContain(`entry: '${remote.devUrl}'`)
    }
  })
})
