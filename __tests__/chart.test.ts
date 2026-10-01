import { describe, expect, it } from "vitest";

import {
  DEFAULT_TIMEFRAME,
  applyLivePrice,
  chartNote,
  hslTokenToRgba,
  legendValues,
  minimumPriceRange,
  parseTimeframe,
  toChartData,
  toLocalChartTime,
} from "@/lib/chart";
import type { Candle } from "@/lib/types";

const HOUR = 3_600_000;

function candle(time: number, open: number, close: number, over: Partial<Candle> = {}): Candle {
  return {
    time,
    open,
    high: Math.max(open, close) + 1,
    low: Math.min(open, close) - 1,
    close,
    volume: 10,
    quoteVolume: 100,
    trades: 5,
    closeTime: time + HOUR - 1,
    ...over,
  };
}

const COLORS = { up: "rgba(0,255,0,1)", down: "rgba(255,0,0,1)", upVolume: "up-vol", downVolume: "down-vol" };

describe("hslTokenToRgba", () => {
  it.each([
    ["172 66% 50%", 1, "rgba(43, 212, 189, 1)"],
    ["0 0% 100%", 1, "rgba(255, 255, 255, 1)"],
    ["0 0% 0%", 0.5, "rgba(0, 0, 0, 0.5)"],
    ["0 100% 50%", 1, "rgba(255, 0, 0, 1)"],
  ])("%s @ %d -> %s", (token, alpha, expected) => {
    expect(hslTokenToRgba(token, alpha)).toBe(expected);
  });

  it("reads an alpha from the token and multiplies it", () => {
    expect(hslTokenToRgba("0 0% 0% / 0.5")).toBe("rgba(0, 0, 0, 0.5)");
    expect(hslTokenToRgba("0 0% 0% / 0.5", 0.5)).toBe("rgba(0, 0, 0, 0.25)");
  });

  it("converts the background token (spec: ~#0B0E14)", () => {
    // --background 222 24% 6% is #0B0E14 in the spec
    expect(hslTokenToRgba("222 24% 6%")).toBe("rgba(12, 14, 19, 1)");
  });

  it("tolerates whitespace and returns null for junk", () => {
    expect(hslTokenToRgba("  172   66%  50% ")).toBe("rgba(43, 212, 189, 1)");
    expect(hslTokenToRgba("")).toBeNull();
    expect(hslTokenToRgba("#fff")).toBeNull();
  });
});

describe("toChartData", () => {
  it("maps candles to seconds-based OHLC and colored volume bars", () => {
    const data = toChartData(
      [candle(0, 10, 12), candle(HOUR, 12, 11)],
      COLORS,
    );
    expect(data.candles).toEqual([
      { time: 0, open: 10, high: 13, low: 9, close: 12 },
      { time: 3600, open: 12, high: 13, low: 10, close: 11 },
    ]);
    expect(data.volume).toEqual([
      { time: 0, value: 10, color: "up-vol" },
      { time: 3600, value: 10, color: "down-vol" },
    ]);
  });

  it("treats an unchanged candle as up", () => {
    expect(toChartData([candle(0, 5, 5)], COLORS).volume[0].color).toBe("up-vol");
  });

  it("sorts by time and drops duplicates (the chart requires both)", () => {
    const data = toChartData(
      [candle(2 * HOUR, 1, 2), candle(0, 1, 2), candle(2 * HOUR, 3, 4)],
      COLORS,
    );
    expect(data.candles.map((c) => c.time)).toEqual([0, 7200]);
    // the later duplicate wins
    expect(data.candles[1].close).toBe(4);
  });

  it("skips candles with non-finite values", () => {
    expect(toChartData([candle(0, Number.NaN, 1)], COLORS).candles).toEqual([]);
  });
});

describe("chartNote", () => {
  const now = Date.UTC(2026, 9, 1, 12);

  it("is null for a live pair with recent candles", () => {
    expect(
      chartNote({ candles: [candle(now - HOUR, 1, 2)], halted: false, now }),
    ).toBeNull();
  });

  it("notes halted pairs with the last candle's time", () => {
    const last = Date.UTC(2026, 7, 17, 2);
    expect(
      chartNote({ candles: [candle(last - HOUR, 1, 2), candle(last, 1, 2)], halted: true, now }),
    ).toEqual({ kind: "no-recent-trades", lastCandleAt: last });
  });

  it("notes a pair whose newest candle is more than 24h old, even if not flagged", () => {
    const last = now - 30 * HOUR;
    expect(chartNote({ candles: [candle(last, 1, 2)], halted: false, now })).toEqual({
      kind: "no-recent-trades",
      lastCandleAt: last,
    });
  });

  it("reports an empty chart", () => {
    expect(chartNote({ candles: [], halted: false, now })).toEqual({ kind: "empty" });
    expect(chartNote({ candles: [], halted: true, now })).toEqual({ kind: "empty" });
  });
});

