import { queryOptions, useQuery } from "@tanstack/react-query";

import { fetchAllTickers24hr, shouldRetry } from "@/lib/binance";
import { listedTickers, normalizeTickers } from "@/lib/market";

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
