import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { ConnectionBadge } from "@/components/layout/connection-badge";
import { Button } from "@/components/ui/button";
import { formatInteger } from "@/lib/format";
import type { FeedStatus } from "@/lib/live-feed";

export function CtaBand({
  status,
  pairsTracked,
}: {
  status: FeedStatus;
  pairsTracked: number | null;
}) {
  return (
    <section
      aria-labelledby="cta-heading"
      className="flex flex-col gap-6 rounded-xl border border-border bg-surface p-6 md:flex-row md:items-center md:justify-between md:gap-10 md:p-10"
    >
      <div className="max-w-2xl space-y-3">
        <h2 id="cta-heading" className="text-xl font-semibold tracking-[-0.01em]">
          {pairsTracked
            ? `See all ${formatInteger(pairsTracked)} pairs`
            : "See every pair"}
        </h2>
        <p className="text-muted-foreground">
          Search, filter and sort the full market. Prices stream from Binance&apos;s
          public market data API.
        </p>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Data feed</span>
          <ConnectionBadge status={status} />
        </div>
      </div>
      <Button asChild size="lg" className="self-start md:self-center">
        <Link href="/markets">
          Explore markets
          <ArrowRight aria-hidden />
        </Link>
      </Button>
    </section>
  );
}
