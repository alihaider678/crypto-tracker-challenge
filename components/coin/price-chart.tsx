"use client";

import { useCallback, useEffect, useRef } from "react";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import {
  CandlestickSeries,
  ColorType,
  CrosshairMode,
  HistogramSeries,
  createChart,
  type AutoscaleInfo,
  type IChartApi,
  type ISeriesApi,
  type MouseEventParams,
  type Time,
  type UTCTimestamp,
} from "lightweight-charts";

import {
  hslTokenToRgba,
  legendValues,
  minimumPriceRange,
  toChartData,
  toLocalChartTime,
} from "@/lib/chart";
import { formatDate, formatTime } from "@/lib/format";
import type { Candle } from "@/lib/types";

/*
 * lightweight-charts wrapper. Load it with next/dynamic (ssr: false): the
 * library needs the DOM.
 *
 * Colors come from the design tokens on :root, converted to rgba because
 * the canvas can't resolve CSS variables. Green/red are used only for candle
 * and volume direction.
 */

type Palette = {
  surface: string;
  text: string;
  grid: string;
  border: string;
  crosshair: string;
  label: string;
  up: string;
  down: string;
  upVolume: string;
  downVolume: string;
  font: string;
};

function readPalette(): Palette {
  const styles = getComputedStyle(document.documentElement);
  const token = (name: string, alpha = 1) =>
    hslTokenToRgba(styles.getPropertyValue(name), alpha) ?? "transparent";
  return {
    surface: token("--surface"),
    text: token("--muted-foreground"),
    grid: token("--border", 0.6),
    border: token("--border"),
    crosshair: token("--muted-foreground", 0.6),
    label: token("--elevated"),
    up: token("--positive"),
    down: token("--negative"),
    upVolume: token("--positive", 0.35),
    downVolume: token("--negative", 0.35),
    font: styles.getPropertyValue("--font-geist-mono").trim() || "monospace",
  };
}

const asTime = (ms: number) => toLocalChartTime(Math.floor(ms / 1000)) as UTCTimestamp;

function samePalette(a: Palette, b: Palette) {
  return (Object.keys(a) as (keyof Palette)[]).every((k) => a[k] === b[k]);
}

function volumeData(candles: Candle[], p: Palette) {
  return toChartData(candles, p).volume.map((v) => ({ ...v, time: asTime(v.time * 1000) }));
}

/** Every token-driven color on the chart, so a theme switch can re-apply it. */
function applyPalette(
  chart: IChartApi,
  candles: ISeriesApi<"Candlestick">,
  p: Palette,
) {
  chart.applyOptions({
    layout: {
      background: { type: ColorType.Solid, color: p.surface },
      textColor: p.text,
      fontFamily: p.font,
    },
    grid: { vertLines: { color: p.grid }, horzLines: { color: p.grid } },
    rightPriceScale: { borderColor: p.border },
    timeScale: { borderColor: p.border },
    crosshair: {
      vertLine: { color: p.crosshair, labelBackgroundColor: p.label },
      horzLine: { color: p.crosshair, labelBackgroundColor: p.label },
    },
  });
  candles.applyOptions({
    upColor: p.up,
    downColor: p.down,
    borderUpColor: p.up,
    borderDownColor: p.down,
    wickUpColor: p.up,
    wickDownColor: p.down,
  });
}

/** Stablecoin pairs: keep at least a 0.5% visible range around the mid. */
function stableAutoscale(original: () => AutoscaleInfo | null): AutoscaleInfo | null {
  const info = original();
  if (!info?.priceRange) return info;
  return {
    ...info,
    priceRange: minimumPriceRange(info.priceRange.minValue, info.priceRange.maxValue),
  };
}

const LEGEND_KEYS = ["open", "high", "low", "close", "change", "volume", "time"] as const;

/**
 * Writes one candle into the legend's DOM nodes. Runs from the chart's
 * crosshair callback, so hovering never re-renders React or the chart.
 */
