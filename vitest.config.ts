import react from '@vitejs/plugin-react'
import type { Plugin } from 'vite'
import { configDefaults, defineConfig } from 'vitest/config'

// Kept apart from vite.config.ts on purpose: the federation plugin there
// tries to reach each portal's remoteEntry.js, which a unit test must never
// depend on. Tests mock the 'xxx_portal/routes' modules instead; this
// resolver only makes those specifiers resolvable so vi.mock can replace them.
const federatedRemotesStub: Plugin = {
  name: 'federated-remotes-stub',
  resolveId(id) {
    return /^\w+_portal\//.test(id) ? `\0${id}` : undefined
  },
  load(id) {
    return /^\0\w+_portal\//.test(id) ? 'export {}' : undefined
  },
}

export default defineConfig({
  plugins: [react(), federatedRemotesStub],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    // Load/render-stress tests run on their own: vitest.stress.config.ts.
    exclude: [...configDefaults.exclude, 'src/**/*.stress.test.{ts,tsx}'],
    restoreMocks: true,
  },
})
