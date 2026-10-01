# Crypto Dashboard Redesign: Design Spec + Claude Code Prompts

> **How to use this file:** Put it in the root of the project (or `docs/`). Tell Claude Code: *"Read CRYPTO_DASHBOARD_REDESIGN.md fully. Follow it phase by phase. Do not skip ahead."* Run **one phase per session/task**, review in the browser, then move on.

---

## 0. Context

**Existing project:** A React + Vite + Tailwind single-page crypto dashboard. It fetches Binance `/api/v3/ticker/24hr`, shows coins as a grid of cards (green/red glow shadow, hover scale), has a detail view held in state (no URL), a search/filter/sort, and pins `VANRYUSDT` first. Helpers already exist: `baseAsset` derivation (`BTCUSDT` -> `BTC`), a manual symbol-to-name map, `useMemo` optimizations.

**Goal:** Turn it into a modern, multi-page, dark-first "fintech terminal" product that feels like Coinbase / TradingView / Linear quality, while **keeping all working logic** (data transformation, symbol mapping, VANRY pinning, search/sort).

**Product personality:** Trustworthy. Fast to scan. Calm. Data-first. Never flashy.

---

## 1. Rules for Claude Code (read before every task)

1. **Inspect the existing code first.** List what exists, what is reusable, what must change. Show a short plan before editing.
2. **Reuse the existing logic** (symbol mapping, `baseAsset`, VANRY pinning, filtering). Port it to TypeScript utilities, do not rewrite from scratch.
3. **Follow the design tokens in Section 4 exactly.** No random colors, fonts, or spacing values.
4. **Green/red is reserved for price movement only.** Never use them for decoration. Always pair with an arrow icon and +/- sign (accessibility).
5. **Use shadcn/ui components** where one exists. Do not hand-build Dialog, Tabs, Dropdown, Tooltip, Skeleton, etc.
6. **Every data view needs 4 states:** loading (skeleton), empty, error, success.
7. **Responsive mobile-first.** Test at 375px, 768px, 1280px, 1536px.
8. **No AI-slop:** no purple-pink gradients, no emoji icons (use `lucide-react`), no everything-centered layouts, no uniform card walls, no tiny low-contrast text, no lorem ipsum.
9. **Prices use tabular numerals** so digits don't jitter during live updates.
10. After each phase: run lint + type-check + build, fix errors, summarize what changed and what to manually test.

---

## 2. Target Stack

| Layer | Choice |
|---|---|
| Framework | Next.js (App Router) + TypeScript |
| Styling | Tailwind CSS + CSS variables for tokens |
| Components | shadcn/ui (Radix underneath) |
| Icons | lucide-react |
| Charts | `lightweight-charts` (TradingView) for candles; small SVG/Recharts sparklines |
| Data fetching | TanStack Query |
| Client state | Zustand (watchlist, UI prefs) with `persist` middleware (localStorage) |
| Animation | Framer Motion (sparingly) |
| Live data | Binance WebSocket streams |
| Fonts | Inter (UI) + Geist Mono or JetBrains Mono (numbers) via `next/font` |

**Migration approach:** Create the Next.js app, then port components/logic from the Vite project. Keep the old code in a `legacy/` folder until parity is confirmed.

**Binance caveat (verify when building):** Some Binance endpoints are geo-restricted from certain server regions (HTTP 451). If server-side fetches fail on the host, use Binance's public market-data-only base URL (`data-api.binance.vision`) or fetch from the client. Put the base URL in an env variable and wrap all calls in one `lib/binance.ts` module so it is easy to switch.

---

## 3. Design Vocabulary (for this project)

Use these words in your own follow-up prompts to steer Claude Code precisely.

