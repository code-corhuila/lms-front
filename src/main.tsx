// A dynamic import, not a direct one — Module Federation's shared scope
// (react/react-dom/react-router-dom, vite.config.ts) must finish
// initializing before anything renders, and that only happens across an
// async boundary. Importing ./bootstrap directly here would fail with
// "shared module is not available for eager consumption".
import('./bootstrap')
