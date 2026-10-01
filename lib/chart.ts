import { TIMEFRAMES, type Timeframe } from "./binance";
import { formatCompact, formatPercent, formatPrice } from "./format";
import { STALE_AFTER_MS, changeDirection, type ChangeDirection } from "./market";
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

// Token -> rgba lives in lib/color; re-exported for the chart's callers.
export { hslTokenToRgba } from "./color";

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

// --- Price scale --------------------------------------------------------

/**
 * Makes the visible price range at least `share` of the mid price (0.5% by
 * default). For stablecoin pairs: without it, a 0.0006 move fills the whole
 * chart and looks like a crash.
 */
export function minimumPriceRange(
  minValue: number,
  maxValue: number,
  share = 0.005,
): { minValue: number; maxValue: number } {
  const mid = (minValue + maxValue) / 2;
  const half = (mid * share) / 2;
  if (maxValue - minValue >= half * 2) return { minValue, maxValue };
  return { minValue: mid - half, maxValue: mid + half };
}

// --- Hover legend -------------------------------------------------------

export type LegendValues = {
  open: string;
  high: string;
  low: string;
  close: string;
  /** Candle change, open to close, signed */
  change: string;
  direction: ChangeDirection;
  volume: string;
};

/** One candle's legend text, in the chart's price precision. */
export function legendValues(c: Candle, decimals: number): LegendValues {
  const pct = c.open > 0 ? ((c.close - c.open) / c.open) * 100 : 0;
  const price = (v: number) => formatPrice(v, { decimals });
  return {
    open: price(c.open),
    high: price(c.high),
    low: price(c.low),
    close: price(c.close),
    change: formatPercent(pct),
    direction: changeDirection(pct),
    volume: formatCompact(c.volume),
  };
}

// --- Text alternative ---------------------------------------------------

/**
 * Screen-reader description of the chart: what it shows, the last price,
 * the low-high range over the period, and the no-recent-trades note.
 */
export function chartSummary({
  pair,
  timeframeLabel,
  candles,
  lastPrice,
  quote,
  decimals,
  note,
  formatWhen,
}: {
  pair: string;
  timeframeLabel: string;
  candles: Candle[];
  lastPrice: number;
  quote: string;
  decimals: number;
  note: ChartNote | null;
  /** Formats a candle time for the sentence (local date, maybe time). */
  formatWhen: (ms: number) => string;
}): string {
  const price = (v: number) => formatPrice(v, { quote, decimals });
  if (candles.length === 0) {
    return `${pair} candlestick chart, ${timeframeLabel}: no candles for this period.`;
  }
  const low = Math.min(...candles.map((c) => c.low));
  const high = Math.max(...candles.map((c) => c.high));
  const parts = [
    `${pair} candlestick chart, ${timeframeLabel}, ${candles.length} candles.`,
    `Last price ${price(lastPrice)}.`,
    `Range ${price(low)} to ${price(high)}.`,
  ];
  if (note?.kind === "no-recent-trades") {
    parts.push(`No recent trades; last candle ${formatWhen(note.lastCandleAt)}.`);
  }
  return parts.join(" ");
}