- **Hierarchy:** price and 24h change are primary; name secondary; volume tertiary.
- **Density:** the Markets table is *dense but clean* (row height ~52px, not 80px).
- **Surface levels:** `background` (page) < `surface` (cards) < `elevated` (popovers, modals). Separation comes from tone + 1px borders, not heavy shadows.
- **Semantic color:** green = up, red = down, accent = brand/interactive, neutral = everything else.
- **Tabular numerals:** `font-variant-numeric: tabular-nums` so numbers align.
- **Price flash:** a 400ms background tint (green/red) when a live price ticks up/down.
- **Sparkline:** tiny trend line inside a table row.
- **Skeleton loader:** gray placeholder shapes matching final layout.
- **Empty state:** icon + message + action when no data/results.
- **Sticky header / sticky table head:** stay visible while scrolling.
- **Bento grid:** asymmetric card grid for the overview stats.
- **Focus ring / hover / active / disabled:** all interactive elements need all four.

---

## 4. Design Tokens

### 4.1 Colors (dark primary)

```css
:root {
  /* surfaces */
  --background: 222 24% 6%;      /* #0B0E14 page */
  --surface: 222 22% 9%;         /* #11151D cards */
  --elevated: 222 20% 12%;       /* #171C27 popovers, hover rows */
  --border: 222 16% 18%;         /* #262C3A */

  /* text */
  --foreground: 220 20% 96%;     /* #F1F4F9 primary text */
  --muted-foreground: 220 11% 62%; /* #8E96A8 secondary text (keep >= 4.5:1) */

  /* brand / interactive */
  --accent: 172 66% 50%;         /* #2DD4BF teal accent */
  --accent-foreground: 222 24% 6%;

  /* semantic market colors (movement ONLY) */
  --positive: 152 69% 45%;       /* #22C55E-ish */
  --negative: 0 84% 62%;         /* #F25757-ish */
  --positive-bg: 152 69% 45% / 0.12;
  --negative-bg: 0 84% 62% / 0.12;
}
```

- **60-30-10:** 60% background/surface neutrals, 30% text and borders, 10% accent + semantic colors.
- **VANRY featured accent:** use the brand teal accent for the featured VANRY card (subtle border glow, not a rainbow gradient).
- **Light mode:** optional, add after dark is finished using the same token names with light values and a theme toggle (`next-themes`).

### 4.2 Typography

| Role | Font | Size / Weight |
|---|---|---|
| Display / H1 | Inter | 40-48px, 700, tracking -0.02em |
| H2 | Inter | 28-32px, 600 |
| H3 | Inter | 20px, 600 |
| Body | Inter | 14-16px, 400, line-height 1.6 |
| Caption / labels | Inter | 12px, 500, uppercase tracking +0.04em (sparingly) |
| Prices / numbers | Geist Mono or JetBrains Mono | tabular-nums, 14-32px |

Type scale: 12 / 14 / 16 / 20 / 28 / 40 / 48.

### 4.3 Spacing, radius, motion

- **Spacing scale (px):** 4, 8, 12, 16, 24, 32, 48, 64, 96. Section vertical padding: 64-96px desktop, 40-48px mobile.
- **Radius:** 8px (inputs, buttons, rows), 12px (cards), 9999px (pills/badges).
- **Borders:** 1px `--border`. Shadows minimal; only on popovers/modals.
- **Max content width:** 1280px, centered, 16px side padding on mobile, 24-32px on desktop.
- **Motion:** 150-200ms ease-out for hover/focus; 300ms for page/section reveal; price flash 400ms. Respect `prefers-reduced-motion`. No scale-up hover on dense rows (use background change).

---

## 5. Information Architecture and Pages

```
/                    Overview
/markets             Full market table
/coin/[symbol]       Coin detail (e.g. /coin/BTCUSDT)
/watchlist           Saved coins
/compare             (optional) 2-3 coins side by side
/status              Data source + connection health (optional, small)
```

Shared layout: sticky top navbar (logo, nav links, global search with `Cmd/Ctrl+K` command palette, theme toggle, live connection indicator), footer.

### 5.1 Overview `/`

