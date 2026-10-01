import { describe, expect, it } from "vitest";

import {
  LEGACY_SORT_KEYS,
  PINNED_SYMBOL,
  applyMiniTicker,
  changeDirection,
  filterTickers,
  groupQuotes,
  isListed,
  isTradingHalted,
  listedTickers,
  mergeMiniTickers,
  normalizeTicker,
  normalizeTickers,
  overviewData,
  paginate,
  pickBySymbol,
  rangePosition,
  pinSymbolFirst,
  selectMarketView,
  sortTickers,
  tickDirection,
  topMovers,
  type SortKey,
} from "@/lib/market";
import type { BinanceMiniTicker, Ticker } from "@/lib/types";

import { CAPTURED_AT, RAW_TICKERS, rawTicker } from "./fixtures";
import { filterAndSort, processTickers } from "./legacy/app-logic";

const symbols = (list: { symbol: string }[]) => list.map((t) => t.symbol);

const ALL = normalizeTickers(RAW_TICKERS, CAPTURED_AT);
const LISTED = listedTickers(ALL);

/** The legacy app's input: USDT pairs only, VANRY moved first, nothing hidden. */
const legacyCoins = processTickers(RAW_TICKERS);
const legacyEquivalent = legacyCoins.map(
  (c: { symbol: string }) => ALL.find((t) => t.symbol === c.symbol)!,
);

describe("normalizeTicker", () => {
  it("parses numbers and derives base, quote and name", () => {
    const btc = normalizeTicker(rawTicker("BTCUSDT"), CAPTURED_AT)!;
    const raw = rawTicker("BTCUSDT");
    expect(btc).toMatchObject({
      symbol: "BTCUSDT",
      baseAsset: "BTC",
      quoteAsset: "USDT",
      name: "Bitcoin",
      lastPrice: Number(raw.lastPrice),
      priceChangePercent: Number(raw.priceChangePercent),
      quoteVolume: Number(raw.quoteVolume),
      tradeCount: raw.count,
      updatedAt: raw.closeTime,
      halted: false,
    });
  });

  it("flags pairs with no trades in 24h as halted (VANRY since 2026-09-09)", () => {
    expect(normalizeTicker(rawTicker("VANRYUSDT"), CAPTURED_AT)!.halted).toBe(
      true,
    );
  });

  it("drops symbols it can't parse", () => {
    expect(normalizeTicker(rawTicker("BNBPAX"), CAPTURED_AT)).toBeNull();
  });
});

describe("listing rules", () => {
  it("hides zero-price / zero-trade pairs", () => {
    const dead = ALL.filter((t) => t.tradeCount === 0 || t.lastPrice === 0);
    expect(dead.length).toBeGreaterThan(0);
    for (const t of dead) expect(isListed(t)).toBe(false);
    expect(LISTED.some((t) => t.tradeCount === 0 || t.lastPrice === 0)).toBe(
      false,
    );
  });

  it("hides halted pairs", () => {
    expect(
      LISTED.filter((t) => t.halted && t.symbol !== PINNED_SYMBOL),
    ).toEqual([]);
  });

  it("keeps the pinned pair even while halted", () => {
    expect(symbols(LISTED)).toContain(PINNED_SYMBOL);
    expect(symbols(LISTED)).not.toContain("VANRYBTC");
  });
});

describe("sortTickers: legacy parity", () => {
  it.each(LEGACY_SORT_KEYS)("%s orders exactly like legacy", (key) => {
    const legacy = filterAndSort(legacyCoins, "", key);
    expect(symbols(sortTickers(legacyEquivalent, key))).toEqual(
      symbols(legacy),
    );
  });

  it("does not mutate its input", () => {
    const before = symbols(legacyEquivalent);
    sortTickers(legacyEquivalent, "price_desc");
    expect(symbols(legacyEquivalent)).toEqual(before);
  });
});

describe("sortTickers: volume", () => {
  it("sorts by quote volume", () => {
    const desc = sortTickers(LISTED, "volume_desc").map((t) => t.quoteVolume);
    expect(desc).toEqual([...desc].sort((a, b) => b - a));
    const asc = sortTickers(LISTED, "volume_asc").map((t) => t.quoteVolume);
    expect(asc).toEqual([...asc].sort((a, b) => a - b));
  });
});

