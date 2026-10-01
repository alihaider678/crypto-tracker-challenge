import { coinName, isStablePair, pairLabel, parseSymbol } from "./symbols";
import type { BinanceMiniTicker, BinanceTicker24hr, Ticker } from "./types";

/** Always shown first when it matches the current filter. */
export const PINNED_SYMBOL = "VANRYUSDT";

/** A pair whose last trade is older than this is treated as halted. */
export const STALE_AFTER_MS = 24 * 60 * 60 * 1000;

// --- Normalizing --------------------------------------------------------

/** Parses a REST ticker. Returns null when the symbol can't be split. */
export function normalizeTicker(
  raw: BinanceTicker24hr,
  now: number = Date.now(),
): Ticker | null {
  const parsed = parseSymbol(raw.symbol);
  if (!parsed) return null;

  return {
    symbol: raw.symbol,
    baseAsset: parsed.baseAsset,
    quoteAsset: parsed.quoteAsset,
    name: coinName(parsed.baseAsset),
    lastPrice: Number(raw.lastPrice),
    openPrice: Number(raw.openPrice),
    highPrice: Number(raw.highPrice),
    lowPrice: Number(raw.lowPrice),
    priceChange: Number(raw.priceChange),
    priceChangePercent: Number(raw.priceChangePercent),
    volume: Number(raw.volume),
    quoteVolume: Number(raw.quoteVolume),
    tradeCount: raw.count,
    updatedAt: raw.closeTime,
    halted: now - raw.closeTime > STALE_AFTER_MS,
  };
}

export function normalizeTickers(
  raws: BinanceTicker24hr[],
  now: number = Date.now(),
): Ticker[] {
  const out: Ticker[] = [];
  for (const raw of raws) {
    const t = normalizeTicker(raw, now);
    if (t) out.push(t);
  }
  return out;
}

// --- Listing ------------------------------------------------------------

function hasMarket(t: Ticker): boolean {
  return t.lastPrice > 0 && t.tradeCount > 0;
}

/**
 * Not trading right now: halted (no trade for 24h), or no price / no trades
 * at all. The detail page shows these as halted instead of live.
 */
export function isTradingHalted(t: Ticker): boolean {
  return t.halted || !hasMarket(t);
}

/** Shown in listings: has a price, has trades, and traded in the last 24h. */
export function isListed(t: Ticker): boolean {
  return hasMarket(t) && !t.halted;
}

/**
 * Drops dead pairs. Symbols in `keep` survive being halted (but not having
 * no price at all), so VANRY stays visible while its trading is suspended.
 */
export function listedTickers(
  list: Ticker[],
  keep: readonly string[] = [PINNED_SYMBOL],
): Ticker[] {
  return list.filter(
    (t) => isListed(t) || (keep.includes(t.symbol) && hasMarket(t)),
  );
}

// --- Filtering ----------------------------------------------------------

export type Direction = "all" | "gainers" | "losers";

export type MarketFilter = {
  query?: string;
  /** Quote asset, e.g. "USDT". Null or undefined means every quote. */
  quote?: string | null;
  direction?: Direction;
};

/**
 * Case-insensitive search over the base asset (legacy behavior), the full
 * name, and the pair as "BTCUSDT" or "BTC/USDT".
 */
export function filterTickers(
  list: Ticker[],
  { query = "", quote, direction = "all" }: MarketFilter = {},
): Ticker[] {
  const term = query.trim().toLowerCase();

  return list.filter((t) => {
    if (quote && t.quoteAsset !== quote) return false;
    if (direction === "gainers" && !(t.priceChangePercent > 0)) return false;
    if (direction === "losers" && !(t.priceChangePercent < 0)) return false;
    if (!term) return true;
    return (
      t.baseAsset.toLowerCase().includes(term) ||
      t.name.toLowerCase().includes(term) ||
      t.symbol.toLowerCase().includes(term) ||
      pairLabel(t).toLowerCase().includes(term)
    );
  });
}

// --- Sorting ------------------------------------------------------------

/** The six sort modes of the legacy app, with the same keys. */
export const LEGACY_SORT_KEYS = [
  "name_asc",
  "name_desc",
  "price_desc",
  "price_asc",
  "change_desc",
  "change_asc",
] as const;

export type SortKey =
  | (typeof LEGACY_SORT_KEYS)[number]
  | "volume_desc"
  | "volume_asc";

