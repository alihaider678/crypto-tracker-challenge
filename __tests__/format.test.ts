import { describe, expect, it } from "vitest";

import {
  formatCompact,
  formatInteger,
  formatPercent,
  formatPrice,
  priceDecimals,
} from "@/lib/format";

describe("priceDecimals", () => {
  it.each([
    [83966.28, 2],
    [1000, 2],
    [145.23, 2],
    [100, 2],
    [2.4512, 4],
    [1, 4],
    [0.5, 4],
    [0.054321, 5],
    [0.001, 6],
    [0.00074, 7],
    [0.00001234, 8],
    [0.000008123, 8],
    [0.0000000123, 8],
  ])("%d -> %d decimals", (value, decimals) => {
    expect(priceDecimals(value)).toBe(decimals);
  });

  it("uses the magnitude for negatives", () => {
    expect(priceDecimals(-0.00074)).toBe(7);
  });
});

describe("formatPrice", () => {
  it.each([
    [83966.28, "83,966.28"],
    [145.2, "145.20"],
    [2.4512, "2.4512"],
    [0.5, "0.5000"],
    [0.00074, "0.0007400"],
    [0.00001234, "0.00001234"],
    [0.000008123, "0.00000812"],
  ])("%d -> %s", (value, expected) => {
    expect(formatPrice(value)).toBe(expected);
  });

  it("never uses scientific notation", () => {
    for (const v of [1e-7, 1.5e-8, 1e-12]) {
      expect(formatPrice(v)).not.toMatch(/e/i);
    }
    expect(formatPrice(1e-7)).toBe("0.00000010");
  });

  it("keeps a fixed width for a given magnitude, so live ticks don't jump", () => {
    expect(formatPrice(0.00074)).toHaveLength(formatPrice(0.000741).length);
    expect(formatPrice(2.5)).toBe("2.5000");
  });

  it("adds a $ for dollar quotes only", () => {
    expect(formatPrice(83966.28, { quote: "USDT" })).toBe("$83,966.28");
    expect(formatPrice(0.0091, { quote: "BTC" })).toBe("0.009100");
  });

  it("allows an explicit precision", () => {
    expect(formatPrice(1.23456789, { decimals: 2 })).toBe("1.23");
  });

  it("handles zero and bad input", () => {
    expect(formatPrice(0)).toBe("0.00");
    expect(formatPrice(Number.NaN)).toBe("—");
    expect(formatPrice(Number.POSITIVE_INFINITY)).toBe("—");
  });
});

describe("formatCompact", () => {
  it.each([
    [999, "999"],
    [1234, "1.23K"],
    [1_200_000, "1.2M"],
    [2_320_295.24, "2.32M"],
    [45_600_000_000, "45.6B"],
    [1.5e12, "1.5T"],
    [0, "0"],
  ])("%d -> %s", (value, expected) => {
    expect(formatCompact(value)).toBe(expected);
  });

  it("adds a $ for dollar quotes", () => {
    expect(formatCompact(1_200_000, { quote: "USDT" })).toBe("$1.2M");
  });

  it("handles bad input", () => {
    expect(formatCompact(Number.NaN)).toBe("—");
  });
});

describe("formatPercent", () => {
  it.each([
    [1.2345, "+1.23%"],
    [-37.128, "-37.13%"],
    [0, "0.00%"],
    [-0.001, "0.00%"],
    [1234.5, "+1,234.50%"],
  ])("%d -> %s", (value, expected) => {
    expect(formatPercent(value)).toBe(expected);
  });

  it("handles bad input", () => {
    expect(formatPercent(Number.NaN)).toBe("—");
  });
});

describe("formatInteger", () => {
  it("groups thousands", () => {
    expect(formatInteger(75293)).toBe("75,293");
    expect(formatInteger(Number.NaN)).toBe("—");
  });
});