describe("filterTickers: search", () => {
  it.each(["", "b", "BTC", "eth", "sat", "do", "zzz"])(
    "returns everything legacy found for %j",
    (term) => {
      const legacy = symbols(filterAndSort(legacyCoins, term, "name_asc"));
      const ours = symbols(filterTickers(legacyEquivalent, { query: term }));
      for (const s of legacy) expect(ours).toContain(s);
    },
  );

  it("matches the full coin name", () => {
    expect(symbols(filterTickers(LISTED, { query: "bitcoin" }))).toContain(
      "BTCUSDT",
    );
    expect(symbols(filterTickers(LISTED, { query: "vanar" }))).toContain(
      "VANRYUSDT",
    );
  });

  it("matches the pair, with or without a slash", () => {
    expect(symbols(filterTickers(LISTED, { query: "btc/usdt" }))).toEqual([
      "BTCUSDT",
    ]);
    expect(symbols(filterTickers(LISTED, { query: "ETHBTC" }))).toEqual([
      "ETHBTC",
    ]);
  });

  it("ignores surrounding whitespace", () => {
    expect(filterTickers(LISTED, { query: "  btc  " }).length).toBeGreaterThan(
      0,
    );
  });
});

describe("filterTickers: quote and direction", () => {
  it("filters by quote asset", () => {
    const btcQuoted = filterTickers(LISTED, { quote: "BTC" });
    expect(btcQuoted.length).toBeGreaterThan(0);
    expect(btcQuoted.every((t) => t.quoteAsset === "BTC")).toBe(true);
  });

  it("filters gainers and losers", () => {
    const gainers = filterTickers(LISTED, { direction: "gainers" });
    const losers = filterTickers(LISTED, { direction: "losers" });
    expect(gainers.every((t) => t.priceChangePercent > 0)).toBe(true);
    expect(losers.every((t) => t.priceChangePercent < 0)).toBe(true);
    expect(gainers.length).toBeGreaterThan(0);
    expect(losers.length).toBeGreaterThan(0);
  });
});

describe("pinSymbolFirst", () => {
  it("demonstrates the legacy bug: sorting loses the pin", () => {
    const legacy = filterAndSort(legacyCoins, "", "name_asc");
    expect(legacy[0].symbol).not.toBe(PINNED_SYMBOL);
  });

  const sortKeys: SortKey[] = [
    ...LEGACY_SORT_KEYS,
    "volume_desc",
    "volume_asc",
  ];

  it.each(sortKeys)("keeps VANRY first after filter + %s", (sort) => {
    const view = selectMarketView(LISTED, { sort, query: "" });
    expect(view[0].symbol).toBe(PINNED_SYMBOL);
    // and only once
    expect(symbols(view).filter((s) => s === PINNED_SYMBOL)).toHaveLength(1);
  });

  it("pins VANRY when the search matches it", () => {
    for (const query of ["van", "VANRY", "vanar chain", "vanry/usdt", "usdt"]) {
      expect(selectMarketView(LISTED, { query, sort: "price_desc" })[0].symbol)
        .toBe(PINNED_SYMBOL);
    }
  });

  it("does not add VANRY back when the filter excludes it", () => {
    expect(
      symbols(selectMarketView(LISTED, { query: "btc", sort: "name_asc" })),
    ).not.toContain(PINNED_SYMBOL);
    // VANRY is down on the day, so it isn't a gainer.
    expect(
      symbols(selectMarketView(LISTED, { direction: "gainers", sort: "name_asc" })),
    ).not.toContain(PINNED_SYMBOL);
    expect(
      symbols(selectMarketView(LISTED, { quote: "BTC", sort: "name_asc" })),
    ).not.toContain(PINNED_SYMBOL);
  });

  it("keeps the rest in sorted order", () => {
    const view = selectMarketView(LISTED, { sort: "price_desc" });
    const rest = symbols(view.slice(1));
    expect(rest).toEqual(
      symbols(sortTickers(LISTED, "price_desc")).filter(
        (s) => s !== PINNED_SYMBOL,
      ),
    );
  });

  it("returns the list unchanged when the symbol is absent", () => {
    const list = LISTED.filter((t) => t.symbol !== PINNED_SYMBOL);
    expect(pinSymbolFirst(list, PINNED_SYMBOL)).toBe(list);
  });

  it("does not mutate its input", () => {
    const list = sortTickers(LISTED, "name_asc");
    const before = symbols(list);
    pinSymbolFirst(list, PINNED_SYMBOL);
    expect(symbols(list)).toEqual(before);
  });
});

