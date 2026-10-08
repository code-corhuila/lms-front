import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import App from './app/App'
import { setToken } from './core/auth/session'
import './index.css'

// TEMPORARY, local-only dev shim: lms-access-api isn't running today, so
// there's no real login flow to get a token from. A ?devToken=... query
// param sets the session directly (more reliable than pasting a long JWT
// into the console) and is stripped from the URL immediately after. Never
// commit this — it goes away once lms-access-api is wired up for real.
const devToken = new URLSearchParams(window.location.search).get('devToken')
if (devToken) {
  setToken(devToken)
  window.history.replaceState({}, '', window.location.pathname)
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
