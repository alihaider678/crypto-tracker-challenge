"use client";

import { useMemo } from "react";
import { BarChart3, TrendingDown, TrendingUp } from "lucide-react";

import { ErrorState } from "@/components/feedback/error-state";
import { LiveStatusNotice } from "@/components/market/live-status-notice";
import { useLiveTickers } from "@/hooks/useLiveTickers";
import { useTickers } from "@/hooks/useTickers";
import { PINNED_SYMBOL, overviewData, pickBySymbol } from "@/lib/market";
import { reveal } from "@/lib/motion";
import { cn } from "@/lib/utils";

import { CtaBand } from "./cta-band";
import { FeaturedCard, FeaturedCardSkeleton } from "./featured-card";
import {
  MoversCard,
  MoversCardSkeleton,
  VolumeCard,
  VolumeCardSkeleton,
} from "./movers-card";
import { SummaryStrip, SummaryStripSkeleton } from "./summary-strip";

/*
 * Bento: the featured card spans two rows on the left and clearly outranks
 * the gainers/losers lists stacked on the right; highest volume runs as a
 * full-width strip underneath.
 */
// grid-cols-1 = minmax(0, 1fr): without it the mobile column grows to fit
// its widest content (a long coin name) and the page scrolls sideways.
const BENTO = "grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-12";
const AREA = {
  featured: "md:col-span-2 lg:col-span-7 lg:row-span-2",
  gainers: "lg:col-span-5",
  losers: "lg:col-span-5",
  volume: "md:col-span-2 lg:col-span-12",
};

export function OverviewSections() {
  const tickers = useTickers();
  const status = useLiveTickers();
  const data = tickers.data;

  const overview = useMemo(() => (data ? overviewData(data) : null), [data]);
  const featured = useMemo(
    () => (data ? pickBySymbol(data, [PINNED_SYMBOL])[0] : null),
    [data],
  );

  let body: React.ReactNode;
  if (!data && tickers.isError) {
    body = (
      <ErrorState
        message={tickers.error instanceof Error ? tickers.error.message : undefined}
        onRetry={() => void tickers.refetch()}
        retrying={tickers.isFetching}
      />
    );
  } else {
    body = (
      <>
        <div className="space-y-4">
          {data && (
            <LiveStatusNotice status={status} lastUpdatedAt={tickers.dataUpdatedAt} />
          )}
          {overview ? (
            <div className={reveal}>
              <SummaryStrip data={overview} />
            </div>
          ) : (
            <SummaryStripSkeleton />
          )}
        </div>

        <section aria-labelledby="today-heading" className="space-y-5">
          <div className="space-y-1">
            <h2 id="today-heading" className="text-xl font-semibold tracking-[-0.01em]">
              Today&apos;s market
            </h2>
            <p className="text-sm text-muted-foreground">
              24h movement across USDT pairs. Halted pairs and stablecoin pairs are left out.
            </p>
          </div>
          <div className={BENTO}>
            <div className={cn(AREA.featured, data && reveal)}>
              {data ? <FeaturedCard ticker={featured} /> : <FeaturedCardSkeleton />}
            </div>
            <div className={cn(AREA.gainers, overview && reveal)}>
              {overview ? (
                <MoversCard
                  title="Top gainers"
                  icon={TrendingUp}
                  tickers={overview.movers.gainers}
                  emptyText="No USDT pair is up over the last 24h."
                />
              ) : (
                <MoversCardSkeleton />
              )}
            </div>
            <div className={cn(AREA.losers, overview && reveal)}>
              {overview ? (
                <MoversCard
                  title="Top losers"
                  icon={TrendingDown}
                  tickers={overview.movers.losers}
                  emptyText="No USDT pair is down over the last 24h."
                />
              ) : (
                <MoversCardSkeleton />
              )}
            </div>
            <div className={cn(AREA.volume, overview && reveal)}>
              {overview ? (
                <VolumeCard icon={BarChart3} tickers={overview.movers.volume} />
              ) : (
                <VolumeCardSkeleton />
              )}
            </div>
          </div>
        </section>
      </>
    );
  }

  return (
    <div className="space-y-10 md:space-y-16 lg:space-y-24">
      {body}
      <CtaBand status={status} pairsTracked={overview?.pairsTracked ?? null} />
    </div>
  );
}
