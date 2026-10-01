import { Suspense } from "react";
import type { Metadata } from "next";

import { TableSkeleton } from "@/components/feedback/table-skeleton";
import { PageHeader } from "@/components/layout/page-header";
import { MarketsView } from "@/components/market/markets-view";

export const metadata: Metadata = {
  title: "Markets",
  description:
    "Every Binance spot pair with live price, 24h change and volume.",
};

export default function MarketsPage() {
  return (
    <section className="container-page space-y-6 py-10 md:space-y-8 md:py-16">
      <PageHeader
        title="Markets"
        description="Every Binance spot pair with live price, 24h change and volume."
      />
      {/* MarketsView reads the URL (useSearchParams), which needs a boundary. */}
      <Suspense fallback={<TableSkeleton rows={12} />}>
        <MarketsView />
      </Suspense>
    </section>
  );
}
