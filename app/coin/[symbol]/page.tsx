import type { Metadata } from "next";

import { PageHeader } from "@/components/layout/page-header";

// Pair formatting (BTC/USDT) and invalid-symbol handling arrive with
// lib/symbols.ts in Phase 3 and the detail page in Phase 5.
export async function generateMetadata({
  params,
}: PageProps<"/coin/[symbol]">): Promise<Metadata> {
  const { symbol } = await params;
  return { title: `${symbol.toUpperCase()} Price` };
}

export default async function CoinPage({ params }: PageProps<"/coin/[symbol]">) {
  const { symbol } = await params;

  return (
    <section className="container-page py-10 md:py-16">
      <PageHeader
        title={symbol.toUpperCase()}
        description="Live price, candlestick chart and 24h statistics."
      />
    </section>
  );
}