type Comparator = (a: Ticker, b: Ticker) => number;

// Same comparisons as legacy; "name" sorts by ticker, as it always did.
const COMPARATORS: Record<SortKey, Comparator> = {
  name_asc: (a, b) => a.baseAsset.localeCompare(b.baseAsset),
  name_desc: (a, b) => b.baseAsset.localeCompare(a.baseAsset),
  price_desc: (a, b) => b.lastPrice - a.lastPrice,
  price_asc: (a, b) => a.lastPrice - b.lastPrice,
  change_desc: (a, b) => b.priceChangePercent - a.priceChangePercent,
  change_asc: (a, b) => a.priceChangePercent - b.priceChangePercent,
  // Quote volume, so it means "value traded" rather than "coins traded".
  volume_desc: (a, b) => b.quoteVolume - a.quoteVolume,
  volume_asc: (a, b) => a.quoteVolume - b.quoteVolume,
};

/** Returns a sorted copy. The sort is stable. */
export function sortTickers(list: Ticker[], key: SortKey): Ticker[] {
  return [...list].sort(COMPARATORS[key] ?? COMPARATORS.name_asc);
}

// --- Pinning ------------------------------------------------------------

/**
 * Moves `symbol` to the front, keeping everything else in order. Run it
 * after filtering and sorting: a pair the filter removed stays removed.
 */
export function pinSymbolFirst<T extends { symbol: string }>(
  list: T[],
  symbol: string = PINNED_SYMBOL,
): T[] {
  const index = list.findIndex((t) => t.symbol === symbol);
  if (index <= 0) return list;
  return [list[index], ...list.slice(0, index), ...list.slice(index + 1)];
}

export type MarketView = MarketFilter & {
  sort: SortKey;
  pinned?: string;
};

/** Filter, then sort, then pin: what Markets and Watchlist render. */
export function selectMarketView(
  list: Ticker[],
  { sort, pinned = PINNED_SYMBOL, ...filter }: MarketView,
): Ticker[] {
  return pinSymbolFirst(sortTickers(filterTickers(list, filter), sort), pinned);
}

// --- Paging and quotes --------------------------------------------------

export type Page<T> = {
  items: T[];
  /** 1-based, clamped to the available pages. */
  page: number;
  pageCount: number;
  total: number;
  /** 1-based index of the first item on this page; 0 when empty. */
  from: number;
  /** 1-based index of the last item on this page; 0 when empty. */
  to: number;
};

export const PAGE_SIZE = 50;

export function paginate<T>(
  list: T[],
  page: number,
  pageSize: number = PAGE_SIZE,
): Page<T> {
  const total = list.length;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const current = Math.min(
    Math.max(1, Number.isFinite(page) ? Math.floor(page) : 1),
    pageCount,
  );
  const start = (current - 1) * pageSize;
  const items = list.slice(start, start + pageSize);
  return {
    items,
    page: current,
    pageCount,
    total,
    from: items.length ? start + 1 : 0,
    to: start + items.length,
  };
}

/** Quote filter pills shown up front, in this order, if they have enough pairs. */
export const PRIMARY_QUOTES = [
  "USDT",
  "USDC",
  "FDUSD",
  "BTC",
  "ETH",
  "BNB",
  "TRY",
  "EUR",
] as const;

export type QuoteOption = { quote: string; count: number };

/**
 * Splits the quotes present in `list` into the pills shown up front and the
 * rest (for a "More" menu, busiest first). A primary quote needs at least
 * `minPairs` listed pairs to get a pill.
 */
export function groupQuotes(
  list: Ticker[],
  { minPairs = 5 }: { minPairs?: number } = {},
): { primary: QuoteOption[]; more: QuoteOption[] } {
  const counts = new Map<string, number>();
  for (const t of list) {
    counts.set(t.quoteAsset, (counts.get(t.quoteAsset) ?? 0) + 1);
  }

  const primary: QuoteOption[] = [];
  for (const quote of PRIMARY_QUOTES) {
    const count = counts.get(quote) ?? 0;
    if (count >= minPairs) primary.push({ quote, count });
  }
  const shown = new Set(primary.map((o) => o.quote));
  const more = [...counts]
    .filter(([quote]) => !shown.has(quote))
    .map(([quote, count]) => ({ quote, count }))
    .sort((a, b) => b.count - a.count || a.quote.localeCompare(b.quote));

  return { primary, more };
}

