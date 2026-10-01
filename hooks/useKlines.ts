import { queryOptions, useQuery } from "@tanstack/react-query";

import {
  SPARKLINE_CONFIG,
  TIMEFRAME_CONFIG,
  fetchKlines,
  shouldRetry,
  type Timeframe,
} from "@/lib/binance";

export function klinesQueryOptions(symbol: string, timeframe: Timeframe) {
  const upper = symbol.toUpperCase();
  const config = TIMEFRAME_CONFIG[timeframe];
  return queryOptions({
    queryKey: ["klines", upper, config.interval, config.limit] as const,
    queryFn: ({ signal }) => fetchKlines(upper, config, signal),
    // 1-minute candles go stale fastest.
    staleTime: config.interval === "1m" ? 30_000 : 60_000,
    retry: shouldRetry,
  });
}

/** Candles (full OHLCV) for the chart's selected timeframe. */
export function useKlines(symbol: string, timeframe: Timeframe) {
  return useQuery(klinesQueryOptions(symbol, timeframe));
}

/**
 * Closing prices of the last 24 hourly candles, cached for 5 minutes. Only
 * request these for the visible page of rows, e.g. with useQueries.
 */
export function sparklineQueryOptions(symbol: string) {
  const upper = symbol.toUpperCase();
  return queryOptions({
    queryKey: ["sparkline", upper] as const,
    queryFn: async ({ signal }) =>
      (await fetchKlines(upper, SPARKLINE_CONFIG, signal)).map((c) => c.close),
    staleTime: 5 * 60_000,
    gcTime: 10 * 60_000,
    retry: shouldRetry,
  });
}

export function useSparkline(symbol: string, { enabled = true } = {}) {
  return useQuery({ ...sparklineQueryOptions(symbol), enabled });
}
