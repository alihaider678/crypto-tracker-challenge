"use client";

import { useMemo } from "react";
import { SearchX } from "lucide-react";

import { EmptyState } from "@/components/feedback/empty-state";
import { ErrorState } from "@/components/feedback/error-state";
import { TableSkeleton } from "@/components/feedback/table-skeleton";
import { Button } from "@/components/ui/button";
import { useLiveTickers } from "@/hooks/useLiveTickers";
import { useMarketParams } from "@/hooks/useMarketParams";
import { useThrottledOrder } from "@/hooks/useThrottledOrder";
import { useTickers } from "@/hooks/useTickers";
import {
  PRIMARY_QUOTES,
  groupQuotes,
  paginate,
  selectMarketView,
} from "@/lib/market";
import {
  clearMarketFilters,
  hasActiveFilters,
  updateMarketParams,
} from "@/lib/market-params";
import { reveal } from "@/lib/motion";
import { useWatchlistHydration } from "@/store/watchlist";

import { LiveStatusNotice } from "./live-status-notice";
import { MarketPagination } from "./market-pagination";
import { MarketTable } from "./market-table";
import { MarketToolbar } from "./market-toolbar";

// Before data arrives, show the usual pills so the toolbar doesn't jump.
const PLACEHOLDER_QUOTES = {
  primary: PRIMARY_QUOTES.map((quote) => ({ quote, count: 0 })),
  more: [],
};

export function MarketsView() {
  const { params, setParams, navigate, hrefFor } = useMarketParams();
  const tickers = useTickers();
  const status = useLiveTickers();
  useWatchlistHydration();

  const data = tickers.data;
  // Live ticks replace `data` every second but never change which quotes
  // exist; key the pills on that so the memoized toolbar can skip renders.
  const quoteKey = useMemo(() => data?.map((t) => t.quoteAsset).join(",") ?? "", [data]);
  const quotes = useMemo(
    () =>
      quoteKey
        ? groupQuotes(quoteKey.split(",").map((quoteAsset) => ({ quoteAsset })))
        : PLACEHOLDER_QUOTES,
    [quoteKey],
  );
  const view = useMemo(
    () =>
      data
        ? selectMarketView(data, {
            query: params.q,
            quote: params.quote,
            direction: params.dir,
            sort: params.sort,
          })
        : [],
    [data, params.q, params.quote, params.dir, params.sort],
  );
  // Sorting by 24h % or price would reshuffle rows every second; hold the
  // order for ~5s while values keep ticking.
  const ordered = useThrottledOrder(view, {
    enabled: params.sort.startsWith("change_") || params.sort.startsWith("price_"),
    resetKey: [params.q, params.quote, params.dir, params.sort].join("|"),
  });
  const page = paginate(ordered, params.page);

  let body: React.ReactNode;
  if (!data && tickers.isError) {
    body = (
      <ErrorState
        message={
          tickers.error instanceof Error ? tickers.error.message : undefined
        }
        onRetry={() => void tickers.refetch()}
        retrying={tickers.isFetching}
      />
    );
  } else if (!data) {
    body = <TableSkeleton rows={12} />;
  } else if (view.length === 0) {
    body = (
      <EmptyState
        icon={SearchX}
        title="No coins match your search"
        description={
          params.q
            ? `Nothing matches “${params.q}” with the current filters.`
            : "No pairs match the current filters."
        }
        action={
          hasActiveFilters(params) && (
            <Button variant="outline" onClick={() => navigate(clearMarketFilters(params))}>
              Clear filters
            </Button>
          )
        }
      />
    );
  } else {
    body = (
      <div className={`space-y-4 ${reveal}`}>
        <MarketTable
          rows={page.items}
          firstRank={page.from}
          sort={params.sort}
          onSort={(sort) => setParams({ sort })}
        />
        <MarketPagination
          {...page}
          hrefForPage={(p) => hrefFor(updateMarketParams(params, { page: p }))}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <MarketToolbar params={params} quotes={quotes} onChange={setParams} />
      {data && (
        <LiveStatusNotice status={status} lastUpdatedAt={tickers.dataUpdatedAt} />
      )}
      {body}
    </div>
  );
}
