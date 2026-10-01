"use client";

import { useEffect, useRef } from "react";
import {
  CandlestickSeries,
  ColorType,
  CrosshairMode,
  HistogramSeries,
  createChart,
  type IChartApi,
  type ISeriesApi,
  type UTCTimestamp,
} from "lightweight-charts";

import { hslTokenToRgba, toChartData, toLocalChartTime } from "@/lib/chart";
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

export default function PriceChart({
  candles,
  liveCandle,
  decimals,
  intraday,
}: {
  candles: Candle[];
  /** The still-open candle with the latest live price, if any. */
  liveCandle: Candle | null;
  /** Price precision, from lib/format's priceDecimals. */
  decimals: number;
  /** Show times on the axis (candles shorter than a day). */
  intraday: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const volumeRef = useRef<ISeriesApi<"Histogram"> | null>(null);
  const paletteRef = useRef<Palette | null>(null);
  const candlesRef = useRef<Candle[]>(candles);

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
      observer.disconnect();
      chartRef.current = null;
      candleRef.current = null;
      volumeRef.current = null;
      chart.remove();
    };
  }, []);

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
  }, [candles]);

  // Live tick: redraw just the open candle.
  useEffect(() => {
    if (!liveCandle || !candleRef.current) return;
    candleRef.current.update({
      time: asTime(liveCandle.time),
      open: liveCandle.open,
      high: liveCandle.high,
      low: liveCandle.low,
      close: liveCandle.close,
    });
  }, [liveCandle]);

  useEffect(() => {
    candleRef.current?.applyOptions({
      priceFormat: { type: "price", precision: decimals, minMove: 10 ** -decimals },
    });
    chartRef.current?.applyOptions({ timeScale: { timeVisible: intraday } });
  }, [decimals, intraday]);

  return <div ref={containerRef} className="size-full" />;
}
