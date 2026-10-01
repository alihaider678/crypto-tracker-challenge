import { queryOptions, useQuery } from "@tanstack/react-query";

import { fetchAllTickers24hr, fetchTicker24hr, shouldRetry } from "@/lib/binance";
import { listedTickers, normalizeTicker, normalizeTickers } from "@/lib/market";
import type { Ticker } from "@/lib/types";

export const tickersQueryKey = ["tickers", "24hr"] as const;

/**
 * REST snapshot of every listed pair (dead and halted pairs removed, VANRY
 * kept). useLiveTickers merges stream updates into this same cache entry.
 * The snapshot is about 1 MB, so it refreshes every 5 minutes; that also
 * picks up trade counts (not in the stream) and new listings.
 */
export function tickersQueryOptions() {
  return queryOptions({
    queryKey: tickersQueryKey,
    queryFn: async ({ signal }) =>
      listedTickers(normalizeTickers(await fetchAllTickers24hr(signal))),
    staleTime: 60_000,
    refetchInterval: 5 * 60_000,
    retry: shouldRetry,
  });
}

export function useTickers() {
  return useQuery(tickersQueryOptions());
}

/**
 * One pair from the shared snapshot: null when it isn't listed (unknown,
 * dead or halted).
 */
export function useTicker(symbol: string) {
  const upper = symbol.toUpperCase();
  return useQuery({
    ...tickersQueryOptions(),
    select: (list) => list.find((t) => t.symbol === upper) ?? null,
  });
}

// --- One pair (detail page) ---------------------------------------------

export const tickerQueryKey = (symbol: string) =>
  ["ticker", symbol.toUpperCase()] as const;

/**
 * 24h stats for one pair, without downloading the all-market snapshot.
 * useLiveTickers merges live ticks into this entry too; the REST refresh
 * every minute keeps the trade count (not in the stream) current.
 */
export function coinTickerQueryOptions(symbol: string) {
  const upper = symbol.toUpperCase();
  return queryOptions({
    queryKey: tickerQueryKey(upper),
    queryFn: async ({ signal }) =>
      normalizeTicker(await fetchTicker24hr(upper, signal)),
    staleTime: 60_000,
    refetchInterval: 60_000,
    retry: shouldRetry,
  });
}

/** Server-rendered starting point for useCoinTicker. */
export type InitialTicker = { ticker: Ticker; fetchedAt: number };

export function useCoinTicker(symbol: string, initial?: InitialTicker | null) {
  return useQuery({
    ...coinTickerQueryOptions(symbol),
    initialData: initial?.ticker,
    // When the server fetched it, not when the pair last traded: a halted
    // pair's data is old but was fetched just now.
    initialDataUpdatedAt: initial?.fetchedAt,
  });
}
