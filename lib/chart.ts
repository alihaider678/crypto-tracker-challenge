import { TIMEFRAMES, type Timeframe } from "./binance";
import { STALE_AFTER_MS } from "./market";
import type { Candle } from "./types";

// --- Timeframe (?tf=) ---------------------------------------------------

export const DEFAULT_TIMEFRAME: Timeframe = "1D";

export function parseTimeframe(value: string | null | undefined): Timeframe {
  const upper = value?.toUpperCase();
  return (TIMEFRAMES as readonly string[]).includes(upper ?? "")
    ? (upper as Timeframe)
    : DEFAULT_TIMEFRAME;
}

// --- Colors -------------------------------------------------------------

/**
 * Converts a design token's HSL channels ("172 66% 50%" or
 * "152 69% 45% / 0.12") to "rgba(r, g, b, a)". The chart draws on canvas
 * and doesn't parse CSS variables or space-separated hsl(), so token colors
 * are converted here. `alpha` multiplies the token's own alpha.
 */
export function hslTokenToRgba(token: string, alpha = 1): string | null {
  const match = token
    .trim()
    .match(/^(-?[\d.]+)\s+([\d.]+)%\s+([\d.]+)%(?:\s*\/\s*([\d.]+))?$/);
  if (!match) return null;

  const h = (((Number(match[1]) % 360) + 360) % 360) / 60;
  const s = Number(match[2]) / 100;
  const l = Number(match[3]) / 100;
  const a = (match[4] === undefined ? 1 : Number(match[4])) * alpha;

  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs((h % 2) - 1));
  const m = l - c / 2;
  const [r, g, b] =
    h < 1 ? [c, x, 0]
    : h < 2 ? [x, c, 0]
    : h < 3 ? [0, c, x]
    : h < 4 ? [0, x, c]
    : h < 5 ? [x, 0, c]
    : [c, 0, x];

  const to255 = (v: number) => Math.round((v + m) * 255);
  const alphaText = Math.round(a * 1000) / 1000;
  return `rgba(${to255(r)}, ${to255(g)}, ${to255(b)}, ${alphaText})`;
}

// --- Data ---------------------------------------------------------------

export type ChartCandle = {
  /** Seconds (the chart's UTCTimestamp) */
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
};

export type ChartVolume = { time: number; value: number; color: string };

export type VolumeColors = { upVolume: string; downVolume: string };

/**
 * Candles -> chart series data. The chart needs ascending, unique times in
 * seconds; duplicates keep the later candle. Volume bars take the candle's
 * direction (unchanged counts as up).
 */
export function toChartData(
  candles: Candle[],
  colors: VolumeColors,
): { candles: ChartCandle[]; volume: ChartVolume[] } {
  const byTime = new Map<number, Candle>();
  for (const c of candles) {
    if (![c.time, c.open, c.high, c.low, c.close].every(Number.isFinite)) continue;
    byTime.set(Math.floor(c.time / 1000), c);
  }
  const times = [...byTime.keys()].sort((a, b) => a - b);

  return {
    candles: times.map((time) => {
      const c = byTime.get(time)!;
      return { time, open: c.open, high: c.high, low: c.low, close: c.close };
    }),
    volume: times.map((time) => {
      const c = byTime.get(time)!;
      return {
        time,
        value: Number.isFinite(c.volume) ? c.volume : 0,
        color: c.close >= c.open ? colors.upVolume : colors.downVolume,
      };
    }),
  };
}

/**
 * Folds a live price into the candle that is still open. Returns the
 * updated candle, or null when there's nothing to update (no candles, the
 * last candle has closed, a bad price, or no change).
 */
export function applyLivePrice(
  candles: Candle[],
  price: number,
  now: number,
): Candle | null {
  const last = candles[candles.length - 1];
  if (!last || !(price > 0) || now > last.closeTime) return null;
  if (price === last.close) return null;
  return {
    ...last,
    close: price,
    high: Math.max(last.high, price),
    low: Math.min(last.low, price),
  };
}

// --- Notes over the chart -----------------------------------------------

export type ChartNote =
  | { kind: "empty" }
  | { kind: "no-recent-trades"; lastCandleAt: number };

/**
 * What to say over the chart, if anything:
 * - no candles at all -> "empty"
 * - the pair is halted, or its newest candle is over 24h old ->
 *   "no-recent-trades" with that candle's time, so stale candles are never
 *   presented as current.
 */
export function chartNote({
  candles,
  halted,
  now,
}: {
  candles: Candle[];
  halted: boolean;
  now: number;
}): ChartNote | null {
  if (candles.length === 0) return { kind: "empty" };
  const lastCandleAt = Math.max(...candles.map((c) => c.time));
  if (halted || now - lastCandleAt > STALE_AFTER_MS) {
    return { kind: "no-recent-trades", lastCandleAt };
  }
  return null;
}

/**
 * The chart labels times in UTC. Shifting each timestamp by the viewer's
 * UTC offset at that moment makes its labels and day boundaries read in
 * local time (and stay right across DST changes).
 */
export function toLocalChartTime(
  seconds: number,
  offsetMinutesAt: (ms: number) => number = (ms) => new Date(ms).getTimezoneOffset(),
): number {
  return seconds - offsetMinutesAt(seconds * 1000) * 60;
}
