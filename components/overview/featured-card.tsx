"use client";

import Link from "next/link";
import { ArrowRight, PauseCircle } from "lucide-react";

import { ChangeBadge } from "@/components/market/change-badge";
import { CoinIcon } from "@/components/market/coin-identity";
import { PriceCell } from "@/components/market/price-cell";
import { Sparkline } from "@/components/market/sparkline";
import { FeaturedBadge, HaltedBadge } from "@/components/market/status-badges";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useSparkline } from "@/hooks/useKlines";
import { formatDate, formatPrice } from "@/lib/format";
import { PINNED_SYMBOL, changeDirection, isTradingHalted } from "@/lib/market";
import { pairLabel } from "@/lib/symbols";
import type { Ticker } from "@/lib/types";

// Teal edge and a soft teal glow: the one accent card on the page.
const CARD =
  "flex h-full flex-col gap-6 rounded-xl border border-primary/40 bg-surface p-5 shadow-[0_0_48px_-20px_hsl(var(--primary)/0.45)] md:p-6";

export function FeaturedCard({ ticker }: { ticker: Ticker | null }) {
  if (!ticker) {
    return (
      <section aria-label="Featured pair" className={CARD}>
        <FeaturedBadge className="self-start" />
        <p className="text-sm text-muted-foreground">
          {PINNED_SYMBOL.replace("USDT", "/USDT")} isn&apos;t listed on Binance right now.
        </p>
      </section>
    );
  }

  const t = ticker;
  const halted = isTradingHalted(t);
  const label = pairLabel(t);

  return (
    <section aria-labelledby="featured-name" className={CARD}>
      <div className="flex items-start gap-3">
        <CoinIcon key={t.baseAsset} baseAsset={t.baseAsset} size={48} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 id="featured-name" className="text-lg font-semibold">
              {t.name}
            </h2>
            <FeaturedBadge />
            {halted && <HaltedBadge />}
          </div>
          <p className="num text-sm text-muted-foreground">{label}</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <PriceCell
          value={t.lastPrice}
          quote={t.quoteAsset}
          flash={!halted}
          muted={halted}
          className="text-xl font-semibold tracking-[-0.02em] md:text-2xl"
        />
        <ChangeBadge value={t.priceChangePercent} muted={halted} className="h-7 text-sm" />
      </div>

      {/* Fills the card's spare height (it spans two rows on desktop). */}
      <div className="relative min-h-36 flex-1 rounded-lg border border-border bg-background/40">
        {halted ? (
          <div className="absolute inset-0 flex flex-col items-start justify-center gap-1 p-4">
            <p className="flex items-center gap-2 text-sm font-medium">
              <PauseCircle className="size-4 text-muted-foreground" aria-hidden />
              No recent trades
            </p>
            <p className="text-sm text-muted-foreground">
              Trading is halted. Last trade{" "}
              <time
                className="num text-foreground"
                dateTime={new Date(t.updatedAt).toISOString()}
                suppressHydrationWarning
              >
                {formatDate(t.updatedAt)}
              </time>
              . Figures below are from that trade, not live.
            </p>
          </div>
        ) : (
          <FeaturedSparkline symbol={t.symbol} percent={t.priceChangePercent} />
        )}
      </div>

      <dl className="grid grid-cols-2 gap-4">
        <div>
          <dt className="text-xs text-muted-foreground">24h High</dt>
          <dd className="num mt-1 text-sm">{formatPrice(t.highPrice, { quote: t.quoteAsset })}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">24h Low</dt>
          <dd className="num mt-1 text-sm">{formatPrice(t.lowPrice, { quote: t.quoteAsset })}</dd>
        </div>
      </dl>

      <Button asChild size="lg" className="self-start">
        <Link href={`/coin/${t.symbol}`}>
          View {label}
          <ArrowRight aria-hidden />
        </Link>
      </Button>
    </section>
  );
}

function FeaturedSparkline({ symbol, percent }: { symbol: string; percent: number }) {
  const { data, isPending, isError } = useSparkline(symbol);
  if (isError) {
    return (
      <p className="absolute inset-0 flex items-center p-4 text-sm text-muted-foreground">
        Trend unavailable
      </p>
    );
  }
  if (isPending || !data) return <Skeleton className="absolute inset-0" />;
  return (
    <div className="absolute inset-3" aria-label="Price over the last 24 hours" role="img">
      <Sparkline values={data} width={400} height={120} trend={changeDirection(percent)} fluid />
    </div>
  );
}

export function FeaturedCardSkeleton() {
  return (
    <div className={CARD} aria-hidden>
      <div className="flex items-start gap-3">
        <Skeleton className="size-12 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-24" />
        </div>
      </div>
      <Skeleton className="h-9 w-56 md:h-12" />
      <Skeleton className="min-h-36 flex-1" />
      <div className="grid grid-cols-2 gap-4">
        <Skeleton className="h-9" />
        <Skeleton className="h-9" />
      </div>
      <Skeleton className="h-9 w-40" />
    </div>
  );
}
