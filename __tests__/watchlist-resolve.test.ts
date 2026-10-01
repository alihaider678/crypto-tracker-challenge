import { describe, expect, it } from "vitest";

import { listedTickers, normalizeTicker, normalizeTickers } from "@/lib/market";
import type { Ticker } from "@/lib/types";
import { missingSymbols, resolveWatchlist, splitMissing } from "@/lib/watchlist";

import { CAPTURED_AT, RAW_TICKERS, rawTicker } from "./fixtures";

const LISTED = listedTickers(normalizeTickers(RAW_TICKERS, CAPTURED_AT));
const sym = (rows: Ticker[]) => rows.map((t) => t.symbol);

// VANRYBTC is halted, so it isn't in the listed snapshot.
const vanryBtc = normalizeTicker(rawTicker("VANRYBTC"), CAPTURED_AT)!;

describe("missingSymbols", () => {
  it("lists starred pairs the snapshot doesn't have (to fetch one by one)", () => {
    expect(missingSymbols(["BTCUSDT", "VANRYBTC", "FOOUSDT"], LISTED)).toEqual([
      "VANRYBTC",
      "FOOUSDT",
    ]);
  });

  it("skips symbols that can't be a Binance pair", () => {
    expect(missingSymbols(["BTC-USDT", ""], LISTED)).toEqual([]);
  });
});

describe("resolveWatchlist", () => {
  it("keeps star order and takes listed pairs from the snapshot", () => {
    const r = resolveWatchlist(["ETHUSDT", "BTCUSDT"], LISTED, new Map());
    expect(sym(r.rows)).toEqual(["ETHUSDT", "BTCUSDT"]);
    expect(r.rows[0]).toBe(LISTED.find((t) => t.symbol === "ETHUSDT"));
    expect(r.pending).toEqual([]);
    expect(r.unavailable).toEqual([]);
  });

  it("shows halted pairs fetched separately, marked halted (never dropped)", () => {
    const r = resolveWatchlist(["VANRYBTC"], LISTED, new Map([["VANRYBTC", vanryBtc]]));
    expect(sym(r.rows)).toEqual(["VANRYBTC"]);
    expect(r.rows[0].halted).toBe(true);
  });

  it("marks a fetched pair with no price or no trades as halted", () => {
    const btc = LISTED.find((t) => t.symbol === "BTCUSDT")!;
    const dead = { ...btc, symbol: "DEADUSDT", lastPrice: 0, halted: false };
    const r = resolveWatchlist(["DEADUSDT"], LISTED, new Map([["DEADUSDT", dead]]));
    expect(r.rows[0].halted).toBe(true);
  });

  it("reports still-loading and no-longer-listed pairs separately", () => {
    const r = resolveWatchlist(
      ["BTCUSDT", "VANRYBTC", "FOOUSDT", "BTC-USDT"],
      LISTED,
      new Map([["FOOUSDT", null]]),
    );
    expect(sym(r.rows)).toEqual(["BTCUSDT"]);
    expect(r.pending).toEqual(["VANRYBTC"]);
    expect(r.unavailable).toEqual(["FOOUSDT", "BTC-USDT"]);
  });

  it("ignores duplicate stars", () => {
    expect(sym(resolveWatchlist(["BTCUSDT", "BTCUSDT"], LISTED, new Map()).rows)).toEqual([
      "BTCUSDT",
    ]);
  });
});

describe("splitMissing", () => {
  it("waits for the symbol list before deciding anything", () => {
    expect(splitMissing(["VANRYBTC", "FOOUSDT"], null)).toEqual({ fetch: [], unknown: [] });
  });

  it("fetches known symbols and flags unknown ones", () => {
    expect(splitMissing(["VANRYBTC", "FOOUSDT"], new Set(["VANRYBTC", "BTCUSDT"]))).toEqual({
      fetch: ["VANRYBTC"],
      unknown: ["FOOUSDT"],
    });
  });
});
