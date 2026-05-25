# pokescan — UI Appendix

**Scope:** product-specific UI rules for PokeScan (Pokemon card scanner) that ride on top of `~/knowledge/_meta/HEARTH-UI-SPEC.md`.
**Read order:** Hearth spec first, then this file.
**Status:** This appendix is mostly forward-looking — the current code is MVP-tier and doesn't yet match the Hearth spec. The bulk of this document is the migration plan.

---

## 1. Brand & palette (planned)

No brand palette codified yet. When the Hearth-compliance migration lands, propose:

- **Brand:** electric blue (Pokemon energy) — `#3B82F6` / Tailwind `blue-500`
- **Surface:** clean off-white / dark slate for dark mode
- **Success/warning/danger:** sage / amber / rose per Hearth §2.1
- **Card-rarity accents:** gold (legendary/secret-rare), silver (rare), bronze (uncommon) — applied as inline badges, not surface colors

Document final picks once the Tailwind migration is in flight.

---

## 2. Hearth migration plan

PokeScan currently uses vanilla CSS with no design tokens. The migration to Hearth compliance is sequenced over multiple sprints (don't try in one):

### Sprint 1 — Tailwind + tokens

1. Add Tailwind + PostCSS (`npm i -D tailwindcss postcss autoprefixer`)
2. Create `tailwind.config.js` with Hearth semantic palette + brand colors
3. Add `darkMode: 'class'`
4. Replace `App.css` styles inline with Tailwind classes; remove `App.css`

### Sprint 2 — Component split

`src/App.jsx` is 437 lines and does scanner + inventory + log + settings. Split into:

- `App.jsx` (router shell)
- `views/Scanner.jsx`
- `views/Inventory.jsx`
- `views/Log.jsx`
- `views/Settings.jsx`
- `components/CardItem.jsx` (single-card display, reusable in Scanner and Inventory)
- `components/CameraView.jsx` (the scanner viewfinder)

### Sprint 3 — Shared primitives

Adopt the Hearth shared library:

- `Table` (or `Grid` for the inventory view) with sortable columns, mobile card layout
- `PageHeader` for each view
- `StatCard` for collection stats (count, value, rarity breakdown)
- `Skeleton`, `EmptyState`, `ErrorState`
- `useTheme()` hook + `ThemeToggle` (Hearth §2.3 Strategy 1 — explicit `dark:` is the easiest pickup for a small product)

### Sprint 4 — Mobile + a11y

- 44×44 touch targets on every interactive element (especially the scanner controls)
- Visible `:focus-visible` outline globally
- `aria-label` on icon-only buttons (capture, flip camera, etc.)
- Card layout at <768px (already mobile-only really, but verify)
- Bottom-nav pattern (Hearth §1.3a) for Scanner / Inventory / Log / Settings — that's 4 destinations, within the 5-max for bottom nav

---

## 3. Domain components (planned)

Pokemon-specific, not for Hearth-wide reuse:

| Component | Purpose |
|---|---|
| `CameraView` | Device camera viewfinder with capture button |
| `CardItem` | Single-card display (image, name, set, rarity, value) |
| `RarityBadge` | Rarity tier indicator (common, uncommon, rare, holo, ultra-rare, secret-rare) |
| `SetSelector` | Set/expansion picker (e.g., Base Set, Jungle, Fossil) |
| `ScanResult` | Identification confidence + alternative matches |
| `ValueTrend` | Recharts sparkline of card value over time (lazy-loaded per Hearth §15) |

---

## 4. Vocabulary

Pokemon TCG terms (use exact capitalization):

- **Set** — e.g., "Base Set", "Jungle", "Sword & Shield"
- **Rarity** — Common, Uncommon, Rare, Rare Holo, Ultra Rare, Secret Rare
- **Holo / Reverse Holo** — different finishes
- **Promo** — non-set promotional card
- **PSA / BGS / CGC** — grading services + grade numbers (PSA 10, BGS 9.5, etc.)
- **Condition** — Mint, Near Mint, Lightly Played, Moderately Played, Heavily Played, Damaged

---

## 5. Why we wait on the refactor

PokeScan is a personal project; the MVP works. Migrating to Hearth compliance is valuable because:

1. **Touchpoints with other Hearth products** — `useTheme()`, `Table`, `Skeleton` — get exercised and improved.
2. **Future surfaces become trivial** — sharing the collection, multi-user inventory, public valuation tool.
3. **The Hearth spec gets validated** against a non-business consumer product — finds gaps the dashboard-style products don't.

But it's not blocking other Hearth work. Sequence it when there's a clear next feature that benefits from the polished foundation.

---

## 6. Post-deploy verification

Not yet deployed. When it ships, follow Hearth's Playwright MCP verification per root CLAUDE.md.