1. **Hero (compact):** one-line headline, one-line subtext, search/CTA "Explore markets". Right side: live mini-ticker of BTC/ETH/VANRY. Not full-screen tall.
2. **Market summary strip:** total pairs tracked, top gainer, top loser, highest volume, all live.
3. **Featured: VANRY card (large)** with price, 24h change, sparkline, high/low, "View details".
4. **Bento grid:** Top Gainers (5), Top Losers (5), Highest Volume (5). Each is a compact list with mini change pills.
5. **CTA band** to Markets table.

### 5.2 Markets `/markets`

- Toolbar: search input, quote-asset filter pills (USDT, BTC, ETH, BUSD...), sort dropdown, "Gainers / Losers / All" segmented control.
- **Table columns:** Star (watchlist) | # | Coin (icon + name + pair) | Price | 24h % | 24h High/Low | 24h Volume | Sparkline.
- Sortable headers (with arrow indicator), sticky header, row hover highlight, row click goes to `/coin/[symbol]`.
- VANRY pinned at top with an "Featured" badge.
- 400+ rows: use pagination (50/page) or virtualization (`@tanstack/react-virtual`).
- Mobile: collapse to Coin | Price | 24h % (hide the rest), or switch to compact cards.
- States: skeleton rows, "No coins match your search" empty state with Clear filters button, error with Retry.

### 5.3 Coin Detail `/coin/[symbol]`

- Breadcrumb (Markets / BTC).
- Header: icon, name, pair, **large live price (mono)**, 24h change pill, star button.
- **Chart (main):** candlestick via `lightweight-charts`, timeframe tabs `1H 4H 1D 1W 1M`, data from klines endpoint, volume histogram underneath.
- Stats grid (2x3 / 3x2): 24h High, 24h Low, 24h Volume (base), 24h Volume (quote), Open price, Trades count.
- Optional: simple price-change breakdown, mini order-book depth.
- Dynamic metadata (`generateMetadata`) for page title, e.g. "BTC/USDT Price | CryptoPulse".

### 5.4 Watchlist `/watchlist`

- Same table component as Markets, filtered to starred symbols, stored in Zustand + localStorage.
- Empty state: star icon, "Your watchlist is empty", button to Markets.

### 5.5 Compare `/compare` (optional, last)

- Choose up to 3 coins, shared line chart (normalized % change), stats table side by side.

---

## 6. Component Inventory

**Layout:** `Navbar`, `Footer`, `CommandPalette` (shadcn Command), `ThemeToggle`, `ConnectionBadge` (Live / Reconnecting / Offline).

**Market:** `PriceCell` (mono, tabular, flash on tick), `ChangeBadge` (arrow + sign + color), `CoinIdentity` (icon + name + pair, with fallback avatar if no icon), `Sparkline`, `MarketTable`, `MarketToolbar`, `StatCard`, `FeaturedCoinCard`, `TopMoversCard`.

**Detail:** `PriceChart` (lightweight-charts wrapper, client-only), `TimeframeTabs`, `StatsGrid`.

**Feedback:** `TableSkeleton`, `CardSkeleton`, `EmptyState`, `ErrorState` (with retry).

**Rule:** Components are small, single-responsibility, typed props, no data fetching inside presentational components.

---

## 7. Data Layer Spec

```
lib/
  binance.ts        // all base URLs, fetchers (ticker24hr, klines)
  symbols.ts        // baseAsset(), SYMBOL_NAME_MAP (ported from existing code)
  format.ts         // formatPrice, formatCompact (1.2M), formatPercent
hooks/
  useTickers.ts     // TanStack Query: initial /ticker/24hr snapshot
  useLiveTickers.ts // WebSocket !miniTicker@arr or !ticker@arr stream, merges into cache
  useKlines.ts      // klines by symbol + interval
store/
  watchlist.ts      // Zustand persist
```

