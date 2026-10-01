import { formatCompact, formatInteger, formatPrice } from "@/lib/format";
import { isUsdQuote } from "@/lib/symbols";
import type { Ticker } from "@/lib/types";
import { cn } from "@/lib/utils";

/** 24h stats. Real exchange figures only; there is no market cap here. */
export function StatsGrid({ ticker: t, halted }: { ticker: Ticker; halted: boolean }) {
  const quote = t.quoteAsset;
  const quoteVolume = formatCompact(t.quoteVolume, { quote });

  const stats = [
    { label: "24h High", value: formatPrice(t.highPrice, { quote }) },
    { label: "24h Low", value: formatPrice(t.lowPrice, { quote }) },
    { label: `24h Volume (${t.baseAsset})`, value: `${formatCompact(t.volume)} ${t.baseAsset}` },
    {
      label: `24h Volume (${quote})`,
      value: isUsdQuote(quote) ? quoteVolume : `${quoteVolume} ${quote}`,
    },
    { label: "Open price (24h)", value: formatPrice(t.openPrice, { quote }) },
    { label: "Trades (24h)", value: formatInteger(t.tradeCount), count: true },
  ];

  return (
    <section aria-labelledby="stats-heading" className="space-y-3">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="stats-heading" className="text-base font-semibold">
          24h statistics
        </h2>
        {halted && (
          <span className="text-xs text-muted-foreground">As of the last trade</span>
        )}
      </div>
      <dl className="grid grid-cols-2 gap-3 md:grid-cols-3">
        {stats.map((s) => (
          <div
            key={s.label}
            className="min-w-0 rounded-xl border border-border bg-surface px-4 py-3"
          >
            <dt className="truncate text-xs text-muted-foreground">{s.label}</dt>
            <dd
              className={cn(
                "mt-1 truncate text-base font-medium",
                // Mono for prices and volumes; counts use Inter with tabular figures.
                "count" in s ? "tabular-nums" : "num",
                halted ? "text-muted-foreground" : "text-foreground",
              )}
            >
              {s.value}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
