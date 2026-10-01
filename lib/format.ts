import { isUsdQuote } from "./symbols";

// A fixed locale keeps server and client output identical (no hydration
// mismatches) and keeps number widths predictable.
const LOCALE = "en-US";
const EMPTY = "—";

const fixedFormatters = new Map<number, Intl.NumberFormat>();

function fixed(decimals: number): Intl.NumberFormat {
  let f = fixedFormatters.get(decimals);
  if (!f) {
    f = new Intl.NumberFormat(LOCALE, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
    fixedFormatters.set(decimals, f);
  }
  return f;
}

const compact = new Intl.NumberFormat(LOCALE, {
  notation: "compact",
  maximumFractionDigits: 2,
});

const percent = new Intl.NumberFormat(LOCALE, {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
  signDisplay: "exceptZero",
});

const integer = new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 0 });

/**
 * Decimals to show for a price, by magnitude:
 * - 100 and up: 2 (83,966.28)
 * - 1 to 100: 4 (2.4512)
 * - below 1: about 4 significant digits, between 4 and 8 decimals
 *   (0.05432, 0.0007400, 0.00001234)
 * The count depends only on magnitude, so a live price keeps its width
 * from tick to tick.
 */
export function priceDecimals(value: number): number {
  const abs = Math.abs(value);
  if (abs >= 100) return 2;
  if (abs >= 1) return 4;
  if (abs === 0) return 2;
  const leadingZeros = Math.ceil(-Math.log10(abs));
  return Math.min(8, Math.max(4, leadingZeros + 3));
}

type QuoteOption = {
  /** Quote asset. Dollar-like quotes (USDT, USDC, ...) get a "$" prefix. */
  quote?: string;
};

function withQuote(text: string, quote?: string): string {
  if (!quote || !isUsdQuote(quote)) return text;
  return text.startsWith("-") ? `-$${text.slice(1)}` : `$${text}`;
}

/** Price with adaptive precision. Never scientific notation. */
export function formatPrice(
  value: number,
  { quote, decimals }: QuoteOption & { decimals?: number } = {},
): string {
  if (!Number.isFinite(value)) return EMPTY;
  return withQuote(fixed(decimals ?? priceDecimals(value)).format(value), quote);
}

/** Compact amounts for volumes: 1.23K, 1.2M, 45.6B. */
export function formatCompact(
  value: number,
  { quote }: QuoteOption = {},
): string {
  if (!Number.isFinite(value)) return EMPTY;
  return withQuote(compact.format(value), quote);
}

/**
 * Signed percent with 2 decimals: +1.23%, -37.13%, 0.00%. The sign is part
 * of the text so movement never depends on color alone.
 */
export function formatPercent(value: number): string {
  if (!Number.isFinite(value)) return EMPTY;
  return `${percent.format(value)}%`;
}

const dateFormatters = new Map<string, Intl.DateTimeFormat>();

function dateTime(
  key: string,
  options: Intl.DateTimeFormatOptions,
): Intl.DateTimeFormat {
  let f = dateFormatters.get(key);
  if (!f) {
    f = new Intl.DateTimeFormat(LOCALE, options);
    dateFormatters.set(key, f);
  }
  return f;
}

/** "Sep 9, 2026". Pass timeZone for deterministic output (tests, SSR). */
export function formatDate(ms: number, { timeZone }: { timeZone?: string } = {}): string {
  if (!Number.isFinite(ms)) return EMPTY;
  return dateTime(`date:${timeZone ?? ""}`, {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone,
  }).format(ms);
}

/** "14:03:22", 24-hour. */
export function formatTime(ms: number, { timeZone }: { timeZone?: string } = {}): string {
  if (!Number.isFinite(ms)) return EMPTY;
  return dateTime(`time:${timeZone ?? ""}`, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
    timeZone,
  }).format(ms);
}

/** Whole numbers with grouping, e.g. trade counts. */
export function formatInteger(value: number): string {
  if (!Number.isFinite(value)) return EMPTY;
  return integer.format(value);
}
