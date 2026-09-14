# lms-front

> Front-end shell: packages the domain portals

Part of the **LMS Library** distributed system — team `lms-library`, Grupo 2.
Governance and documentation live in [`library-docs`](https://github.com/code-corhuila/library-docs).

## Migration scope

**Comes from** `lms-library` → `frontend/`: `App.tsx`, `main.tsx`, `index.css`,
`components/layout/{AppLayout,ProtectedRoute}.tsx`, `components/ui/*`, `lib/api.ts`, `lib/auth.ts`.

This is the **shell**: it packages the four domain portals as remotes.

> **Watch out when splitting the SPA.** `lib/api.ts` points everything at a single `/api/v1` and
> `lib/auth.ts` holds the session globally. That shared layer stays **here** and is exposed to the
> remotes. If each portal carries its own HTTP client and token handling, you have duplicated the
> hardest part of the front end — the classic mistake when moving a SPA to micro-frontends.

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
