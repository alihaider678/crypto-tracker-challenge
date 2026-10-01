import { Suspense } from "react";
import type { Metadata } from "next";

import { TableSkeleton } from "@/components/feedback/table-skeleton";
import { PageHeader } from "@/components/layout/page-header";
import { WatchlistView } from "@/components/watchlist/watchlist-view";

export const metadata: Metadata = {
  title: "Watchlist",
  description: "The pairs you have starred, with live prices.",
};

export default function WatchlistPage() {
  return (
    <section className="container-page space-y-6 py-10 md:space-y-8 md:py-16">
      <PageHeader
        title="Watchlist"
        description="The pairs you have starred, saved in this browser."
      />
      {/* WatchlistView reads ?sort= (useSearchParams), which needs a boundary. */}
      <Suspense fallback={<TableSkeleton rows={5} />}>
        <WatchlistView />
      </Suspense>
    </section>
  );
}
