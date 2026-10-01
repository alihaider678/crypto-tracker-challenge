import { memo } from "react";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";

import { ChangeBadge } from "@/components/market/change-badge";
import { CoinIdentity } from "@/components/market/coin-identity";
import { PriceCell } from "@/components/market/price-cell";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCompact } from "@/lib/format";
import { pairLabel } from "@/lib/symbols";
import type { Ticker } from "@/lib/types";
import { cn } from "@/lib/utils";

const ROW_COUNT = 5;

/** Card shell shared by the movers lists. */
function MoversShell({
  title,
  icon: Icon,
  caption,
  className,
  children,
}: {
  title: string;
  icon: LucideIcon;
  caption: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      aria-label={title}
      className={cn("flex flex-col rounded-xl border border-border bg-surface", className)}
    >
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <Icon className="size-4 text-muted-foreground" aria-hidden />
          {title}
        </h2>
        <span className="text-xs text-muted-foreground">{caption}</span>
      </div>
      {children}
    </section>
  );
}

/** Top gainers / top losers: identity, live price, 24h change. */
export function MoversCard({
  title,
  icon,
  tickers,
  emptyText,
}: {
  title: string;
  icon: LucideIcon;
  tickers: Ticker[];
  emptyText: string;
}) {
  return (
    <MoversShell title={title} icon={icon} caption="USDT pairs · 24h">
      {tickers.length === 0 ? (
        <p className="flex flex-1 items-center px-4 py-8 text-sm text-muted-foreground">
          {emptyText}
        </p>
      ) : (
        <ol className="divide-y divide-border">
          {tickers.map((t, i) => (
            <MoverRow key={t.symbol} ticker={t} rank={i + 1} />
          ))}
        </ol>
      )}
    </MoversShell>
  );
}

/** Memoized: live merges keep unchanged tickers' identity. */
const MoverRow = memo(function MoverRow({ ticker: t, rank }: { ticker: Ticker; rank: number }) {
  return (
    <li>
      <Link
        href={`/coin/${t.symbol}`}
        prefetch={false}
        aria-label={`${t.name}, ${pairLabel(t)}`}
        className="flex h-[52px] items-center gap-3 px-4 transition-colors outline-none hover:bg-elevated/60 focus-visible:bg-elevated focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:ring-inset"
      >
        <span className="num w-4 shrink-0 text-xs text-muted-foreground">{rank}</span>
        <div className="min-w-0 flex-1">
          <CoinIdentity baseAsset={t.baseAsset} quoteAsset={t.quoteAsset} name={t.name} />
        </div>
        <PriceCell value={t.lastPrice} quote={t.quoteAsset} className="text-sm" />
        <ChangeBadge value={t.priceChangePercent} className="w-[84px] justify-center" />
      </Link>
    </li>
  );
});

/**
 * Highest volume, laid out as a horizontal strip of five on wide screens so
 * it reads differently from the two lists above it.
 */
export function VolumeCard({ icon, tickers }: { icon: LucideIcon; tickers: Ticker[] }) {
  return (
    <MoversShell title="Highest volume" icon={icon} caption="USDT pairs · 24h quote volume">
      {/* 1px gaps over a border-colored background draw the dividers. */}
      <ol className="grid gap-px overflow-hidden rounded-b-xl bg-border sm:grid-cols-2 lg:grid-cols-5">
        {tickers.map((t, i) => (
          <VolumeTile key={t.symbol} ticker={t} rank={i + 1} />
        ))}
      </ol>
    </MoversShell>
  );
}

/** A compact row on phones, a tile from sm up. */
const VolumeTile = memo(function VolumeTile({ ticker: t, rank }: { ticker: Ticker; rank: number }) {
  return (
    <li className="min-w-0 bg-surface sm:last:col-span-2 lg:last:col-span-1">
      <Link
        href={`/coin/${t.symbol}`}
        prefetch={false}
        aria-label={`${t.name}, ${pairLabel(t)}`}
        className="flex h-full items-center justify-between gap-3 px-4 py-3 transition-colors outline-none hover:bg-elevated/60 focus-visible:bg-elevated focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:ring-inset sm:flex-col sm:items-stretch sm:justify-start sm:py-4"
      >
        <div className="flex min-w-0 items-center gap-2">
          <span className="num text-xs text-muted-foreground">{rank}</span>
          <div className="min-w-0 flex-1">
            <CoinIdentity baseAsset={t.baseAsset} quoteAsset={t.quoteAsset} name={t.name} />
          </div>
        </div>
        <div className="shrink-0 text-right sm:text-left">
          <p className="num text-base font-semibold sm:text-lg">
            {formatCompact(t.quoteVolume, { quote: t.quoteAsset })}
          </p>
          <div className="mt-1 flex flex-wrap items-center justify-end gap-2 sm:justify-start">
            <span className="hidden sm:contents">
              <PriceCell value={t.lastPrice} quote={t.quoteAsset} className="text-sm" />
            </span>
            <ChangeBadge value={t.priceChangePercent} />
          </div>
        </div>
      </Link>
    </li>
  );
});

// --- Skeletons (same boxes as the real cards) -------------------------------

export function MoversCardSkeleton() {
  return (
    <div className="rounded-xl border border-border bg-surface">
      <div className="flex h-[45px] items-center justify-between border-b border-border px-4">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-3 w-20" />
      </div>
      <div className="divide-y divide-border">
        {Array.from({ length: ROW_COUNT }, (_, i) => (
          <div key={i} className="flex h-[52px] items-center gap-3 px-4">
            <Skeleton className="h-3 w-3" />
            <Skeleton className="size-8 rounded-full" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-3.5 w-20" />
              <Skeleton className="h-3 w-14" />
            </div>
            <Skeleton className="h-3.5 w-16" />
            <Skeleton className="h-6 w-[84px] rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function VolumeCardSkeleton() {
  return (
    <div className="rounded-xl border border-border bg-surface">
      <div className="flex h-[45px] items-center justify-between border-b border-border px-4">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-3 w-32" />
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-5">
        {Array.from({ length: ROW_COUNT }, (_, i) => (
          <div key={i} className="flex items-center justify-between gap-3 px-4 py-3 sm:block sm:space-y-3 sm:py-4">
            <div className="flex items-center gap-2">
              <Skeleton className="size-8 rounded-full" />
              <div className="space-y-1.5">
                <Skeleton className="h-3.5 w-20" />
                <Skeleton className="h-3 w-14" />
              </div>
            </div>
            <div className="space-y-1.5 sm:space-y-3">
              <Skeleton className="ml-auto h-5 w-20 sm:ml-0 sm:h-6 sm:w-24" />
              <Skeleton className="ml-auto h-6 w-16 sm:ml-0 sm:h-5 sm:w-32" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
