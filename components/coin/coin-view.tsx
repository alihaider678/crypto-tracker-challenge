"use client";

import { Suspense } from "react";
import { notFound } from "next/navigation";
import { useQuery } from "@tanstack/react-query";

import { ErrorState } from "@/components/feedback/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { useLiveTickers } from "@/hooks/useLiveTickers";
import { allSymbolsQueryOptions, useCoinTicker, type InitialTicker } from "@/hooks/useTickers";
import { BinanceError } from "@/lib/binance";
import { isTradingHalted } from "@/lib/market";
import { reveal } from "@/lib/motion";
import { useWatchlistHydration } from "@/store/watchlist";

import { ChartSection } from "./chart-section";
import { CoinHeader } from "./coin-header";
import { HaltedBanner } from "./halted-banner";
import { StatsGrid } from "./stats-grid";

/**
 * Live part of /coin/[symbol]. Starts from the server-fetched ticker when
 * there is one; otherwise fetches on the client (e.g. the server couldn't
 * reach Binance).
 */
export function CoinView({
  symbol,
  initial,
}: {
  symbol: string;
  initial: InitialTicker | null;
}) {
  const query = useCoinTicker(symbol, initial);
  useLiveTickers();
  useWatchlistHydration();

  // In the browser an invalid symbol looks like a network error (Binance's
  // 4xx responses have no CORS header), so on failure check the symbol list.
  const known = useQuery({ ...allSymbolsQueryOptions(), enabled: query.isError });
  if (
    (query.error instanceof BinanceError && query.error.isInvalidSymbol) ||
    (query.isError && known.data && !known.data.has(symbol))
  ) {
    notFound();
  }

  const t = query.data;
  if (!t) {
    if (query.isError) {
      return (
        <ErrorState
          title="Couldn't load this pair"
          message={query.error instanceof Error ? query.error.message : undefined}
          onRetry={() => void query.refetch()}
          retrying={query.isFetching}
        />
      );
    }
    return <CoinSkeleton />;
  }

  const halted = isTradingHalted(t);

  return (
    <div className={`space-y-6 md:space-y-8 ${reveal}`}>
      <CoinHeader ticker={t} halted={halted} />
      {halted && <HaltedBanner lastTradeAt={t.updatedAt} />}
      {/* ChartSection reads ?tf= (useSearchParams). */}
      <Suspense fallback={<ChartFrameSkeleton />}>
        <ChartSection
          symbol={t.symbol}
          lastPrice={t.lastPrice}
          priceAt={t.updatedAt}
          halted={halted}
        />
      </Suspense>
      <StatsGrid ticker={t} halted={halted} />
    </div>
  );
}

function ChartFrameSkeleton() {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-8 w-52" />
      </div>
      <Skeleton className="h-80 rounded-xl md:h-[480px]" />
    </div>
  );
}

/** Same shape as the loaded page: header, chart, stats. */
export function CoinSkeleton() {
  return (
    <div className="space-y-6 md:space-y-8" aria-busy="true" aria-label="Loading">
      <div className="space-y-5">
        <Skeleton className="h-4 w-28" />
        <div className="flex items-center gap-3">
          <Skeleton className="size-10 rounded-full" />
          <div className="space-y-1.5">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-20" />
          </div>
        </div>
        <Skeleton className="h-9 w-56 md:h-12" />
      </div>
      <ChartFrameSkeleton />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="h-[66px] rounded-xl" />
        ))}
      </div>
    </div>
  );
}
