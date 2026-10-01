import { isListed } from "./market";
import { isStablePair } from "./symbols";
import type { Ticker } from "./types";

/*
 * Command-palette search. The index lower-cases every field once per
 * snapshot, so a keystroke is a single cheap pass with a capped result.
 */

type Entry = {
  ticker: Ticker;
  base: string;
  name: string;
  /** "btcusdt" */
  symbol: string;
  /** Name words, for "Shiba Inu" -> "inu" */
  words: string[];
};

export type SearchIndex = Entry[];

export function buildSearchIndex(list: Ticker[]): SearchIndex {
  return list.map((t) => ({
    ticker: t,
    base: t.baseAsset.toLowerCase(),
    name: t.name.toLowerCase(),
    symbol: t.symbol.toLowerCase(),
    words: t.name.toLowerCase().split(/\s+/),
  }));
}

/** Lower is better; null = no match. */
function score(e: Entry, q: string): number | null {
  if (e.base === q || e.symbol === q) return 0;
  if (e.base.startsWith(q)) return 1;
  if (e.name.startsWith(q)) return 2;
  if (e.words.some((w) => w.startsWith(q))) return 3;
  if (e.symbol.startsWith(q)) return 4;
  if (e.base.includes(q)) return 5;
  if (e.name.includes(q)) return 6;
  if (e.symbol.includes(q)) return 7;
  return null;
}

const byPopularity = (a: Ticker, b: Ticker) =>
  // USDT pairs first, then the busier pair.
  (a.quoteAsset === "USDT" ? 0 : 1) - (b.quoteAsset === "USDT" ? 0 : 1) ||
  b.quoteVolume - a.quoteVolume;

/**
 * Best `limit` coins for `query` (ticker, name, or pair with or without
 * "/"). Ties go to USDT pairs, then volume. An empty query returns the
 * busiest tradable USDT pairs.
 */
export function searchCoins(index: SearchIndex, query: string, limit = 8): Ticker[] {
  const q = query.trim().toLowerCase().replace(/[\s/]+/g, "");
  if (!q) {
    return index
      .map((e) => e.ticker)
      .filter((t) => t.quoteAsset === "USDT" && isListed(t) && !isStablePair(t))
      .sort(byPopularity)
      .slice(0, limit);
  }

  const hits: { t: Ticker; s: number }[] = [];
  for (const e of index) {
    const s = score(e, q);
    if (s !== null) hits.push({ t: e.ticker, s });
  }
  hits.sort((a, b) => a.s - b.s || byPopularity(a.t, b.t));
  return hits.slice(0, limit).map((h) => h.t);
}

export type PageEntry = { href: string; label: string; keywords: string[] };

export const PAGES: PageEntry[] = [
  { href: "/", label: "Overview", keywords: ["home", "dashboard", "movers"] },
  { href: "/markets", label: "Markets", keywords: ["all", "pairs", "table", "prices"] },
  { href: "/watchlist", label: "Watchlist", keywords: ["starred", "favorites", "saved"] },
];

export function searchPages(query: string): PageEntry[] {
  const q = query.trim().toLowerCase();
  if (!q) return PAGES;
  return PAGES.filter(
    (p) => p.label.toLowerCase().includes(q) || p.keywords.some((k) => k.startsWith(q)),
  );
}