function writeLegend(el: HTMLElement, c: Candle | null, decimals: number, intraday: boolean) {
  const set = (key: string, text: string) => {
    const node = el.querySelector<HTMLElement>(`[data-k="${key}"]`);
    if (node) node.textContent = text;
  };
  const dir = el.querySelector<HTMLElement>("[data-dir]");
  if (!c) {
    for (const k of LEGEND_KEYS) set(k, "—");
    dir?.setAttribute("data-dir", "flat");
    return;
  }
  const v = legendValues(c, decimals);
  set("open", v.open);
  set("high", v.high);
  set("low", v.low);
  set("close", v.close);
  set("change", v.change);
  set("volume", v.volume);
  set(
    "time",
    intraday ? `${formatDate(c.time)}, ${formatTime(c.time).slice(0, 5)}` : formatDate(c.time),
  );
  dir?.setAttribute("data-dir", v.direction);
}

function LegendField({ k, label, className }: { k: string; label: string; className?: string }) {
  return (
    <span className={`items-baseline gap-1 ${className ?? "inline-flex"}`}>
      <span className="text-muted-foreground">{label}</span>
      <span data-k={k} className="num text-foreground">
        —
      </span>
    </span>
  );
}

export default function PriceChart({
  candles,
  liveCandle,
  decimals,
  intraday,
  stable = false,
}: {
  candles: Candle[];
  /** The still-open candle with the latest live price, if any. */
  liveCandle: Candle | null;
  /** Price precision, from lib/format's priceDecimals. */
  decimals: number;
  /** Show times on the axis (candles shorter than a day). */
  intraday: boolean;
  /** Stablecoin pair: keep at least a 0.5% visible price range. */
  stable?: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const legendRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const volumeRef = useRef<ISeriesApi<"Histogram"> | null>(null);
  const paletteRef = useRef<Palette | null>(null);
  const candlesRef = useRef<Candle[]>(candles);
  // Legend state lives in refs: the crosshair updates it without renders.
  const timeMapRef = useRef(new Map<number, Candle>());
  const hoverRef = useRef<Candle | null>(null);
  const liveRef = useRef<Candle | null>(liveCandle);
  const decimalsRef = useRef(decimals);
  const intradayRef = useRef(intraday);

  // Hovered candle, else the latest (live) one.
  const renderLegend = useCallback(() => {
    const el = legendRef.current;
    if (!el) return;
    const c = hoverRef.current ?? liveRef.current ?? candlesRef.current.at(-1) ?? null;
    writeLegend(el, c, decimalsRef.current, intradayRef.current);
  }, []);

  // Create once; remove everything on unmount.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const p = readPalette();
    paletteRef.current = p;

    const chart = createChart(el, {
      autoSize: true, // ResizeObserver; follows the container
      layout: {
        fontSize: 12,
        // Required attribution for the library's license.
        attributionLogo: true,
      },
      timeScale: { secondsVisible: false, rightOffset: 4 },
      crosshair: { mode: CrosshairMode.Normal },
      localization: { locale: "en-US" },
    });

    const candleSeries = chart.addSeries(CandlestickSeries);
    candleSeries.priceScale().applyOptions({
      scaleMargins: { top: 0.08, bottom: 0.26 },
    });

    // Volume on its own overlay scale along the bottom 20%.
    const volumeSeries = chart.addSeries(HistogramSeries, {
      priceScaleId: "",
      priceFormat: { type: "volume" },
      lastValueVisible: false,
      priceLineVisible: false,
    });
    chart.priceScale("").applyOptions({ scaleMargins: { top: 0.8, bottom: 0 } });

    chartRef.current = chart;
    candleRef.current = candleSeries;
    volumeRef.current = volumeSeries;
    applyPalette(chart, candleSeries, p);

    const onCrosshairMove = (param: MouseEventParams<Time>) => {
      hoverRef.current =
        typeof param.time === "number" && param.point
          ? (timeMapRef.current.get(param.time) ?? null)
          : null;
      renderLegend();
    };
    chart.subscribeCrosshairMove(onCrosshairMove);

    // Theme switch (next-themes toggles the class on <html>): re-read the
    // tokens and recolor in place. The chart, its zoom and the selected
    // timeframe are untouched.
    const observer = new MutationObserver(() => {
      const next = readPalette();
      if (paletteRef.current && samePalette(paletteRef.current, next)) return;
      paletteRef.current = next;
      applyPalette(chart, candleSeries, next);
      // Volume bar colors live in the data, so recolor those bars.
      volumeSeries.setData(volumeData(candlesRef.current, next));
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class", "style"],
    });

    return () => {
      chart.unsubscribeCrosshairMove(onCrosshairMove);
      observer.disconnect();
      chartRef.current = null;
      candleRef.current = null;
      volumeRef.current = null;
      chart.remove();
    };
  }, [renderLegend]);

  // Full data: on load and timeframe change.
  useEffect(() => {
    candlesRef.current = candles;
    const p = paletteRef.current;
    if (!p || !candleRef.current || !volumeRef.current) return;
    const data = toChartData(candles, p);
    candleRef.current.setData(
      data.candles.map((c) => ({ ...c, time: asTime(c.time * 1000) })),
    );
    volumeRef.current.setData(volumeData(candles, p));
    chartRef.current?.timeScale().fitContent();
    timeMapRef.current = new Map(candles.map((c) => [asTime(c.time) as number, c]));
    hoverRef.current = null;
    renderLegend();
  }, [candles, renderLegend]);

  // Live tick: redraw just the open candle, and the legend unless hovering.
  useEffect(() => {
    liveRef.current = liveCandle;
    renderLegend();
    if (!liveCandle || !candleRef.current) return;
    candleRef.current.update({
      time: asTime(liveCandle.time),
      open: liveCandle.open,
      high: liveCandle.high,
      low: liveCandle.low,
      close: liveCandle.close,
    });
  }, [liveCandle, renderLegend]);

  useEffect(() => {
    decimalsRef.current = decimals;
    intradayRef.current = intraday;
    candleRef.current?.applyOptions({
      priceFormat: { type: "price", precision: decimals, minMove: 10 ** -decimals },
    });
    chartRef.current?.applyOptions({ timeScale: { timeVisible: intraday } });
    renderLegend();
  }, [decimals, intraday, renderLegend]);

  useEffect(() => {
    candleRef.current?.applyOptions({
      autoscaleInfoProvider: stable ? stableAutoscale : undefined,
    });
  }, [stable]);

  return (
    <div className="flex size-full flex-col">
      {/* Fixed-height legend row: hovered candle, or the latest one. */}
      <div
        ref={legendRef}
        aria-hidden
        className="flex h-9 shrink-0 items-center gap-x-3 overflow-hidden border-b border-border px-3 text-xs whitespace-nowrap"
      >
        <LegendField k="open" label="O" className="hidden sm:inline-flex" />
        <LegendField k="high" label="H" className="hidden sm:inline-flex" />
        <LegendField k="low" label="L" className="hidden sm:inline-flex" />
        <LegendField k="close" label="C" />
        {/* Sign + arrow + color, never color alone. */}
        <span
          data-dir="flat"
          className="group/dir num inline-flex items-center gap-0.5 data-[dir=down]:text-negative data-[dir=flat]:text-muted-foreground data-[dir=up]:text-positive"
        >
          <ArrowUpRight className="hidden size-3.5 group-data-[dir=up]/dir:inline" aria-hidden />
          <ArrowDownRight className="hidden size-3.5 group-data-[dir=down]/dir:inline" aria-hidden />
          <Minus className="hidden size-3.5 group-data-[dir=flat]/dir:inline" aria-hidden />
          <span data-k="change">—</span>
        </span>
        <LegendField k="volume" label="Vol" />
        <span data-k="time" className="ml-auto hidden text-muted-foreground tabular-nums md:inline">
          —
        </span>
      </div>
      <div ref={containerRef} className="min-h-0 flex-1" />
    </div>
  );
}
