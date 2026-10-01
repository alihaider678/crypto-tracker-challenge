import { describe, expect, it } from "vitest";

import {
  DEFAULT_MARKET_PARAMS,
  SORT_OPTIONS,
  clearMarketFilters,
  columnSortState,
  hasActiveFilters,
  nextSortForColumn,
  parseMarketParams,
  serializeMarketParams,
  updateMarketParams,
  type MarketParams,
} from "@/lib/market-params";

const parse = (qs: string) => parseMarketParams(new URLSearchParams(qs));

describe("parseMarketParams", () => {
  it("uses defaults for an empty query", () => {
    expect(parse("")).toEqual(DEFAULT_MARKET_PARAMS);
  });

  it("reads every field", () => {
    expect(parse("q=btc&quote=btc&dir=gainers&sort=change_desc&page=3")).toEqual({
      q: "btc",
      quote: "BTC",
      dir: "gainers",
      sort: "change_desc",
      page: 3,
    });
  });

  it("treats quote=all as every quote", () => {
    expect(parse("quote=all").quote).toBeNull();
  });

  it("falls back on invalid values", () => {
    expect(parse("quote=PAX&dir=up&sort=market_cap&page=-2")).toEqual(
      DEFAULT_MARKET_PARAMS,
    );
    expect(parse("page=abc").page).toBe(1);
    expect(parse("page=0").page).toBe(1);
  });

  it("caps very long searches", () => {
    expect(parse(`q=${"a".repeat(500)}`).q).toHaveLength(64);
  });
});

describe("serializeMarketParams", () => {
  it("omits defaults", () => {
    expect(serializeMarketParams(DEFAULT_MARKET_PARAMS)).toBe("");
  });

  it("round-trips", () => {
    const p: MarketParams = {
      q: "sol",
      quote: null,
      dir: "losers",
      sort: "price_asc",
      page: 2,
    };
    expect(parse(serializeMarketParams(p))).toEqual(p);
  });

  it("trims the search and drops it when blank", () => {
    expect(
      serializeMarketParams({ ...DEFAULT_MARKET_PARAMS, q: "   " }),
    ).toBe("");
    expect(
      serializeMarketParams({ ...DEFAULT_MARKET_PARAMS, q: " eth " }),
    ).toBe("q=eth");
  });
});

describe("updateMarketParams", () => {
  const onPage3 = { ...DEFAULT_MARKET_PARAMS, page: 3 };

  it.each([
    [{ q: "btc" }],
    [{ quote: "BTC" }],
    [{ dir: "gainers" as const }],
    [{ sort: "price_desc" as const }],
  ])("goes back to page 1 on %j", (patch) => {
    expect(updateMarketParams(onPage3, patch).page).toBe(1);
  });

  it("keeps the page when nothing really changed", () => {
    expect(updateMarketParams(onPage3, { quote: "USDT" }).page).toBe(3);
  });

  it("applies an explicit page", () => {
    expect(updateMarketParams(onPage3, { page: 4 }).page).toBe(4);
  });
});

describe("filters", () => {
  it("knows when filters are active", () => {
    expect(hasActiveFilters(DEFAULT_MARKET_PARAMS)).toBe(false);
    expect(hasActiveFilters({ ...DEFAULT_MARKET_PARAMS, q: "x" })).toBe(true);
    expect(hasActiveFilters({ ...DEFAULT_MARKET_PARAMS, quote: null })).toBe(
      true,
    );
    expect(
      hasActiveFilters({ ...DEFAULT_MARKET_PARAMS, dir: "losers" }),
    ).toBe(true);
    // sort isn't a filter
    expect(
      hasActiveFilters({ ...DEFAULT_MARKET_PARAMS, sort: "name_asc" }),
    ).toBe(false);
  });

  it("clears filters but keeps the sort", () => {
    const p: MarketParams = {
      q: "x",
      quote: "BTC",
      dir: "gainers",
      sort: "price_asc",
      page: 4,
    };
    expect(clearMarketFilters(p)).toEqual({
      ...DEFAULT_MARKET_PARAMS,
      sort: "price_asc",
    });
  });
});

describe("sortable headers", () => {
  it("reports the active column and direction", () => {
    expect(columnSortState("price_desc", "price")).toBe("desc");
    expect(columnSortState("price_asc", "price")).toBe("asc");
    expect(columnSortState("price_asc", "volume")).toBeNull();
  });

  it("flips an active column", () => {
    expect(nextSortForColumn("change_desc", "change")).toBe("change_asc");
    expect(nextSortForColumn("change_asc", "change")).toBe("change_desc");
  });

  it("starts names A to Z and numbers high to low", () => {
    expect(nextSortForColumn("volume_desc", "name")).toBe("name_asc");
    expect(nextSortForColumn("name_asc", "price")).toBe("price_desc");
    expect(nextSortForColumn("name_asc", "volume")).toBe("volume_desc");
  });

  it("offers every sort key in the dropdown", () => {
    expect(SORT_OPTIONS.map((o) => o.value).sort()).toEqual(
      [
        "change_asc",
        "change_desc",
        "name_asc",
        "name_desc",
        "price_asc",
        "price_desc",
        "volume_asc",
        "volume_desc",
      ].sort(),
    );
  });
});