describe("topMovers", () => {
  const movers = topMovers(LISTED, { quote: "USDT", limit: 5 });

  it("returns up to 5 of each", () => {
    expect(movers.gainers.length).toBeLessThanOrEqual(5);
    expect(movers.losers.length).toBeLessThanOrEqual(5);
    expect(movers.volume).toHaveLength(5);
  });

  it("only uses the requested quote, so volumes are comparable", () => {
    for (const t of [...movers.gainers, ...movers.losers, ...movers.volume]) {
      expect(t.quoteAsset).toBe("USDT");
    }
  });

  it("orders gainers desc (positive only) and losers asc (negative only)", () => {
    const g = movers.gainers.map((t) => t.priceChangePercent);
    const l = movers.losers.map((t) => t.priceChangePercent);
    expect(g).toEqual([...g].sort((a, b) => b - a));
    expect(l).toEqual([...l].sort((a, b) => a - b));
    expect(g.every((v) => v > 0)).toBe(true);
    expect(l.every((v) => v < 0)).toBe(true);
  });

  it("orders volume by quote volume desc", () => {
    const v = movers.volume.map((t) => t.quoteVolume);
    expect(v).toEqual([...v].sort((a, b) => b - a));
  });

  it("excludes stablecoin/stablecoin pairs (USDC/USDT would top volume)", () => {
    const all = [...movers.gainers, ...movers.losers, ...movers.volume];
    expect(symbols(all)).not.toContain("USDCUSDT");
    expect(symbols(all)).not.toContain("FDUSDUSDT");
  });

  it("keeps stablecoin pairs searchable in Markets", () => {
    expect(
      symbols(selectMarketView(LISTED, { query: "usdc", sort: "name_asc" })),
    ).toContain("USDCUSDT");
  });

  it("excludes halted pairs (a frozen -37% is not today's top loser)", () => {
    for (const t of [...movers.gainers, ...movers.losers, ...movers.volume]) {
      expect(t.halted).toBe(false);
    }
  });
});

describe("live mini-ticker merge", () => {
  const btc = ALL.find((t) => t.symbol === "BTCUSDT")!;
  const mini = (over: Partial<BinanceMiniTicker> = {}): BinanceMiniTicker => ({
    e: "24hrMiniTicker",
    E: CAPTURED_AT + 1000,
    s: "BTCUSDT",
    c: "110",
    o: "100",
    h: "120",
    l: "90",
    v: "5",
    q: "550",
    ...over,
  });

  it("computes 24h change from open and close", () => {
    const next = applyMiniTicker(btc, mini());
    expect(next).toMatchObject({
      lastPrice: 110,
      openPrice: 100,
      highPrice: 120,
      lowPrice: 90,
      volume: 5,
      quoteVolume: 550,
      priceChange: 10,
      priceChangePercent: 10,
      updatedAt: CAPTURED_AT + 1000,
      tradeCount: btc.tradeCount,
      halted: false,
    });
    expect(applyMiniTicker(btc, mini({ c: "75" })).priceChangePercent).toBe(
      -25,
    );
  });

  it("treats a zero open as 0% instead of Infinity", () => {
    expect(applyMiniTicker(btc, mini({ o: "0" })).priceChangePercent).toBe(0);
  });

  it("replaces only updated tickers and keeps other references", () => {
    const list: Ticker[] = ALL.slice(0, 10);
    const target = list[3];
    const merged = mergeMiniTickers(
      list,
      new Map([[target.symbol, mini({ s: target.symbol })]]),
    );
    expect(merged).not.toBe(list);
    merged.forEach((t, i) => {
      if (i === 3) expect(t).not.toBe(list[i]);
      else expect(t).toBe(list[i]);
    });
  });

  it("returns the same array when nothing matches", () => {
    const list = ALL.slice(0, 10);
    expect(
      mergeMiniTickers(list, new Map([["NOPEUSDT", mini({ s: "NOPEUSDT" })]])),
    ).toBe(list);
  });
});

describe("paginate", () => {
  const items = Array.from({ length: 120 }, (_, i) => i);

  it("slices 50 per page", () => {
    expect(paginate(items, 1)).toMatchObject({
      page: 1,
      pageCount: 3,
      total: 120,
      from: 1,
      to: 50,
    });
    const last = paginate(items, 3);
    expect(last.items).toHaveLength(20);
    expect(last).toMatchObject({ from: 101, to: 120 });
  });

  it("clamps out-of-range pages", () => {
    expect(paginate(items, 99).page).toBe(3);
    expect(paginate(items, 0).page).toBe(1);
    expect(paginate(items, Number.NaN).page).toBe(1);
  });

  it("handles an empty list", () => {
    expect(paginate([], 4)).toEqual({
      items: [],
      page: 1,
      pageCount: 1,
      total: 0,
      from: 0,
      to: 0,
    });
  });
});

describe("groupQuotes", () => {
  it("puts primary quotes with enough pairs up front, in fixed order", () => {
    const { primary, more } = groupQuotes(LISTED, { minPairs: 2 });
    const quotes = primary.map((o) => o.quote);
    expect(quotes[0]).toBe("USDT");
    // fixture: USDT majors plus a few BTC pairs
    expect(quotes).toContain("BTC");
    for (const o of more) expect(quotes).not.toContain(o.quote);
  });

  it("moves primary quotes below the threshold into More, busiest first", () => {
    const { primary, more } = groupQuotes(LISTED, { minPairs: 1000 });
    expect(primary).toEqual([]);
    const counts = more.map((o) => o.count);
    expect(counts).toEqual([...counts].sort((a, b) => b - a));
    expect(more.reduce((n, o) => n + o.count, 0)).toBe(LISTED.length);
  });
});

