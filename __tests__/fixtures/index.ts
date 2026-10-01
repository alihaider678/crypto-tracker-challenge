import type { BinanceTicker24hr } from "@/lib/types";

import snapshot from "./ticker24hr.json";

/**
 * 57 real tickers captured from data-api.binance.vision, in API order. It
 * covers VANRY (halted since 2026-09-09), USDT majors, tricky quotes (EUR vs
 * AEUR, IDR vs BIDR, U, FDUSD), retired quotes (TUSD, PAX), and dead pairs
 * (zero trades, or stale for more than 24h).
 */
export const CAPTURED_AT: number = snapshot.capturedAt;
export const RAW_TICKERS = snapshot.tickers as BinanceTicker24hr[];

export function rawTicker(symbol: string): BinanceTicker24hr {
  const t = RAW_TICKERS.find((x) => x.symbol === symbol);
  if (!t) throw new Error(`fixture has no ${symbol}`);
  return t;
}
