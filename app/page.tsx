import Link from "next/link";
import { ArrowRight, Star } from "lucide-react";

import { MiniTicker } from "@/components/overview/mini-ticker";
import { OverviewSections } from "@/components/overview/overview-sections";
import { Button } from "@/components/ui/button";

export default function OverviewPage() {
  return (
    <div className="container-page space-y-10 pt-10 pb-12 md:space-y-16 md:pt-16 md:pb-16 lg:space-y-24 lg:pb-24">
      {/* Compact hero: copy left, live prices right (below on mobile). */}
      <section
        aria-labelledby="hero-heading"
        className="grid gap-8 lg:grid-cols-12 lg:items-center lg:gap-12"
      >
        <div className="space-y-5 lg:col-span-7">
          <h1
            id="hero-heading"
            className="max-w-2xl text-2xl font-bold tracking-[-0.02em] md:text-3xl"
          >
            Crypto prices you can read at a glance.
          </h1>
          <p className="max-w-xl text-base text-muted-foreground">
            Live prices, 24h movers and candlestick charts for every Binance spot pair.
          </p>
          <div className="flex flex-wrap gap-3 pt-1">
            <Button asChild size="lg">
              <Link href="/markets">
                Explore markets
                <ArrowRight aria-hidden />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/watchlist">
                <Star aria-hidden />
                Your watchlist
              </Link>
            </Button>
          </div>
        </div>
        <div className="lg:col-span-5">
          <MiniTicker />
        </div>
      </section>

      <OverviewSections />
    </div>
  );
}