describe("applyLivePrice", () => {
  const now = 10 * HOUR + 1000;
  const candles = [candle(9 * HOUR, 100, 101), candle(10 * HOUR, 101, 102)];

  it("updates the open candle's close, high and low", () => {
    const up = applyLivePrice(candles, 110, now)!;
    expect(up).toMatchObject({ time: 10 * HOUR, open: 101, close: 110, high: 110, low: 100 });
    const down = applyLivePrice(candles, 90, now)!;
    expect(down).toMatchObject({ close: 90, high: 103, low: 90 });
  });

  it("ignores ticks once the last candle has closed", () => {
    expect(applyLivePrice(candles, 110, 11 * HOUR + 1)).toBeNull();
  });

  it("ignores empty series and bad prices", () => {
    expect(applyLivePrice([], 110, now)).toBeNull();
    expect(applyLivePrice(candles, Number.NaN, now)).toBeNull();
    expect(applyLivePrice(candles, 0, now)).toBeNull();
  });

  it("returns null when nothing changes", () => {
    expect(applyLivePrice(candles, 102, now)).toBeNull();
  });
});

describe("parseTimeframe", () => {
  it("defaults to 1D", () => {
    expect(DEFAULT_TIMEFRAME).toBe("1D");
    expect(parseTimeframe(null)).toBe("1D");
    expect(parseTimeframe("")).toBe("1D");
    expect(parseTimeframe("5Y")).toBe("1D");
  });

  it("accepts every tab, case-insensitively", () => {
    for (const tf of ["1H", "4H", "1D", "1W", "1M"]) {
      expect(parseTimeframe(tf)).toBe(tf);
      expect(parseTimeframe(tf.toLowerCase())).toBe(tf);
    }
  });
});

describe("toLocalChartTime", () => {
  it("shifts by the local offset (getTimezoneOffset is minutes behind UTC)", () => {
    // UTC+5 (Pakistan) -> getTimezoneOffset() === -300
    expect(toLocalChartTime(0, () => -300)).toBe(5 * 3600);
    // UTC-4 -> 240
    expect(toLocalChartTime(36_000, () => 240)).toBe(36_000 - 4 * 3600);
    expect(toLocalChartTime(1000, () => 0)).toBe(1000);
  });

  it("uses the offset at each timestamp (DST)", () => {
    const offsetAt = (ms: number) => (ms < 1_000_000 ? -600 : -660); // Sydney AEST -> AEDT
    expect(toLocalChartTime(10, offsetAt)).toBe(10 + 36_000);
    expect(toLocalChartTime(2000, offsetAt)).toBe(2000 + 39_600);
  });
});

describe("minimumPriceRange", () => {
  it("widens a tiny range to 0.5% around the mid price", () => {
    // USDC/USDT moving 0.9996..1.0002
    const r = minimumPriceRange(0.9996, 1.0002);
    const mid = (0.9996 + 1.0002) / 2;
    expect(r.minValue).toBeCloseTo(mid * (1 - 0.0025), 10);
    expect(r.maxValue).toBeCloseTo(mid * (1 + 0.0025), 10);
  });

  it("leaves a wide range alone", () => {
    expect(minimumPriceRange(80_000, 86_000)).toEqual({ minValue: 80_000, maxValue: 86_000 });
  });

  it("accepts a custom share and handles a flat line", () => {
    expect(minimumPriceRange(1, 1, 0.02)).toEqual({ minValue: 0.99, maxValue: 1.01 });
  });
});

describe("legendValues", () => {
  const c = candle(0, 100, 110, { high: 112, low: 98, volume: 1_234_567 });

  it("formats OHLC with the chart's precision, plus change and volume", () => {
    expect(legendValues(c, 2)).toEqual({
      open: "100.00",
      high: "112.00",
      low: "98.00",
      close: "110.00",
      change: "+10.00%",
      direction: "up",
      volume: "1.23M",
    });
  });

  it("reports down and flat candles", () => {
    expect(legendValues(candle(0, 100, 95), 2)).toMatchObject({ change: "-5.00%", direction: "down" });
    expect(legendValues(candle(0, 100, 100), 2)).toMatchObject({ change: "0.00%", direction: "flat" });
  });

  it("survives a zero open", () => {
    expect(legendValues(candle(0, 0, 1), 2)).toMatchObject({ change: "0.00%", direction: "flat" });
  });
});
