"use client";

import { useCallback, useMemo } from "react";
import dynamic from "next/dynamic";
import { usePathname, useSearchParams } from "next/navigation";
import { CandlestickChart, PauseCircle } from "lucide-react";

import { EmptyState } from "@/components/feedback/empty-state";
import { ErrorState } from "@/components/feedback/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useKlines } from "@/hooks/useKlines";
import { TIMEFRAMES, TIMEFRAME_CONFIG, type Timeframe } from "@/lib/binance";
import {
  DEFAULT_TIMEFRAME,
  applyLivePrice,
  chartNote,
  parseTimeframe,
} from "@/lib/chart";
import { formatDate, formatTime, priceDecimals } from "@/lib/format";

/** Same box for every state, so switching states never shifts the page. */
const FRAME = "relative h-80 overflow-hidden rounded-xl border border-border bg-surface md:h-[480px]";

const PriceChart = dynamic(() => import("./price-chart"), {
  ssr: false,
  loading: () => <Skeleton className="size-full rounded-none" />,
});

const TIMEFRAME_LABELS: Record<Timeframe, string> = {
  "1H": "1 hour",
  "4H": "4 hours",
  "1D": "1 day",
  "1W": "1 week",
  "1M": "1 month",
};

/** Candles + volume with timeframe tabs. The timeframe lives in ?tf=. */
export function ChartSection({
  symbol,
  lastPrice,
  priceAt,
  halted,
}: {
  symbol: string;
  lastPrice: number;
  /** When lastPrice was set (ms); the clock for live-candle and staleness checks. */
  priceAt: number;
  halted: boolean;
}) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const timeframe = parseTimeframe(searchParams.get("tf"));

  const setTimeframe = useCallback(
    (tf: Timeframe) => {
      const params = new URLSearchParams(searchParams.toString());
      if (tf === DEFAULT_TIMEFRAME) params.delete("tf");
      else params.set("tf", tf);
      const qs = params.toString();
      // History API instead of router.replace: Next keeps useSearchParams in
      // sync without a server round trip for this dynamic page.
      window.history.replaceState(null, "", qs ? `${pathname}?${qs}` : pathname);
    },
    [pathname, searchParams],
  );

  return (
    <section aria-labelledby="chart-heading" className="space-y-3">
      <Tabs
        value={timeframe}
        onValueChange={(v) => setTimeframe(v as Timeframe)}
        className="gap-3"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="chart-heading" className="text-base font-semibold">
            Price chart
          </h2>
          <TabsList aria-label="Timeframe" className="bg-surface">
            {TIMEFRAMES.map((tf) => (
              <TabsTrigger
                key={tf}
                value={tf}
                aria-label={TIMEFRAME_LABELS[tf]}
                className="px-3 text-xs tabular-nums hover:bg-elevated/60 active:bg-border/60 data-active:bg-elevated"
              >
                {tf}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
        <TabsContent value={timeframe}>
          <ChartBody
            symbol={symbol}
            timeframe={timeframe}
            lastPrice={lastPrice}
            priceAt={priceAt}
            halted={halted}
          />
        </TabsContent>
      </Tabs>
    </section>
  );
}

function ChartBody({
  symbol,
  timeframe,
  lastPrice,
  priceAt,
  halted,
}: {
  symbol: string;
  timeframe: Timeframe;
  lastPrice: number;
  priceAt: number;
  halted: boolean;
}) {
  const { data, isPending, isError, error, refetch, isFetching } = useKlines(
    symbol,
    timeframe,
  );
  const interval = TIMEFRAME_CONFIG[timeframe].interval;

  // Live ticks redraw the open candle; halted pairs have none.
  const liveCandle = useMemo(
    () => (data && !halted ? applyLivePrice(data, lastPrice, priceAt) : null),
    [data, halted, lastPrice, priceAt],
  );
  const note = useMemo(
    () => (data ? chartNote({ candles: data, halted, now: priceAt }) : null),
    [data, halted, priceAt],
  );
  const decimals = priceDecimals(data?.at(-1)?.close ?? lastPrice);

  if (isPending) {
    return (
      <div className={FRAME} aria-busy="true" aria-label="Loading chart">
        <Skeleton className="size-full rounded-none" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className={FRAME}>
        <ErrorState
          title="Couldn't load the chart"
          message={error instanceof Error ? error.message : undefined}
          onRetry={() => void refetch()}
          retrying={isFetching}
          className="h-full justify-center rounded-none border-0"
        />
      </div>
    );
  }

  if (note?.kind === "empty") {
    return (
      <div className={FRAME}>
        <EmptyState
          icon={CandlestickChart}
          title="No candles for this timeframe"
          description="Binance has no trades for this pair in the selected period."
          className="h-full justify-center rounded-none border-0"
        />
      </div>
    );
  }

  return (
    <div className={FRAME}>
      <PriceChart
        candles={data}
        liveCandle={liveCandle}
        decimals={decimals}
        intraday={interval !== "1d" && interval !== "1w"}
      />
      {note?.kind === "no-recent-trades" && (
        <div
          role="note"
          className="pointer-events-none absolute top-3 left-3 z-10 flex max-w-[calc(100%-5rem)] items-center gap-2 rounded-lg border border-border bg-elevated/95 px-3 py-2 text-xs"
        >
          <PauseCircle className="size-4 shrink-0 text-muted-foreground" aria-hidden />
          <span>
            <span className="font-medium">No recent trades.</span>{" "}
            <span className="text-muted-foreground">
              Last candle:{" "}
              <time className="tabular-nums" dateTime={new Date(note.lastCandleAt).toISOString()}>
                {formatDate(note.lastCandleAt)}, {formatTime(note.lastCandleAt).slice(0, 5)}
              </time>
            </span>
          </span>
        </div>
      )}
    </div>
  );
}
