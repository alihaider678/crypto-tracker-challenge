# CryptoPulse

Live crypto market dashboard for Binance spot pairs: real-time prices, 24h movers, candlestick charts and a personal watchlist. Dark-first, with a light theme.

## Features

- **Overview** (`/`): live mini-ticker (BTC, ETH, BNB, VANRY), market summary, featured VANRY card, top gainers, losers and volume (USDT pairs; halted and stablecoin/stablecoin pairs excluded).
- **Markets** (`/markets`): every listed pair with search (ticker, name or pair), quote-asset filters, gainers/losers, 8 sort modes, sortable headers, 50 per page, live prices with a 400ms flash, and lazy sparklines. All view state lives in the URL.
- **Coin detail** (`/coin/[symbol]`): live price, candlestick + volume chart (1H / 4H / 1D / 1W / 1M, kept in `?tf=`), hover legend (OHLC, change, volume), and 24h stats. Invalid symbols return a real 404.
- **Watchlist** (`/watchlist`): starred pairs saved in the browser, same live table, halted and delisted pairs shown honestly, and "Clear all" with confirmation.
- **Command palette**: press Ctrl/⌘ + K anywhere to jump to a coin or page.
- **VANRY/USDT** is always pinned first when it matches the current filter. While Binance has its trading halted, it's labelled "Trading halted" with the last-trade date, and nothing about it is shown as live.

## Stack

| | |
|---|---|
| Framework | Next.js 16 (App Router) + React 19 + TypeScript |
| Styling | Tailwind CSS v4, design tokens as CSS variables (`app/globals.css`) |
| Components | shadcn/ui (Radix), lucide-react icons |
| Data | TanStack Query (REST), Binance WebSocket `!miniTicker@arr` (live) |
| State | Zustand + `persist` (watchlist, in `localStorage`) |
| Charts | lightweight-charts 5 (TradingView), loaded only on coin pages |
| Search | cmdk, loaded on first palette open |
| Tests | Vitest |

## Getting started

Requires Node.js 22.12+ (Vitest's minimum; developed on Node 24). The app itself runs on Node 20.9+.

```bash
npm install
npm run dev        # http://localhost:3000
```

Optionally copy `.env.example` to `.env.local` (see below). Every variable has a working default.

## Scripts

| Script | What it does |
|---|---|
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm start` | Serve the production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | Generate route types, then `tsc --noEmit` |
| `npm test` | Vitest (unit tests, including legacy parity and WCAG contrast checks) |
| `npm run test:watch` | Vitest in watch mode |

## Environment variables

All are public (`NEXT_PUBLIC_*`, inlined at build time), so changing one needs a rebuild.

| Variable | Default | Purpose |
|---|---|---|
| `NEXT_PUBLIC_BINANCE_REST_URL` | `https://data-api.binance.vision/api/v3` | REST base URL (tickers, klines, symbol list) |
| `NEXT_PUBLIC_BINANCE_WS_URL` | `wss://data-stream.binance.vision` | WebSocket base URL (live mini tickers) |
| `NEXT_PUBLIC_SITE_URL` | `http://localhost:3000` | Absolute base for Open Graph image URLs. Set it to the deployed URL. |

## Data source

All market data comes from Binance's public, market-data-only endpoints. There's no API key and no backend of our own.

- **REST:** `ticker/24hr` (all-market snapshot, refreshed every 5 minutes), `ticker/24hr?symbol=` (one pair, detail page), `klines` (charts and sparklines), `ticker/price` (list of every symbol, to tell delisted pairs apart).
- **Live:** one shared WebSocket on `!miniTicker@arr`. Updates are batched into the query cache once per second, and the 24h change is computed from open and close. It reconnects with exponential backoff (1s → 30s) and shows its status in the navbar.
- **Listing rules:** pairs with no price, no trades, or no trade in 24 hours are hidden. VANRY is exempt and shown as halted.
- All Binance calls go through `lib/binance.ts`, and market rules live in `lib/market.ts`.

## Known limits

- **VANRY/USDT is halted on Binance** (status `BREAK`, last trade September 2026). Its figures are a frozen snapshot, so it gets no live updates and no sparkline. The date Binance reports for the last trade can vary slightly between requests.
- **Geo-blocking:** `api.binance.com` returns HTTP 451 in some regions, including some cloud hosting regions. The defaults use `data-api.binance.vision` and `data-stream.binance.vision`, which are meant for public market data. If those are blocked too, point the env vars at a reachable host.
- **No CORS on Binance error responses:** Binance's 4xx responses carry no CORS header, so in the browser an invalid symbol looks like a network error. The app checks symbol existence against the cached symbol list instead. The server-rendered coin page sees the real error code, so invalid symbols still return a 404.
- **TradingView attribution:** lightweight-charts is Apache-2.0 and requires attribution. The TradingView logo stays on the chart (`attributionLogo: true`).
- **Coin icons** come from the `spothq/cryptocurrency-icons` set on GitHub. It's old, so many newer coins fall back to a letter avatar.
- **Watchlist** is per browser (`localStorage`), with no account sync.

## Design decisions

- **Dark-first fintech look, calm and data-first.** Tokens follow `CRYPTO_DASHBOARD_REDESIGN.md`. Light mode overrides the same token names under `html.light`, and `__tests__/theme-contrast.test.ts` checks both themes against WCAG AA.
- **Green and red mean price movement only.** They're always paired with an arrow and a +/- sign. Teal is the brand accent: buttons, focus rings, the featured card and the "Live" badge.
- **Numbers:** prices and live values use Geist Mono with tabular figures, so digits don't jitter. Counts and dates use Inter with tabular figures.
- **Honest data over pretty data:** halted pairs are labelled and muted, stale candles get a "No recent trades" note, stablecoin charts get a minimum 0.5% price range so a 0.0006 move doesn't look like a crash, and stablecoin/stablecoin pairs are left out of movers.
- **Performance:**
  - One WebSocket and one cache write per second for the whole app. Rows are memoized, so a tick re-renders only the rows that changed.
  - Sorting by 24h % or price reorders at most every 5 seconds.
  - The chart and the command palette are lazy-loaded.
- **URL as state:** search, filters, sort, page and chart timeframe are all in the query string, so views are shareable and the back button works.
- **Accessibility:**
  - A skip link, visible focus rings, and focus trapped and returned in every dialog.
  - Sort state is exposed with `aria-sort`, and the chart has a text summary.
  - Exactly one polite live region (the connection badge); price ticks are never announced.
  - Motion respects `prefers-reduced-motion`.

## Project layout

```
app/          routes (/, /markets, /coin/[symbol], /watchlist), layout, 404, error, icon, OG image
components/   layout/ (navbar, palette), market/ (table, toolbar, cells), coin/ (chart, stats),
              overview/, watchlist/, feedback/ (empty/error/skeleton), ui/ (shadcn)
hooks/        useTickers, useLiveTickers, useKlines, useMarketParams, useThrottledOrder, useInView
lib/          binance (API), market (rules), symbols, format, chart, search, color, live-feed, ...
store/        watchlist (Zustand)
__tests__/    Vitest suites; legacy/app-logic.js holds the original app's logic for parity tests
```

This project began as a Vite single-page app. Its logic was ported and checked for parity (search, all 6 sort modes, VANRY pinning) before the Vite code was removed. See `git show e1d7332:src/App.jsx`.
