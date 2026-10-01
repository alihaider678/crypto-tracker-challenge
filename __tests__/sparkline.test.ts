import { describe, expect, it } from "vitest";

import { seriesTrend, sparklinePoints } from "@/lib/sparkline";

describe("sparklinePoints", () => {
  it("scales to the box, highest value at the top", () => {
    expect(sparklinePoints([1, 3, 2], 100, 20, 0)).toBe("0,20 50,0 100,10");
  });

  it("applies vertical padding", () => {
    expect(sparklinePoints([0, 10], 10, 20, 2)).toBe("0,18 10,2");
  });

  it("centers a flat series", () => {
    expect(sparklinePoints([5, 5, 5], 10, 20)).toBe("0,10 5,10 10,10");
  });

  it("needs at least two finite points", () => {
    expect(sparklinePoints([], 10, 10)).toBe("");
    expect(sparklinePoints([1], 10, 10)).toBe("");
    expect(sparklinePoints([Number.NaN, 1], 10, 10)).toBe("");
  });
});

describe("seriesTrend", () => {
  it("compares last with first", () => {
    expect(seriesTrend([1, 5, 2])).toBe("up");
    expect(seriesTrend([3, 5, 2])).toBe("down");
    expect(seriesTrend([2, 5, 2])).toBe("flat");
    expect(seriesTrend([1])).toBe("flat");
  });
});
