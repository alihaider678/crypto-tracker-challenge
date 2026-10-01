import Link from "next/link";

import { ChangeBadge } from "@/components/market/change-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCompact, formatInteger } from "@/lib/format";
import type { OverviewData } from "@/lib/market";
import type { Ticker } from "@/lib/types";

/*
 * One bordered strip split into four cells (not four cards), so it reads as
 * a single summary line under the hero.
 */
const STRIP = "grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-border bg-border lg:grid-cols-4";
const CELL = "flex min-w-0 flex-col gap-2 bg-surface px-4 py-4 md:px-5";

export function SummaryStrip({ data }: { data: OverviewData }) {
  return (
    <section aria-label="Market summary">
      <dl className={STRIP}>
        <div className={CELL}>
          <dt className="text-xs text-muted-foreground">Pairs tracked</dt>
          <dd className="num text-xl font-semibold">{formatInteger(data.pairsTracked)}</dd>
        </div>
        <MoverCell label="Top gainer" ticker={data.topGainer} value="change" />
        <MoverCell label="Top loser" ticker={data.topLoser} value="change" />
        <MoverCell label="Highest volume" ticker={data.topVolume} value="volume" />
      </dl>
    </section>
  );
}

function MoverCell({
  label,
  ticker: t,
  value,
}: {
  label: string;
  ticker: Ticker | null;
  value: "change" | "volume";
}) {
  return (
    <div className={CELL}>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="min-w-0">
        {t ? (
          <Link
            href={`/coin/${t.symbol}`}
            prefetch={false}
            className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 rounded-sm outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <span className="truncate text-base font-semibold">{t.baseAsset}</span>
            {value === "change" ? (
              <ChangeBadge value={t.priceChangePercent} />
            ) : (
              <span className="num text-sm text-muted-foreground">
                {formatCompact(t.quoteVolume, { quote: t.quoteAsset })}
              </span>
            )}
          </Link>
        ) : (
          <span className="text-sm text-muted-foreground">None right now</span>
        )}
      </dd>
    </div>
  );
}

export function SummaryStripSkeleton() {
  return (
    <div className={STRIP} aria-hidden>
      {Array.from({ length: 4 }, (_, i) => (
        <div key={i} className={CELL}>
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-7 w-28" />
        </div>
      ))}
    </div>
  );
}