// --- Overview -----------------------------------------------------------

export type TopMovers = {
  gainers: Ticker[];
  losers: Ticker[];
  volume: Ticker[];
};

/**
 * Top gainers, losers and volume within one quote asset. Volumes in
 * different quotes (USDT vs TRY) aren't comparable, so a quote is required.
 * Excluded: halted pairs (their 24h change is frozen, not today's) and
 * stablecoin/stablecoin pairs (USDC/USDT would always top volume).
 */
export function topMovers(
  list: Ticker[],
  { quote = "USDT", limit = 5 }: { quote?: string; limit?: number } = {},
): TopMovers {
  const pool = list.filter(
    (t) => t.quoteAsset === quote && isListed(t) && !isStablePair(t),
  );
  return {
    gainers: sortTickers(
      pool.filter((t) => t.priceChangePercent > 0),
      "change_desc",
    ).slice(0, limit),
    losers: sortTickers(
      pool.filter((t) => t.priceChangePercent < 0),
      "change_asc",
    ).slice(0, limit),
    volume: sortTickers(pool, "volume_desc").slice(0, limit),
  };
}

export type OverviewData = {
  /** Listed pairs, VANRY included. */
  pairsTracked: number;
  movers: TopMovers;
  topGainer: Ticker | null;
  topLoser: Ticker | null;
  topVolume: Ticker | null;
};

/**
 * Everything the Overview page shows about the market, from the listed
 * pairs. Movers are USDT-quoted and exclude halted and stable/stable pairs
 * (see topMovers).
 */
export function overviewData(listed: Ticker[], limit = 5): OverviewData {
  const movers = topMovers(listed, { quote: "USDT", limit });
  return {
    pairsTracked: listed.length,
    movers,
    topGainer: movers.gainers[0] ?? null,
    topLoser: movers.losers[0] ?? null,
    topVolume: movers.volume[0] ?? null,
  };
}

/** Tickers for `symbols`, in that order; null where a pair isn't listed. */
export function pickBySymbol(
  list: Ticker[],
  symbols: readonly string[],
): (Ticker | null)[] {
  const bySymbol = new Map(list.map((t) => [t.symbol, t]));
  return symbols.map((s) => bySymbol.get(s) ?? null);
}

// --- Live updates -------------------------------------------------------

/**
 * Applies a !miniTicker@arr update. The stream has no change field, so the
 * 24h change is computed from open and close, which is the same formula
 * Binance uses for the REST priceChangePercent.
 */
export function applyMiniTicker(t: Ticker, m: BinanceMiniTicker): Ticker {
  const lastPrice = Number(m.c);
  const openPrice = Number(m.o);
  const priceChange = lastPrice - openPrice;

  return {
    ...t,
    lastPrice,
    openPrice,
    highPrice: Number(m.h),
    lowPrice: Number(m.l),
    volume: Number(m.v),
    quoteVolume: Number(m.q),
    priceChange,
    priceChangePercent: openPrice > 0 ? (priceChange / openPrice) * 100 : 0,
    updatedAt: m.E,
    halted: false,
  };
}

/**
 * Merges a batch of updates. Untouched tickers keep their object identity
 * so memoized rows skip re-rendering. Returns `list` itself when nothing
 * matched.
 */
export function mergeMiniTickers(
  list: Ticker[],
  updates: ReadonlyMap<string, BinanceMiniTicker>,
): Ticker[] {
  if (updates.size === 0) return list;
  let changed = false;
  const next = list.map((t) => {
    const m = updates.get(t.symbol);
    if (!m) return t;
    changed = true;
    return applyMiniTicker(t, m);
  });
  return changed ? next : list;
}

export type TickDirection = "up" | "down" | null;

/** Which way a price moved between two renders; null if it didn't. */
export function tickDirection(prev: number, next: number): TickDirection {
  if (!Number.isFinite(prev) || !Number.isFinite(next) || prev === next) {
    return null;
  }
  return next > prev ? "up" : "down";
}

export type ChangeDirection = "up" | "down" | "flat";

/**
 * Direction of a 24h % change as displayed (2 decimals), so a -0.001% move
 * reads as flat everywhere. The badge and the sparkline both use this.
 */
export function changeDirection(percent: number): ChangeDirection {
  const rounded = Math.round(percent * 100);
  if (!Number.isFinite(rounded) || rounded === 0) return "flat";
  return rounded > 0 ? "up" : "down";
}
