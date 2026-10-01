import { coinName, pairLabel, parseSymbol } from "./symbols";
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

// --- Overview -----------------------------------------------------------

export type TopMovers = {
  gainers: Ticker[];
  losers: Ticker[];
  volume: Ticker[];
};

/**
 * Top gainers, losers and volume within one quote asset. Volumes in
 * different quotes (USDT vs TRY) aren't comparable, so a quote is required.
 * Halted pairs are excluded: their 24h change is frozen, not today's.
 */
export function topMovers(
  list: Ticker[],
  { quote = "USDT", limit = 5 }: { quote?: string; limit?: number } = {},
): TopMovers {
  const pool = list.filter((t) => t.quoteAsset === quote && isListed(t));
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
