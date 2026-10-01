"use client";

import { memo } from "react";
import Link from "next/link";

import { ChangeBadge } from "@/components/market/change-badge";
import { CoinIcon } from "@/components/market/coin-identity";
import { PriceCell } from "@/components/market/price-cell";
import { HaltedBadge } from "@/components/market/status-badges";
import { Skeleton } from "@/components/ui/skeleton";
import { useTickers } from "@/hooks/useTickers";
import { isTradingHalted, pickBySymbol } from "@/lib/market";
import { pairLabel } from "@/lib/symbols";
import type { Ticker } from "@/lib/types";

export const MINI_TICKER_SYMBOLS = ["BTCUSDT", "ETHUSDT", "BNBUSDT", "VANRYUSDT"] as const;

/** Hero side panel: four headline pairs, live. */
export function MiniTicker() {
  const { data, isError } = useTickers();

  return (
    <section
      aria-label="Live prices"
      className="overflow-hidden rounded-xl border border-border bg-surface"
    >
      <ul className="divide-y divide-border">
        {data
          ? pickBySymbol(data, MINI_TICKER_SYMBOLS).map((t, i) =>
              t ? (
                <MiniTickerRow key={t.symbol} ticker={t} />
              ) : (
                <li
                  key={MINI_TICKER_SYMBOLS[i]}
                  className="flex h-14 items-center px-4 text-sm text-muted-foreground"
                >
                  {MINI_TICKER_SYMBOLS[i]} is not listed
                </li>
              ),
            )
          : MINI_TICKER_SYMBOLS.map((s) => (
              <li key={s} className="flex h-14 items-center gap-3 px-4">
                <Skeleton className="size-7 rounded-full" />
                <Skeleton className="h-3.5 w-12" />
                <span className="flex-1" />
                {isError ? (
                  <span className="text-xs text-muted-foreground">Unavailable</span>
                ) : (
                  <>
                    <Skeleton className="h-3.5 w-20" />
                    <Skeleton className="h-6 w-[84px] rounded-full" />
                  </>
                )}
              </li>
            ))}
      </ul>
    </section>
  );
}

const MiniTickerRow = memo(function MiniTickerRow({ ticker: t }: { ticker: Ticker }) {
  const halted = isTradingHalted(t);
  return (
    <li>
      <Link
        href={`/coin/${t.symbol}`}
        prefetch={false}
        aria-label={`${t.name}, ${pairLabel(t)}${halted ? ", trading halted" : ""}`}
        className="flex h-14 items-center gap-3 px-4 transition-colors outline-none hover:bg-elevated/60 focus-visible:bg-elevated focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:ring-inset"
      >
        <CoinIcon key={t.baseAsset} baseAsset={t.baseAsset} size={28} />
        <span className="font-medium">{t.baseAsset}</span>
        <span className="flex-1" />
        <PriceCell
          value={t.lastPrice}
          quote={t.quoteAsset}
          flash={!halted}
          muted={halted}
          className="text-sm"
        />
        {/* A halted pair's 24h change is frozen; say "Halted" in its place. */}
        {halted ? (
          <HaltedBadge short className="h-6 w-[84px] justify-center" />
        ) : (
          <ChangeBadge value={t.priceChangePercent} className="w-[84px] justify-center" />
        )}
      </Link>
    </li>
  );
});
