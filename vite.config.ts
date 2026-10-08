import { federation } from '@module-federation/vite'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
//
// shareStrategy: 'loaded-first' (not the Module Federation default,
// 'version-first') — rules/2-anexos/H-front.md, "Un portal caído no tumba la
// aplicación": with 'version-first' the shell downloads every remote at
// startup just to compare versions, so one dead portal blanks the whole app.
// 'loaded-first' only fetches a remote when its route actually opens.
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    federation({
      name: 'shell',
      // What every portal imports as 'shell/apiClient' / 'shell/session'
      // (each portal's own src/shell.d.ts documents this: "set on the
      // container's side, not this repo's, since a remote never declares
      // its own container").
      exposes: {
        './apiClient': './src/core/http/apiClient.ts',
        './session': './src/core/auth/session.ts',
      },
      // Keep these URLs in sync with src/remotes/registry.ts — this file
      // can't import registry.ts (it needs import.meta.env, browser-only),
      // so each dev URL is duplicated here too.
      // No /assets/ prefix — that's a build-output path. In dev,
      // @module-federation/vite serves remoteEntry.js from each portal's
      // dev server root instead. type: 'module' is required — the string
      // shorthand defaults to type: 'var' (a global-variable container),
      // but @module-federation/vite's remoteEntry.js is an ES module; a
      // 'var'-typed load can't read exports off it (RUNTIME-001).
      remotes: {
        membership_portal: {
          type: 'module',
          name: 'membership_portal',
          entry: 'http://localhost:3001/remoteEntry.js',
        },
        catalog_portal: {
          type: 'module',
          name: 'catalog_portal',
          entry: 'http://localhost:3002/remoteEntry.js',
        },
        circulation_portal: {
          type: 'module',
          name: 'circulation_portal',
          entry: 'http://localhost:3003/remoteEntry.js',
        },
      },
      shared: ['react', 'react-dom', 'react-router-dom'],
      shareStrategy: 'loaded-first',
    }),
  ],
  server: {
    port: 3000,
    // TEMPORARY, local-only dev shim: lms-api-gateway doesn't exist yet (its
    // repo is still just a README), so apiClient's '/api/v1' baseURL has
    // nothing to resolve against without this. Routes by path prefix to each
    // domain service directly. Never commit this — it goes away the moment a
    // real gateway exists.
    proxy: {
      '/api/v1/students': 'http://localhost:8081',
      '/api/v1/books': 'http://localhost:8082',
      '/api/v1/loans': 'http://localhost:8083',
    },
  },
  build: {
    target: 'esnext',
  },
})
