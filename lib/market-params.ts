import { KNOWN_QUOTES } from "./symbols";
import type { Direction, SortKey } from "./market";

/** Markets view state, mirrored in the URL query string. */
export type MarketParams = {
  q: string;
  /** null = every quote asset */
  quote: string | null;
  dir: Direction;
  sort: SortKey;
  page: number;
};

export const DEFAULT_MARKET_PARAMS: MarketParams = {
  q: "",
  quote: "USDT",
  dir: "all",
  sort: "volume_desc",
  page: 1,
};

export const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "volume_desc", label: "Volume: high to low" },
  { value: "volume_asc", label: "Volume: low to high" },
  { value: "change_desc", label: "24h change: high to low" },
  { value: "change_asc", label: "24h change: low to high" },
  { value: "price_desc", label: "Price: high to low" },
  { value: "price_asc", label: "Price: low to high" },
  { value: "name_asc", label: "Name: A to Z" },
  { value: "name_desc", label: "Name: Z to A" },
];

const SORT_KEYS = new Set<string>(SORT_OPTIONS.map((o) => o.value));
const DIRECTIONS = new Set<string>(["all", "gainers", "losers"]);
const QUOTES = new Set<string>(KNOWN_QUOTES);
const MAX_QUERY_LENGTH = 64;

type ParamSource = URLSearchParams | { get(name: string): string | null };

/** Reads view state from the URL. Anything invalid falls back to the default. */
export function parseMarketParams(params: ParamSource): MarketParams {
  const d = DEFAULT_MARKET_PARAMS;

  const q = (params.get("q") ?? "").slice(0, MAX_QUERY_LENGTH);

  const rawQuote = params.get("quote")?.toUpperCase();
  const quote =
    rawQuote === "ALL" ? null : rawQuote && QUOTES.has(rawQuote) ? rawQuote : d.quote;

  const rawDir = params.get("dir") ?? "";
  const dir = DIRECTIONS.has(rawDir) ? (rawDir as Direction) : d.dir;

  const rawSort = params.get("sort") ?? "";
  const sort = SORT_KEYS.has(rawSort) ? (rawSort as SortKey) : d.sort;

  const rawPage = Number.parseInt(params.get("page") ?? "", 10);
  const page = Number.isFinite(rawPage) && rawPage >= 1 ? rawPage : d.page;

  return { q, quote, dir, sort, page };
}

/** Builds the query string, leaving out defaults so URLs stay short. */
export function serializeMarketParams(p: MarketParams): string {
  const d = DEFAULT_MARKET_PARAMS;
  const out = new URLSearchParams();
  const q = p.q.trim();
  if (q) out.set("q", q);
  if (p.quote !== d.quote) out.set("quote", p.quote ?? "all");
  if (p.dir !== d.dir) out.set("dir", p.dir);
  if (p.sort !== d.sort) out.set("sort", p.sort);
  if (p.page !== d.page) out.set("page", String(p.page));
  return out.toString();
}

/**
 * Applies a change. Anything that changes the result set (search, quote,
 * direction, sort) goes back to page 1, unless the patch sets a page itself.
 */
export function updateMarketParams(
  current: MarketParams,
  patch: Partial<MarketParams>,
): MarketParams {
  const next = { ...current, ...patch };
  const resetsPage =
    patch.page === undefined &&
    (["q", "quote", "dir", "sort"] as const).some(
      (k) => k in patch && patch[k] !== current[k],
    );
  return resetsPage ? { ...next, page: 1 } : next;
}

/** True when search, quote or direction narrow the list beyond the defaults. */
export function hasActiveFilters(p: MarketParams): boolean {
  const d = DEFAULT_MARKET_PARAMS;
  return p.q.trim() !== "" || p.quote !== d.quote || p.dir !== d.dir;
}

/** Back to the default view, keeping the sort. */
export function clearMarketFilters(p: MarketParams): MarketParams {
  const d = DEFAULT_MARKET_PARAMS;
  return { ...p, q: d.q, quote: d.quote, dir: d.dir, page: 1 };
}

// --- Sortable column headers ---------------------------------------------

export type SortColumn = "name" | "price" | "change" | "volume";

const COLUMN_KEYS: Record<SortColumn, { asc: SortKey; desc: SortKey }> = {
  name: { asc: "name_asc", desc: "name_desc" },
  price: { asc: "price_asc", desc: "price_desc" },
  change: { asc: "change_asc", desc: "change_desc" },
  volume: { asc: "volume_asc", desc: "volume_desc" },
};

/** Which way `column` is sorted right now, or null if it isn't. */
export function columnSortState(
  sort: SortKey,
  column: SortColumn,
): "asc" | "desc" | null {
  const keys = COLUMN_KEYS[column];
  if (sort === keys.asc) return "asc";
  if (sort === keys.desc) return "desc";
  return null;
}

/**
 * Sort after clicking a header: flip if it's already active, otherwise start
 * with the natural direction (names A to Z, numbers high to low).
 */
export function nextSortForColumn(sort: SortKey, column: SortColumn): SortKey {
  const keys = COLUMN_KEYS[column];
  const state = columnSortState(sort, column);
  if (state === "asc") return keys.desc;
  if (state === "desc") return keys.asc;
  return column === "name" ? keys.asc : keys.desc;
}
