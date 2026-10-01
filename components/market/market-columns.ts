/*
 * Column layout shared by MarketTable and TableSkeleton, so the skeleton
 * matches the real table exactly.
 *
 * Breakpoints: < 640px shows Coin | Price | 24h % only; sm adds star and
 * rank; md adds volume; lg adds high/low and the sparkline.
 */
export const COLUMN_CLASS = {
  star: "hidden w-10 pr-0 sm:table-cell",
  rank: "hidden w-10 sm:table-cell",
  coin: "",
  // Fixed on mobile (table-fixed) so the coin column gets the spare width.
  price: "w-28 text-right md:w-auto",
  change: "w-24 text-right sm:w-28",
  range: "hidden text-right lg:table-cell",
  volume: "hidden text-right md:table-cell",
  spark: "hidden w-32 lg:table-cell",
} as const;

/** Cell padding: 12px sides, 8px vertical, which gives ~52px rows. */
export const CELL_CLASS = "px-3 py-2";

export const SPARKLINE_SIZE = { width: 112, height: 32 } as const;
