"use client";

import Link from "next/link";
import { ArrowRight, PauseCircle } from "lucide-react";

import { ChangeBadge } from "@/components/market/change-badge";
import { CoinIcon } from "@/components/market/coin-identity";
import { PriceCell } from "@/components/market/price-cell";
import { RangeBar } from "@/components/market/range-bar";
import { Sparkline } from "@/components/market/sparkline";
import { FeaturedBadge, HaltedBadge } from "@/components/market/status-badges";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useSparkline } from "@/hooks/useKlines";
import { formatCompact, formatDate, formatInteger, formatPrice } from "@/lib/format";
import { PINNED_SYMBOL, changeDirection, isTradingHalted } from "@/lib/market";
import { isUsdQuote, pairLabel } from "@/lib/symbols";
import type { Ticker } from "@/lib/types";
import { cn } from "@/lib/utils";

// Teal edge and a soft teal glow: the one accent card on the page. When the
// card is stretched to two rows (lg), spare height is shared evenly between
// its four groups instead of pooling in one gap.
const CARD =
  "flex h-full flex-col gap-6 lg:justify-between rounded-xl border border-primary/40 bg-surface p-5 shadow-[0_0_48px_-20px_hsl(var(--primary)/0.45)] md:p-6";

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
  const quoteVolume = formatCompact(t.quoteVolume, { quote: t.quoteAsset });

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
          <p className="text-sm text-muted-foreground">{label}</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <PriceCell
          value={t.lastPrice}
          quote={t.quoteAsset}
          flash={!halted}
          muted={halted}
          className="text-2xl font-semibold tracking-[-0.02em] lg:text-3xl"
        />
        <ChangeBadge value={t.priceChangePercent} muted={halted} className="h-7 text-sm" />
      </div>

      <div className="space-y-4">
        {/* Live trend only while trading; a halted pair's candles are weeks old. */}
        {!halted && <FeaturedSparkline symbol={t.symbol} percent={t.priceChangePercent} />}
        <RangeBar
          low={t.lowPrice}
          high={t.highPrice}
          price={t.lastPrice}
          quote={t.quoteAsset}
          muted={halted}
        />
        {halted && (
          <p className="flex items-start gap-2 text-sm text-muted-foreground">
            <PauseCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
            <span>
              Trading halted. Last trade{" "}
              <time
                className="text-foreground tabular-nums"
                dateTime={new Date(t.updatedAt).toISOString()}
                suppressHydrationWarning
              >
                {formatDate(t.updatedAt)}
              </time>
              . Figures are from that trade, not live.
            </span>
          </p>
        )}
      </div>

      <div className="space-y-6">
        <dl className="grid grid-cols-2 gap-x-4 gap-y-4 border-t border-border pt-5">
          <Stat label={`24h Volume (${t.quoteAsset})`} muted={halted} mono>
            {isUsdQuote(t.quoteAsset) ? quoteVolume : `${quoteVolume} ${t.quoteAsset}`}
          </Stat>
          <Stat label={`24h Volume (${t.baseAsset})`} muted={halted} mono>
            {formatCompact(t.volume)} {t.baseAsset}
          </Stat>
          <Stat label="Open price (24h)" muted={halted} mono>
            {formatPrice(t.openPrice, { quote: t.quoteAsset })}
          </Stat>
          <Stat label="Trades (24h)" muted={halted}>
            {formatInteger(t.tradeCount)}
          </Stat>
        </dl>

        <Button asChild size="lg" className="self-start">
          <Link href={`/coin/${t.symbol}`}>
            View {label}
            <ArrowRight aria-hidden />
          </Link>
        </Button>
      </div>
    </section>
  );
}

function Stat({
  label,
  muted,
  mono = false,
  children,
}: {
  label: string;
  muted: boolean;
  /** Mono for prices and live amounts; counts use Inter with tabular figures. */
  mono?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="min-w-0">
      <dt className="truncate text-xs text-muted-foreground">{label}</dt>
      <dd
        className={cn(
          "mt-1 truncate text-sm",
          mono ? "num" : "tabular-nums",
          muted ? "text-muted-foreground" : "text-foreground",
        )}
      >
        {children}
      </dd>
    </div>
  );
}

function FeaturedSparkline({ symbol, percent }: { symbol: string; percent: number }) {
  const { data, isPending, isError } = useSparkline(symbol);
  return (
    <div className="relative h-24">
      {isError ? (
        <p className="absolute inset-0 flex items-center text-sm text-muted-foreground">
          Trend unavailable
        </p>
      ) : isPending || !data ? (
        <Skeleton className="absolute inset-0" />
      ) : (
        <div className="absolute inset-0" aria-label="Price over the last 24 hours" role="img">
          <Sparkline values={data} width={400} height={96} trend={changeDirection(percent)} fluid />
        </div>
      )}
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
      <Skeleton className="h-10 w-56 lg:h-12" />
      <div className="space-y-4">
        <Skeleton className="h-[62px]" />
        <Skeleton className="h-5 w-3/4" />
      </div>
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-4 border-t border-border pt-5">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-9" />
          ))}
        </div>
        <Skeleton className="h-9 w-40" />
      </div>
    </div>
  );
}