- Initial load via REST snapshot, then **WebSocket** updates merged into the query cache (throttle UI updates to ~1/sec per row to avoid re-render storms).
- Auto-reconnect with exponential backoff; expose connection state to `ConnectionBadge`.
- Price precision: format per magnitude (e.g. BTC 2 decimals, small coins up to 6-8). Never show `1e-7`.
- Keep VANRY pinning logic in a selector (`pinSymbolFirst(list, 'VANRYUSDT')`), reused by Markets and Overview.

---

## 8. Phase-by-Phase Prompts for Claude Code

Copy one prompt per session. Review the result before moving on.

### Phase 1: Audit and plan

```
Read CRYPTO_DASHBOARD_REDESIGN.md fully. Then audit the existing Vite + React project:
1. List every component, hook, util, and what it does.
2. Identify logic to preserve (baseAsset, symbol name map, VANRYUSDT pinning, search/sort).
3. Identify what must be rebuilt for the new design.
4. Propose the Next.js folder structure and a migration plan.
Do NOT write code yet. Output the audit and plan only, and wait for my approval.
```

### Phase 2: Foundation (Next.js, tokens, layout)

```
Following CRYPTO_DASHBOARD_REDESIGN.md Sections 2, 4 and 5:
1. Scaffold a Next.js App Router + TypeScript + Tailwind project (keep legacy code in /legacy).
2. Install and init shadcn/ui, lucide-react, next-themes, TanStack Query, Zustand.
3. Implement the design tokens from Section 4 as CSS variables and map them in the Tailwind config (background, surface, elevated, border, accent, positive, negative).
4. Load Inter and Geist Mono via next/font. Add a `.num` utility with tabular-nums + mono font.
5. Build the shared layout: sticky Navbar (logo, links, search trigger, theme toggle, ConnectionBadge placeholder) and Footer.
6. Create empty route files for /, /markets, /coin/[symbol], /watchlist with a basic heading.
Dark mode is default. Run build and fix errors.
```

### Phase 3: Data layer

```
Implement the data layer from Section 7:
1. lib/binance.ts with env-based base URL, typed fetchers for ticker24hr and klines.
2. Port baseAsset() and the symbol name map from the legacy code into lib/symbols.ts (keep behavior identical).
3. lib/format.ts: formatPrice (adaptive precision), formatCompact, formatPercent.
4. hooks/useTickers.ts using TanStack Query.
5. hooks/useLiveTickers.ts using Binance WebSocket with auto-reconnect and exponential backoff, merging updates into the query cache with ~1s throttling per symbol. Expose connection status.
6. store/watchlist.ts with Zustand persist.
7. A pinSymbolFirst selector for VANRYUSDT.
Add unit tests for format.ts and symbols.ts. Do not build UI yet.
```

### Phase 4: Markets page (core)

```
Build /markets per Section 5.2 using shadcn Table, Input, Select, ToggleGroup/Tabs, Skeleton:
- MarketToolbar (search, quote-asset filter, gainers/losers/all, sort).
- MarketTable with sortable headers, sticky head, row hover (background change, NO scale), star toggle, VANRY pinned with "Featured" badge, row click -> /coin/[symbol].
- PriceCell with tabular mono numerals and a 400ms green/red flash on live tick.
- ChangeBadge with arrow icon + sign + color (never color alone).
- Pagination at 50 rows/page (or virtualization).
- Loading skeleton rows, empty state, error state with retry.
- Responsive: on mobile show only Coin, Price, 24h %.
Keep components small and typed.
```

### Phase 5: Coin detail page

```
Build /coin/[symbol] per Section 5.3:
- Server component wrapper with generateMetadata, client components for live parts.
- Header with large live price, ChangeBadge, star button, breadcrumb.
- PriceChart using lightweight-charts (client-only, dynamically imported), candlesticks + volume, TimeframeTabs (1H 4H 1D 1W 1M) using the klines endpoint via useKlines.
- StatsGrid for 24h high/low/volume/open/trades.
- Chart colors must come from design tokens; handle resize and cleanup.
- Skeleton, error, and invalid-symbol (404) states.
```

