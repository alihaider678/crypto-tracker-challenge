import { describe, expect, it } from "vitest";

import { listedTickers, normalizeTickers } from "@/lib/market";
import { PAGES, buildSearchIndex, searchCoins, searchPages } from "@/lib/search";

import { CAPTURED_AT, RAW_TICKERS } from "./fixtures";

const LISTED = listedTickers(normalizeTickers(RAW_TICKERS, CAPTURED_AT));
const INDEX = buildSearchIndex(LISTED);
const symbols = (q: string, limit?: number) =>
  searchCoins(INDEX, q, limit).map((t) => t.symbol);

describe("searchCoins", () => {
  it("puts an exact ticker match first, preferring the USDT pair", () => {
    expect(symbols("btc")[0]).toBe("BTCUSDT");
    expect(symbols("ETH")[0]).toBe("ETHUSDT");
  });

  it("matches full names", () => {
    expect(symbols("bitcoin")).toContain("BTCUSDT");
    expect(symbols("vanar")[0]).toBe("VANRYUSDT");
  });

  it("matches pairs with or without a slash", () => {
    expect(symbols("eth/btc")[0]).toBe("ETHBTC");
    expect(symbols("ethbtc")[0]).toBe("ETHBTC");
    expect(symbols("sol/eth")[0]).toBe("SOLETH");
  });

  it("ranks prefix matches above substring matches", () => {
    // "do" prefixes DOGE and DOT; "ondo" only contains it.
    const r = symbols("do", 20);
    const firstContains = r.indexOf("ONDOUSDT");
    for (const s of ["DOGEUSDT", "DOTUSDT"]) {
      if (r.includes(s) && firstContains >= 0) expect(r.indexOf(s)).toBeLessThan(firstContains);
    }
  });

  it("caps results", () => {
    expect(searchCoins(INDEX, "u", 5)).toHaveLength(5);
    expect(searchCoins(INDEX, "u").length).toBeLessThanOrEqual(8);
  });

  it("returns popular USDT pairs for an empty query (no halted, no stable pairs)", () => {
    const r = searchCoins(INDEX, "  ", 5);
    expect(r).toHaveLength(5);
    for (const t of r) {
      expect(t.quoteAsset).toBe("USDT");
      expect(t.halted).toBe(false);
      expect(["USDCUSDT", "FDUSDUSDT"]).not.toContain(t.symbol);
    }
    const vols = r.map((t) => t.quoteVolume);
    expect(vols).toEqual([...vols].sort((a, b) => b - a));
  });

  it("returns nothing for junk", () => {
    expect(symbols("zzzzqq")).toEqual([]);
  });

  it("returns the index's own ticker objects (live updates keep identity)", () => {
    expect(searchCoins(INDEX, "btc")[0]).toBe(LISTED.find((t) => t.symbol === "BTCUSDT"));
  });
});

describe("searchPages", () => {
  it("lists every page for an empty query", () => {
    expect(searchPages("").map((p) => p.href)).toEqual(PAGES.map((p) => p.href));
  });

  it("matches labels and keywords", () => {
    expect(searchPages("mark").map((p) => p.href)).toEqual(["/markets"]);
    expect(searchPages("star").map((p) => p.href)).toEqual(["/watchlist"]);
    expect(searchPages("home").map((p) => p.href)).toEqual(["/"]);
    expect(searchPages("zzz")).toEqual([]);
  });
});
