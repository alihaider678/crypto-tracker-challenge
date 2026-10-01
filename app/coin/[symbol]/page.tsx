import { cache } from "react";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { CoinView } from "@/components/coin/coin-view";
import type { InitialTicker } from "@/hooks/useTickers";
import { BinanceError, fetchTicker24hr } from "@/lib/binance";
import { normalizeTicker } from "@/lib/market";
import { coinName, pairLabel, parseSymbol } from "@/lib/symbols";

// Keep page navigations snappy if Binance is slow; the client retries.
const SERVER_FETCH_TIMEOUT_MS = 3000;

type LoadResult =
  | { status: "ok"; initial: InitialTicker }
  | { status: "invalid" }
  /** Binance unreachable from the server (timeout, 451, ...); the client fetches. */
  | { status: "unavailable" };

// Shared by generateMetadata and the page within one request.
const loadTicker = cache(async (symbol: string): Promise<LoadResult> => {
  try {
    const raw = await fetchTicker24hr(symbol, AbortSignal.timeout(SERVER_FETCH_TIMEOUT_MS));
    const fetchedAt = Date.now();
    const ticker = normalizeTicker(raw, fetchedAt);
    return ticker ? { status: "ok", initial: { ticker, fetchedAt } } : { status: "invalid" };
  } catch (err) {
    if (err instanceof BinanceError && err.isInvalidSymbol) return { status: "invalid" };
    return { status: "unavailable" };
  }
});

export async function generateMetadata({
  params,
}: PageProps<"/coin/[symbol]">): Promise<Metadata> {
  const { symbol } = await params;
  const parsed = parseSymbol(symbol);
  if (!parsed || (await loadTicker(symbol.toUpperCase())).status === "invalid") {
    return { title: "Pair not found" };
  }
  const label = pairLabel(parsed);
  return {
    title: `${label} Price`,
    description: `Live ${label} price, candlestick chart and 24h statistics for ${coinName(parsed.baseAsset)} on Binance.`,
  };
}

export default async function CoinPage({
  params,
  searchParams,
}: PageProps<"/coin/[symbol]">) {
  const { symbol } = await params;
  const upper = symbol.toUpperCase();
  if (!parseSymbol(upper)) notFound();

  // One canonical URL per pair: /coin/btcusdt -> /coin/BTCUSDT (keeps ?tf=).
  if (symbol !== upper) {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(await searchParams)) {
      if (typeof value === "string") query.set(key, value);
    }
    const qs = query.toString();
    redirect(`/coin/${upper}${qs ? `?${qs}` : ""}`);
  }

  const result = await loadTicker(upper);
  if (result.status === "invalid") notFound();

  return (
    <section className="container-page py-8 md:py-12">
      <CoinView
        symbol={upper}
        initial={result.status === "ok" ? result.initial : null}
      />
    </section>
  );
}
