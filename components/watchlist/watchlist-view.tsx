"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useQueries, useQuery } from "@tanstack/react-query";
import { Star, Trash2 } from "lucide-react";

import { EmptyState } from "@/components/feedback/empty-state";
import { ErrorState } from "@/components/feedback/error-state";
import { TableSkeleton } from "@/components/feedback/table-skeleton";
import { LiveStatusNotice } from "@/components/market/live-status-notice";
import { MarketTable } from "@/components/market/market-table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { useLiveTickers } from "@/hooks/useLiveTickers";
import { useMarketParams } from "@/hooks/useMarketParams";
import { allSymbolsQueryOptions, coinTickerQueryOptions, useTickers } from "@/hooks/useTickers";
import { sortTickers } from "@/lib/market";
import { reveal } from "@/lib/motion";
import type { Ticker } from "@/lib/types";
import { missingSymbols, resolveWatchlist, splitMissing } from "@/lib/watchlist";
import { useWatchlist, useWatchlistHydration } from "@/store/watchlist";

/**
 * Starred pairs in the Markets table, with the same live prices and sort.
 * Pairs missing from the listed snapshot (halted, no trades) are fetched one
 * by one and shown halted; pairs Binance no longer lists are shown below
 * with a Remove button. Nothing starred is dropped silently.
 */
export function WatchlistView() {
  const hydrated = useWatchlistHydration();
  const symbols = useWatchlist((s) => s.symbols);
  const remove = useWatchlist((s) => s.remove);
  const clear = useWatchlist((s) => s.clear);
  const { params, setParams } = useMarketParams();
  const tickers = useTickers();
  const status = useLiveTickers();

  const data = tickers.data;
  const missing = useMemo(() => (data ? missingSymbols(symbols, data) : []), [data, symbols]);

  // Which off-snapshot stars does Binance know at all? The browser can't
  // read Binance's "invalid symbol" errors (no CORS on 4xx), so ask first.
  const known = useQuery({ ...allSymbolsQueryOptions(), enabled: missing.length > 0 });
  const split = useMemo(() => splitMissing(missing, known.data), [missing, known.data]);

  // One small request per known off-snapshot pair; live ticks merge in too.
  const extras = useQueries({
    queries: split.fetch.map((s) => coinTickerQueryOptions(s)),
    combine: (results) => {
      const map = new Map<string, Ticker | null>(split.unknown.map((s) => [s, null]));
      results.forEach((r, i) => {
        if (r.data) map.set(split.fetch[i], r.data);
      });
      return map;
    },
  });

  const resolved = useMemo(
    () => resolveWatchlist(symbols, data ?? [], extras),
    [symbols, data, extras],
  );
  const rows = useMemo(() => sortTickers(resolved.rows, params.sort), [resolved.rows, params.sort]);

  if (!hydrated) {
    return <TableSkeleton rows={5} />;
  }

  if (symbols.length === 0) {
    return (
      <EmptyState
        icon={Star}
        title="Your watchlist is empty"
        description="Star a pair in Markets and it shows up here, with live prices."
        action={
          <Button asChild>
            <Link href="/markets">Browse markets</Link>
          </Button>
        }
      />
    );
  }

  if (!data && tickers.isError) {
    return (
      <ErrorState
        message={tickers.error instanceof Error ? tickers.error.message : undefined}
        onRetry={() => void tickers.refetch()}
        retrying={tickers.isFetching}
      />
    );
  }

  if (!data) {
    return <TableSkeleton rows={Math.min(symbols.length, 10)} />;
  }

  return (
    <div className={`space-y-4 ${reveal}`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          <span className="text-foreground tabular-nums">{symbols.length}</span>{" "}
          {symbols.length === 1 ? "pair" : "pairs"} starred
          {resolved.pending.length > 0 && (
            <span>
              {" "}
              · loading <span className="tabular-nums">{resolved.pending.length}</span> more
            </span>
          )}
        </p>
        <ClearAllButton count={symbols.length} onConfirm={clear} />
      </div>

      <LiveStatusNotice status={status} lastUpdatedAt={tickers.dataUpdatedAt} />

      {rows.length > 0 && (
        <MarketTable
          label="Watchlist"
          rows={rows}
          firstRank={1}
          sort={params.sort}
          onSort={(sort) => setParams({ sort })}
        />
      )}

      {resolved.unavailable.length > 0 && (
        <section
          aria-labelledby="unavailable-heading"
          className="rounded-xl border border-border bg-surface"
        >
          <div className="border-b border-border px-4 py-3">
            <h2 id="unavailable-heading" className="text-sm font-semibold">
              No longer listed on Binance
            </h2>
            <p className="text-xs text-muted-foreground">
              These starred pairs have no market data any more.
            </p>
          </div>
          <ul className="divide-y divide-border">
            {resolved.unavailable.map((s) => (
              <li key={s} className="flex h-12 items-center justify-between gap-3 px-4">
                <span className="text-sm">{s}</span>
                <Button variant="ghost" size="sm" onClick={() => remove(s)}>
                  Remove
                </Button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function ClearAllButton({ count, onConfirm }: { count: number; onConfirm: () => void }) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Trash2 aria-hidden />
          Clear all
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Clear your watchlist?</AlertDialogTitle>
          <AlertDialogDescription>
            This removes all {count} starred {count === 1 ? "pair" : "pairs"} from this
            browser. You can star them again from Markets.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={onConfirm}>
            Clear all
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