### Phase 6: Overview page

```
Build / per Section 5.1:
- Compact hero (not full-viewport) with headline, subtext, CTA, and a live mini-ticker.
- Market summary strip (pairs tracked, top gainer, top loser, top volume).
- Featured VANRY card (large, accent border, sparkline).
- Bento grid: Top Gainers, Top Losers, Highest Volume (5 each).
- CTA band to /markets.
Use asymmetric layout, strong type hierarchy, generous whitespace. No purple gradients.
```

### Phase 7: Watchlist, command palette, polish

```
1. /watchlist reusing MarketTable with starred symbols and an EmptyState.
2. Global command palette (Cmd/Ctrl+K) with shadcn Command to jump to any coin or page.
3. ConnectionBadge wired to the WebSocket status.
4. Add focus-visible rings, hover/active/disabled states everywhere.
5. Page transitions and section reveals with Framer Motion (subtle; respect prefers-reduced-motion).
6. Light theme tokens + working theme toggle.
7. Metadata, favicon, OG image, custom 404 and error pages.
```

### Phase 8: QA and quality pass

```
Do a full quality pass:
1. Run lint, type-check, build; fix everything.
2. Check contrast (WCAG AA 4.5:1) for muted text and badges.
3. Verify keyboard navigation and screen-reader labels on table, tabs, dialogs, icon buttons.
4. Test responsive at 375 / 768 / 1280 / 1536 and list any layout bugs fixed.
5. Lighthouse-style review: image sizing, font loading, bundle size of the chart (lazy load), unnecessary re-renders in the live table.
6. Remove dead code and the /legacy folder only after confirming feature parity with this checklist: search, sort, VANRY pinned, detail view, live prices.
Give me a final summary and a manual test checklist.
```

---

## 9. Iteration Prompts (surgical feedback)

Use these after any phase to refine without regenerating.

- "The hierarchy is weak. Make the price larger and bolder, the pair label smaller and muted."
- "The table feels cramped. Increase row height to 56px and cell padding to 16px, keep the font size."
- "Too much visual noise. Remove all borders except the outer one and use row hover tint for separation."
- "Muted text fails contrast. Lighten `--muted-foreground` until it meets 4.5:1."
- "The accent color is used in too many places. Restrict it to primary buttons, active nav item, focus ring, and the featured VANRY card."
- "Hover on cards feels jumpy. Replace scale with a border-color + background transition (150ms)."
- "Make the top-movers section a proper bento grid: one tall card left, two stacked cards right."
- "Add a skeleton that matches the exact layout of the final content for this section."
- "Explain why you chose this spacing and layout, and what would make it feel more premium."

---

## 10. Definition of Done

- [ ] Multi-page routes working with shareable URLs (`/coin/BTCUSDT`)
- [ ] Live prices via WebSocket with reconnect and visible status
- [ ] Markets table: search, filter, sort, pagination/virtualization, VANRY pinned
- [ ] Coin detail with candlestick chart and timeframe tabs
- [ ] Watchlist persisted across reloads
- [ ] Dark theme polished, light theme optional but working
- [ ] Loading, empty, and error states on every data view
- [ ] Green/red always paired with arrows/signs; contrast passes AA
- [ ] Responsive at all four breakpoints
- [ ] Lint, type-check, and build all pass

---

## 11. Personal Style Guide (reuse in all future prompts)

> **Style:** dark-first fintech terminal, calm and precise.
> **Palette:** near-black surfaces, teal accent, green/red only for price movement.
> **Fonts:** Inter + Geist Mono (tabular numbers).
> **Radius:** 8 / 12px. **Spacing:** 4-8-16-24-32-48-64-96.
> **Avoid:** purple-pink gradients, emoji icons, centered-everything layouts, uniform card walls, scale-on-hover in dense lists.
