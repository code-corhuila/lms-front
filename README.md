# lms-front

> Front-end shell: packages the domain portals

Part of the **LMS Library** distributed system — team `lms-library`, Grupo 2.
Governance and documentation live in [`library-docs`](https://github.com/code-corhuila/library-docs).

Go/React SPA shell implementing HU-01 (login) and the app frame (nav, dashboard, 404) for the
LMS Administrator. Built with React 19 + TypeScript, Vite, Tailwind CSS v4, React Router, axios —
same stack as the domain portals.

## Structure

```
src/
├── App.tsx                    → route tree; /students, /books, /loans* are placeholders
│                                 pointing at their owning portal (see note below)
├── pages/{Login,Dashboard,NotFound}Page.tsx → cross-cutting pages, owned by no domain portal
├── components/
│   ├── layout/     → AppLayout (sidebar/topbar), ProtectedRoute
│   └── ui/         → Button, Card, EmptyState — the canonical copies (see note below)
├── lib/
│   ├── api.ts       → axios instance (attaches JWT, handles 401) — canonical copy
│   └── auth.ts       → token storage — canonical copy
└── types/             → Student, Book, Loan, ApiError, Paginated — all three domains' types
```

**Not yet real remote composition.** `/students`, `/books`, `/loans`, `/loans/overdue` render an
`EmptyState` naming which portal (`lms-membership-portal`, `lms-catalog-portal`,
`lms-circulation-portal`) owns that screen, instead of importing their page components — those
live in separate repos, and no ADR has yet decided the actual micro-frontend mechanism (Module
Federation / iframes / gateway routing) for a 3-person team with no CI
(`ADR-006-repo-per-context-decomposition.md`, "Minimal Infrastructure Footprint"). Swap these
placeholders for the real composition once that decision is made.

## Migration scope

**Comes from** `lms-library` → `frontend/`: `App.tsx`, `main.tsx`, `index.css`,
`components/layout/{AppLayout,ProtectedRoute}.tsx`, `components/ui/*`, `lib/api.ts`, `lib/auth.ts`,
`pages/{LoginPage,DashboardPage,NotFoundPage}.tsx`. The domain page components
(`pages/students/`, `pages/books/`, `pages/loans/`) are **not** here — they moved to their
respective portal repos, per each portal's own migration scope.

This is the **shell**: it will package the four domain portals as remotes once that mechanism is
decided (see "Not yet real remote composition" above).

> **Watch out when splitting the SPA.** `lib/api.ts` points everything at a single `/api/v1` and
> `lib/auth.ts` holds the session globally. That shared layer stays **here** and is exposed to the
> remotes. If each portal carries its own HTTP client and token handling, you have duplicated the
> hardest part of the front end — the classic mistake when moving a SPA to micro-frontends. (Every
> portal built so far does exactly that, temporarily, until it can consume this repo's copy — each
> portal's own README says so.)

## Development

```bash
npm install
npm run dev
```

## Tests

```bash
npm run lint
npm test            # Vitest + Testing Library (jsdom), single run
npm run test:watch  # watch mode
```

Tests live next to the code they cover (`*.test.ts(x)`). They run with `vitest.config.ts`, not
`vite.config.ts`, so the federation plugin never tries to reach a portal; the federated
`xxx_portal/routes` modules are mocked per test with `vi.mock`.

The full map lives in `library-docs`.

---

## Branching

Three permanent branches. **None of them accepts a direct commit** — you enter through a child
branch and leave through a Pull Request.

```
develop  <--PR--  feat/... fix/... chore/...
qa       <--PR--  qa/...
main     <--PR--  release/...  hotfix/...
```

Promotion happens **by re-application** (`git cherry-pick -x`), never by merging one permanent
branch into another: `merge develop -> qa` and `merge qa -> main` do not exist in this model.

`main` requires **1 approval from `ariel5253`**. On `develop` and `qa` the team sets its own review
rule.

Full policy: `00-governance/branching-policy.md` in `library-docs`.

## Correlations

* Navigation map / access rules → `library-docs/12-ux-ui/navigation-map.md`
* Design tokens (colors/typography — finalized here, in code) → `src/index.css`
* API contract → `library-docs/07-api/contracts/openapi/library-api.yaml`
* Domain portals → [`lms-membership-portal`](https://github.com/code-corhuila/lms-membership-portal),
  [`lms-catalog-portal`](https://github.com/code-corhuila/lms-catalog-portal),
  [`lms-circulation-portal`](https://github.com/code-corhuila/lms-circulation-portal)
