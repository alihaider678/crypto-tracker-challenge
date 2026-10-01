@AGENTS.md

## Conventions

Full design spec: `CRYPTO_DASHBOARD_REDESIGN.md`. The old Vite app lives in `legacy/` until parity is confirmed; don't edit it.

- **Green/red are for price movement only.** Never use them for decoration, status or brand. Always pair them with an arrow icon and a +/- sign.
- **Color tokens** (`app/globals.css`): `bg-background` (page) < `bg-surface` (cards) < `bg-elevated` (popovers, hover rows); `border-border`; `text-foreground` / `text-muted-foreground`; `text-positive` / `text-negative` and `bg-positive-bg` / `bg-negative-bg` for movement. The spec's teal "accent" is `primary` (`bg-primary`, `ring`). shadcn's `accent` is the neutral `elevated` color, not teal.
- **Text sizes are renamed** to the spec's scale. Only these exist: `text-xs` 12px, `text-sm` 14px, `text-base` 16px, `text-lg` **20px**, `text-xl` **28px**, `text-2xl` **40px**, `text-3xl` **48px**. Don't use arbitrary `text-[…]` sizes.
- **Radius:** `rounded-lg` 8px (controls, rows), `rounded-xl` 12px (cards), `rounded-full` (pills).
- **Numbers:** use the `num` class (mono, tabular) for prices and figures, and format them with `lib/format.ts`.
- **Layout:** wrap page content in `container-page`.
- **Data:** all Binance calls go through `lib/binance.ts`. Market rules (listing, search, sort, VANRY pinning) live in `lib/market.ts`; use `selectMarketView` instead of re-implementing them. No data fetching in presentational components.
- **Themes:** dark is the default (`:root`); light overrides the base tokens under `html.light`. Add a token to both. `__tests__/theme-contrast.test.ts` checks WCAG AA for both themes from `globals.css`; keep it passing. Canvas code (the chart) must read tokens at runtime and re-read them on theme change.
- **Interaction states:** custom links/buttons need hover, `focus-visible` ring (`ring-3 ring-ring/50`), and a pressed state (`active:bg-border/60` or `active:bg-elevated` on rows). Disabled comes from the shadcn primitives.
- **Motion:** only `reveal` from `lib/motion.ts` (motion-safe fade/slide when content first renders). No page transitions or exit animations.
- **Binance in the browser:** 4xx responses have no CORS header, so client-side errors can't tell "invalid symbol" from "offline". Check symbol existence with `allSymbolsQueryOptions` instead of requesting unknown symbols.
- Run `npm run lint`, `npm run typecheck`, `npm test` and `npm run build` before calling a phase done.
