# pokescan — Project context

Working directory for PokeScan, a Pokemon card scanner / inventory tracker. Read this file at the start of any session that touches the project.

## What it is

React + Vite SPA for scanning, identifying, and tracking Pokemon cards. Uses device camera for image capture and an identification pipeline (current state: MVP-tier; production-quality refactor pending).

## Stack

- **Frontend:** React 18 + JavaScript (no TypeScript yet) + vanilla CSS (no Tailwind) + Vite
- **Build:** `npm run dev` / `npm run build` / `npm run preview`
- **No backend yet** — current scope is client-side only
- **Currently monolithic:** `src/App.jsx` is a 437-line single-component app

## Design System

**Read `~/knowledge/_meta/HEARTH-UI-SPEC.md` before writing any frontend code.**

- Product-specific rules: `UI-APPENDIX.md` in this repo.
- Shared components: `~/hearth-ui/components/` (import from `@hearth/ui`).
- Tokens: `~/hearth-ui/tokens/hearth-tokens.css` (import in app root).
- Compliance check: `~/hearth-ui/scripts/hearth-lint.sh ~/projects/pokescan` before committing UI changes.
- Living reference: https://design.trev.works

PokeScan is currently the lowest-compliance Hearth product. Major gaps:
- No Tailwind (vanilla CSS only); no design tokens; no dark mode
- Monolithic component; no shared library
- No loading / empty / error states beyond minimum
- No 44px touch targets verified
- No accessibility pass (focus indicators, aria-labels)

The appendix sequences the refactor: Tailwind → design tokens → component split → dark mode → mobile polish.

If you're touching pokescan, **fix one Hearth-compliance item per change** rather than just adding features on top of the MVP — the bill compounds otherwise.

## Local dev

```bash
cd ~/projects/pokescan
npm install
npm run dev          # Vite (default port 5173)
```

## Deploy

Not currently deployed publicly. When it ships, follow the Cloudflare Pages pattern in ADR-029.

## Post-deploy verification

Per root CLAUDE.md when the product goes live: **use playwright mcp**. Until then, manual local testing in headless Chromium at desktop + mobile viewports.
