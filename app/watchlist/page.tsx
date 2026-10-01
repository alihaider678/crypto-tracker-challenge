import type { Metadata } from "next";

import { PageHeader } from "@/components/layout/page-header";

export const metadata: Metadata = {
  title: "Watchlist",
};

export default function WatchlistPage() {
  return (
    <section className="container-page py-10 md:py-16">
      <PageHeader
        title="Watchlist"
        description="The pairs you have starred, saved in this browser."
      />
    </section>
  );
}
