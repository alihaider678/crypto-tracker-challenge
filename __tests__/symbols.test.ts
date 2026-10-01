import { describe, expect, it } from "vitest";

import {
  ICON_SLUG_MAP,
  KNOWN_QUOTES,
  SYMBOL_NAME_MAP,
  coinIconUrl,
  coinName,
  isStablePair,
  isStablecoin,
  isUsdQuote,
  pairLabel,
  parseSymbol,
} from "@/lib/symbols";

import { RAW_TICKERS } from "./fixtures";
import { getCoinImageUrl } from "./legacy/app-logic";

describe("parseSymbol: legacy parity", () => {
  // Legacy: keep symbols ending in USDT, base = symbol.replace('USDT', '').
  const usdtSymbols = RAW_TICKERS.map((t) => t.symbol).filter((s) =>
    s.endsWith("USDT"),
  );

  it("fixture has a meaningful number of USDT pairs", () => {
    expect(usdtSymbols.length).toBeGreaterThan(30);
  });

  it.each(usdtSymbols)("%s parses like legacy", (symbol) => {
    expect(parseSymbol(symbol)).toEqual({
      baseAsset: symbol.replace("USDT", ""),
      quoteAsset: "USDT",
    });
  });

  it("selects exactly the pairs legacy treated as USDT", () => {
    const ours = RAW_TICKERS.filter(
      (t) => parseSymbol(t.symbol)?.quoteAsset === "USDT",
    ).map((t) => t.symbol);
    expect(ours).toEqual(usdtSymbols);
  });
});

describe("parseSymbol: longest known suffix", () => {
  it.each([
    ["BTCUSDT", "BTC", "USDT"],
    ["ETHBTC", "ETH", "BTC"],
    ["SOLETH", "SOL", "ETH"],
    ["BTCUSDC", "BTC", "USDC"],
    ["ETHFDUSD", "ETH", "FDUSD"],
    ["FDUSDUSDT", "FDUSD", "USDT"],
    ["USDCUSDT", "USDC", "USDT"],
    ["1000SATSUSDT", "1000SATS", "USDT"],
    ["BTCTRY", "BTC", "TRY"],
    // These are why retired quotes (AEUR, TUSD, BIDR, BUSD) are excluded:
    // with them in the list, these four pairs parse wrong.
    ["ADAEUR", "ADA", "EUR"],
    ["USDTUSD", "USDT", "USD"],
    ["BNBUSD", "BNB", "USD"],
    ["ARBIDR", "ARB", "IDR"],
    ["BNBIDR", "BNB", "IDR"],
    // Single-letter "U" quote
    ["BTCU", "BTC", "U"],
    ["RLUSDU", "RLUSD", "U"],
  ])("%s -> %s / %s", (symbol, baseAsset, quoteAsset) => {
    expect(parseSymbol(symbol)).toEqual({ baseAsset, quoteAsset });
  });

  it("is case-insensitive and returns upper case (URL params)", () => {
    expect(parseSymbol("btcusdt")).toEqual({
      baseAsset: "BTC",
      quoteAsset: "USDT",
    });
  });

  it("returns null for unknown quotes, bare quotes and junk", () => {
    expect(parseSymbol("BNBPAX")).toBeNull(); // PAX is retired
    expect(parseSymbol("USDT")).toBeNull();
    expect(parseSymbol("")).toBeNull();
    expect(parseSymbol("BTC-USDT")).toBeNull();
  });

  it("checks longer quotes first", () => {
    const lengths = KNOWN_QUOTES.map((q) => q.length);
    expect(lengths).toEqual([...lengths].sort((a, b) => b - a));
  });
});

describe("icons: legacy parity", () => {
  it("keeps all 34 legacy icon slugs", () => {
    expect(Object.keys(ICON_SLUG_MAP)).toHaveLength(34);
  });

  const bases = new Set([
    ...Object.keys(ICON_SLUG_MAP),
    ...RAW_TICKERS.map((t) => parseSymbol(t.symbol)?.baseAsset).filter(
      (b): b is string => Boolean(b),
    ),
  ]);

  it.each([...bases])("%s icon URL matches legacy", (base) => {
    expect(coinIconUrl(base)).toBe(getCoinImageUrl(base));
  });
});

describe("names", () => {
  it("covers about the top 100 coins", () => {
    const size = Object.keys(SYMBOL_NAME_MAP).length;
    expect(size).toBeGreaterThanOrEqual(90);
    expect(size).toBeLessThanOrEqual(130);
  });

  it("maps known coins, including VANRY", () => {
    expect(coinName("BTC")).toBe("Bitcoin");
    expect(coinName("ETH")).toBe("Ethereum");
    expect(coinName("VANRY")).toBe("Vanar Chain");
  });

  it("falls back to the ticker", () => {
    expect(coinName("ZZZNOTACOIN")).toBe("ZZZNOTACOIN");
  });

  it("has no blank names", () => {
    for (const name of Object.values(SYMBOL_NAME_MAP)) {
      expect(name.trim()).not.toBe("");
    }
  });
});

describe("pairLabel / isUsdQuote", () => {
  it("formats BASE/QUOTE", () => {
    expect(pairLabel({ baseAsset: "BTC", quoteAsset: "USDT" })).toBe(
      "BTC/USDT",
    );
  });

  it("knows which quotes are dollar-denominated", () => {
    expect(isUsdQuote("USDT")).toBe(true);
    expect(isUsdQuote("USDC")).toBe(true);
    expect(isUsdQuote("FDUSD")).toBe(true);
    expect(isUsdQuote("BTC")).toBe(false);
    expect(isUsdQuote("EUR")).toBe(false);
  });
});

describe("stablecoins", () => {
  it("recognizes stablecoins", () => {
    expect(isStablecoin("USDC")).toBe(true);
    expect(isStablecoin("FDUSD")).toBe(true);
    expect(isStablecoin("BTC")).toBe(false);
  });

  it.each([
    ["USDCUSDT", true],
    ["FDUSDUSDT", true],
    ["USDTUSD", true],
    ["BTCUSDT", false],
    ["USDTTRY", false],
  ])("%s stable pair: %s", (symbol, expected) => {
    expect(isStablePair(parseSymbol(symbol)!)).toBe(expected);
  });
});
