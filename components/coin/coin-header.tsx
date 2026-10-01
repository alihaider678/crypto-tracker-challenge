import Link from "next/link";

import { ChangeBadge } from "@/components/market/change-badge";
import { CoinIcon } from "@/components/market/coin-identity";
import { PriceCell } from "@/components/market/price-cell";
import { StarButton } from "@/components/market/star-button";
import { FeaturedBadge, HaltedBadge } from "@/components/market/status-badges";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { formatPrice, priceDecimals } from "@/lib/format";
import { PINNED_SYMBOL } from "@/lib/market";
import { pairLabel } from "@/lib/symbols";
import type { Ticker } from "@/lib/types";
import { cn } from "@/lib/utils";

export function CoinHeader({ ticker: t, halted }: { ticker: Ticker; halted: boolean }) {
  const label = pairLabel(t);
  const change = t.priceChange;

  return (
    <header className="space-y-5">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/markets">Markets</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{t.baseAsset}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex items-start gap-3">
        <CoinIcon key={t.baseAsset} baseAsset={t.baseAsset} size={40} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <h1 className="text-lg font-semibold tracking-[-0.01em]">{t.name}</h1>
            {t.symbol === PINNED_SYMBOL && <FeaturedBadge />}
            {halted && <HaltedBadge />}
          </div>
          <p className="text-sm text-muted-foreground">{label}</p>
        </div>
        <StarButton symbol={t.symbol} label={label} />
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
        <span
          className={cn(
            "num text-sm text-muted-foreground",
            !Number.isFinite(change) && "hidden",
          )}
        >
          {change > 0 ? "+" : ""}
          {formatPrice(change, {
            quote: t.quoteAsset,
            // the price's precision, not the (smaller) change's own
            decimals: priceDecimals(t.lastPrice),
          })}{" "}
          {halted ? "at last trade" : "24h"}
        </span>
      </div>
    </header>
  );
}
