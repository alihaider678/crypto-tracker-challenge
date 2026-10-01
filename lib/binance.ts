import type { BinanceKline, BinanceTicker24hr, Candle } from "./types";

/*
 * Every Binance call goes through this module, so the hosts are easy to
 * swap. The defaults are Binance's market-data-only hosts, which avoid the
 * HTTP 451 geo-block api.binance.com returns in some regions. Fetching
 * happens on the client.
 *
 * NEXT_PUBLIC_* values are inlined at build time, so they must be read with
 * these literal names.
 */
export const REST_BASE_URL = (
  process.env.NEXT_PUBLIC_BINANCE_REST_URL ||
  "https://data-api.binance.vision/api/v3"
).replace(/\/+$/, "");

export const WS_BASE_URL = (
  process.env.NEXT_PUBLIC_BINANCE_WS_URL || "wss://data-stream.binance.vision"
).replace(/\/+$/, "");

/** All-market mini tickers, pushed every 1000ms, changed symbols only. */
export const MINI_TICKER_STREAM_URL = `${WS_BASE_URL}/ws/!miniTicker@arr`;

export class BinanceError extends Error {
  constructor(
    message: string,
    /** HTTP status; 0 for network failures. */
    readonly status: number,
    /** Binance error code from the response body, e.g. -1121. */
    readonly code?: number,
  ) {
    super(message);
    this.name = "BinanceError";
  }

  /**
   * Binance rejected the symbol (code -1121). Only detectable on the server:
   * Binance's 4xx responses carry no CORS header, so in the browser they
   * surface as network errors (status 0). Browsers check fetchAllSymbols.
   */
  get isInvalidSymbol(): boolean {
    return this.code === -1121;
  }
}

/**
 * TanStack Query retry policy: retry network and server errors twice, but
 * never retry bad symbols, geo-blocks or rate limits.
 */
export function shouldRetry(failureCount: number, error: unknown): boolean {
  if (error instanceof BinanceError) {
    if (error.isInvalidSymbol) return false;
    if ([400, 403, 404, 418, 429, 451].includes(error.status)) return false;
  }
  return failureCount < 2;
}

async function getJson<T>(
  path: string,
  params: Record<string, string | number> = {},
  signal?: AbortSignal,
): Promise<T> {
  const query = new URLSearchParams(
    Object.entries(params).map(([k, v]) => [k, String(v)]),
  ).toString();
  const url = `${REST_BASE_URL}${path}${query ? `?${query}` : ""}`;

  let res: Response;
  try {
    res = await fetch(url, { signal });
  } catch (err) {
    if (signal?.aborted) throw err;
    throw new BinanceError("Could not reach Binance. Check your connection.", 0);
  }

  if (!res.ok) {
    let code: number | undefined;
    let msg: string | undefined;
    try {
      const body = (await res.json()) as { code?: number; msg?: string };
      code = body.code;
      msg = body.msg;
    } catch {
      // Body isn't JSON; the status is enough.
    }
    const message =
      res.status === 451
        ? "Binance is not available from this region (HTTP 451). Set NEXT_PUBLIC_BINANCE_REST_URL to data-api.binance.vision."
        : res.status === 429 || res.status === 418
          ? "Binance rate limit reached. Try again in a minute."
          : (msg ?? `Binance request failed (HTTP ${res.status}).`);
    throw new BinanceError(message, res.status, code);
  }

  return (await res.json()) as T;
}

/** 24h stats for every pair (about 3,700, including halted ones). */
export function fetchAllTickers24hr(
  signal?: AbortSignal,
): Promise<BinanceTicker24hr[]> {
  return getJson<BinanceTicker24hr[]>("/ticker/24hr", {}, signal);
}

/** 24h stats for one pair. Rejects with isInvalidSymbol for unknown pairs. */
export function fetchTicker24hr(
  symbol: string,
  signal?: AbortSignal,
): Promise<BinanceTicker24hr> {
  return getJson<BinanceTicker24hr>(
    "/ticker/24hr",
    { symbol: symbol.toUpperCase() },
    signal,
  );
}

/**
 * Every symbol Binance knows, trading or not (~3,700, about 150 KB). The
 * browser's way to tell "not a Binance pair" from "network trouble".
 */
export async function fetchAllSymbols(signal?: AbortSignal): Promise<string[]> {
  const rows = await getJson<{ symbol: string }[]>("/ticker/price", {}, signal);
  return rows.map((r) => r.symbol);
}

// --- Klines -------------------------------------------------------------

export type KlineInterval =
  | "1m"
  | "5m"
  | "15m"
  | "30m"
  | "1h"
  | "4h"
  | "1d"
  | "1w";

export type Timeframe = "1H" | "4H" | "1D" | "1W" | "1M";

export const TIMEFRAMES: readonly Timeframe[] = ["1H", "4H", "1D", "1W", "1M"];

/**
 * A timeframe tab is the span of time the chart covers, and the candle size
 * is picked so each span shows roughly 50 to 180 candles.
 */
export const TIMEFRAME_CONFIG: Record<
  Timeframe,
  { interval: KlineInterval; limit: number }
> = {
  "1H": { interval: "1m", limit: 60 },
  "4H": { interval: "5m", limit: 48 },
  "1D": { interval: "15m", limit: 96 },
  "1W": { interval: "1h", limit: 168 },
  "1M": { interval: "4h", limit: 180 },
};

/** Sparklines: the last 24 hourly candles. */
export const SPARKLINE_CONFIG = { interval: "1h", limit: 24 } as const;

export function parseKline(k: BinanceKline): Candle {
  return {
    time: k[0],
    open: Number(k[1]),
    high: Number(k[2]),
    low: Number(k[3]),
    close: Number(k[4]),
    volume: Number(k[5]),
    closeTime: k[6],
    quoteVolume: Number(k[7]),
    trades: k[8],
  };
}

export async function fetchKlines(
  symbol: string,
  { interval, limit }: { interval: KlineInterval; limit: number },
  signal?: AbortSignal,
): Promise<Candle[]> {
  const rows = await getJson<BinanceKline[]>(
    "/klines",
    { symbol: symbol.toUpperCase(), interval, limit },
    signal,
  );
  return rows.map(parseKline);
}
