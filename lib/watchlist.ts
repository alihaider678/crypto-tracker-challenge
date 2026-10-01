import { isTradingHalted } from "./market";
import { parseSymbol } from "./symbols";
import type { Ticker } from "./types";

/**
 * Starred pairs that aren't in the listed snapshot (halted, no trades, or
 * gone), so they can be fetched one by one. Unparseable symbols are skipped:
 * there's nothing to ask Binance for.
 */
export function missingSymbols(symbols: readonly string[], listed: Ticker[]): string[] {
  const have = new Set(listed.map((t) => t.symbol));
  return [...new Set(symbols)].filter((s) => !have.has(s) && parseSymbol(s) !== null);
}

/**
 * Splits off-snapshot stars into ones to fetch and ones Binance doesn't know
 * at all. Until the symbol list has loaded (`known` null), nothing is
 * decided and nothing is fetched, so the browser never requests an invalid
 * symbol (Binance's 4xx responses have no CORS header).
 */
export function splitMissing(
  missing: readonly string[],
  known: ReadonlySet<string> | null | undefined,
): { fetch: string[]; unknown: string[] } {
  if (!known) return { fetch: [], unknown: [] };
  return {
    fetch: missing.filter((s) => known.has(s)),
    unknown: missing.filter((s) => !known.has(s)),
  };
}

export type WatchlistResolution = {
  /** Tickers to show, in star order. */
  rows: Ticker[];
  /** Starred, not in the snapshot, still being fetched. */
  pending: string[];
  /** Starred, but Binance no longer lists the pair (or it isn't a pair). */
  unavailable: string[];
};

/**
 * Every starred symbol ends up in exactly one bucket, so nothing is dropped
 * silently. `extras` holds the one-by-one fetches: a Ticker, or null when
 * Binance rejected the symbol.
 */
export function resolveWatchlist(
  symbols: readonly string[],
  listed: Ticker[],
  extras: ReadonlyMap<string, Ticker | null>,
): WatchlistResolution {
  const bySymbol = new Map(listed.map((t) => [t.symbol, t]));
  const out: WatchlistResolution = { rows: [], pending: [], unavailable: [] };

  for (const s of new Set(symbols)) {
    const listedTicker = bySymbol.get(s);
    if (listedTicker) {
      out.rows.push(listedTicker);
    } else if (parseSymbol(s) === null) {
      out.unavailable.push(s);
    } else if (extras.has(s)) {
      const t = extras.get(s);
      if (t) {
        // Off the snapshot means not trading normally; say so in the row.
        out.rows.push(isTradingHalted(t) && !t.halted ? { ...t, halted: true } : t);
      } else {
        out.unavailable.push(s);
      }
    } else {
      out.pending.push(s);
    }
  }
  return out;
}
