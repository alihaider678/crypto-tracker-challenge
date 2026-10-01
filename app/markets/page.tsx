import type { Metadata } from "next";

import { PageHeader } from "@/components/layout/page-header";

export const metadata: Metadata = {
  title: "Markets",
};

export default function MarketsPage() {
  return (
    <section className="container-page py-10 md:py-16">
      <PageHeader
        title="Markets"
        description="Every Binance spot pair with live price, 24h change and volume."
      />
    </section>
  );
}