describe("tickDirection", () => {
  it("reports up, down or no change", () => {
    expect(tickDirection(1, 2)).toBe("up");
    expect(tickDirection(2, 1)).toBe("down");
    expect(tickDirection(1, 1)).toBeNull();
    expect(tickDirection(Number.NaN, 1)).toBeNull();
  });
});

describe("changeDirection", () => {
  it("follows the displayed 2-decimal value", () => {
    expect(changeDirection(0.03)).toBe("up");
    expect(changeDirection(-1.53)).toBe("down");
    expect(changeDirection(0)).toBe("flat");
    expect(changeDirection(-0.004)).toBe("flat");
    expect(changeDirection(0.005)).toBe("up");
    expect(changeDirection(Number.NaN)).toBe("flat");
  });
});

describe("isTradingHalted", () => {
  it("is true for halted, zero-price and zero-trade pairs", () => {
    const btc = ALL.find((t) => t.symbol === "BTCUSDT")!;
    expect(isTradingHalted(btc)).toBe(false);
    expect(isTradingHalted(ALL.find((t) => t.symbol === PINNED_SYMBOL)!)).toBe(true);
    expect(isTradingHalted({ ...btc, lastPrice: 0 })).toBe(true);
    expect(isTradingHalted({ ...btc, tradeCount: 0 })).toBe(true);
  });
});

describe("overviewData", () => {
  const data = overviewData(LISTED);

  it("counts listed pairs (VANRY included)", () => {
    expect(data.pairsTracked).toBe(LISTED.length);
  });

  it("takes headline movers from the USDT movers lists", () => {
    const movers = topMovers(LISTED, { quote: "USDT", limit: 5 });
    expect(data.movers).toEqual(movers);
    expect(data.topGainer).toBe(movers.gainers[0] ?? null);
    expect(data.topLoser).toBe(movers.losers[0] ?? null);
    expect(data.topVolume).toBe(movers.volume[0] ?? null);
  });

  it("never picks halted or stable/stable pairs", () => {
    for (const t of [data.topGainer, data.topLoser, data.topVolume]) {
      expect(t).not.toBeNull();
      expect(t!.halted).toBe(false);
      expect(t!.quoteAsset).toBe("USDT");
      expect(["USDCUSDT", "FDUSDUSDT", PINNED_SYMBOL]).not.toContain(t!.symbol);
    }
  });

  it("is empty-safe", () => {
    expect(overviewData([])).toEqual({
      pairsTracked: 0,
      movers: { gainers: [], losers: [], volume: [] },
      topGainer: null,
      topLoser: null,
      topVolume: null,
    });
  });
});

describe("pickBySymbol", () => {
  it("returns tickers in the requested order, null when missing", () => {
    const picked = pickBySymbol(LISTED, ["ETHUSDT", "NOPEUSDT", "BTCUSDT", PINNED_SYMBOL]);
    expect(picked.map((t) => t?.symbol ?? null)).toEqual([
      "ETHUSDT",
      null,
      "BTCUSDT",
      PINNED_SYMBOL,
    ]);
  });

  it("keeps object identity (memoized rows)", () => {
    const btc = LISTED.find((t) => t.symbol === "BTCUSDT");
    expect(pickBySymbol(LISTED, ["BTCUSDT"])[0]).toBe(btc);
  });
});

describe("rangePosition", () => {
  it("places the price between low and high (0..1)", () => {
    expect(rangePosition(10, 20, 15)).toBe(0.5);
    expect(rangePosition(10, 20, 10)).toBe(0);
    expect(rangePosition(10, 20, 20)).toBe(1);
  });

  it("clamps prices outside the range (live ticks can run ahead of 24h stats)", () => {
    expect(rangePosition(10, 20, 25)).toBe(1);
    expect(rangePosition(10, 20, 5)).toBe(0);
  });

  it("centers a flat range and rejects bad input", () => {
    expect(rangePosition(10, 10, 10)).toBe(0.5);
    expect(rangePosition(20, 10, 15)).toBeNull();
    expect(rangePosition(Number.NaN, 20, 15)).toBeNull();
    expect(rangePosition(0, 0, 0)).toBeNull();
  });

  it("matches VANRY's frozen numbers", () => {
    const v = ALL.find((t) => t.symbol === PINNED_SYMBOL)!;
    const pos = rangePosition(v.lowPrice, v.highPrice, v.lastPrice)!;
    expect(pos).toBeGreaterThan(0);
    expect(pos).toBeLessThan(0.1); // 0.00074 in 0.00071..0.001414
  });
});
