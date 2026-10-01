"use client";

import { memo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCompact, formatDate, formatPrice } from "@/lib/format";
import { PINNED_SYMBOL, changeDirection, type SortKey } from "@/lib/market";
import {
  columnSortState,
  nextSortForColumn,
  type SortColumn,
} from "@/lib/market-params";
import { isUsdQuote, pairLabel } from "@/lib/symbols";
import type { Ticker } from "@/lib/types";
import { cn } from "@/lib/utils";

import { ChangeBadge } from "./change-badge";
import { CoinIdentity } from "./coin-identity";
import { CELL_CLASS, COLUMN_CLASS } from "./market-columns";
import { PriceCell } from "./price-cell";
import { SparklineCell } from "./sparkline-cell";
import { StarButton } from "./star-button";
import { FeaturedBadge, HaltedBadge } from "./status-badges";

export function MarketTable({
  rows,
  firstRank,
  sort,
  onSort,
  pinnedSymbol = PINNED_SYMBOL,
}: {
  rows: Ticker[];
  /** Rank of the first row (page offset + 1). */
  firstRank: number;
  sort: SortKey;
  onSort: (sort: SortKey) => void;
  pinnedSymbol?: string;
}) {
  return (
    <div className="rounded-xl border border-border">
      <Table
        aria-label="Markets"
        // overflow-x-auto would make the wrapper a scroll container and break
        // the sticky header; columns collapse on small screens instead.
        containerClassName="overflow-visible"
        className="table-fixed md:table-auto"
      >
        <TableHeader className="[&_tr]:border-0">
          <TableRow className="hover:bg-transparent">
            <Th className={COLUMN_CLASS.star}>
              <span className="sr-only">Watchlist</span>
            </Th>
            <Th className={COLUMN_CLASS.rank}>#</Th>
            <SortableTh column="name" sort={sort} onSort={onSort} className={COLUMN_CLASS.coin}>
              Coin
            </SortableTh>
            <SortableTh column="price" sort={sort} onSort={onSort} className={COLUMN_CLASS.price}>
              Price
            </SortableTh>
            <SortableTh column="change" sort={sort} onSort={onSort} className={COLUMN_CLASS.change}>
              24h %
            </SortableTh>
            <Th className={COLUMN_CLASS.range}>24h High / Low</Th>
            <SortableTh column="volume" sort={sort} onSort={onSort} className={COLUMN_CLASS.volume}>
              24h Volume
            </SortableTh>
            <Th className={cn(COLUMN_CLASS.spark, "text-right")}>Last 24h</Th>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((ticker, i) => (
            <MarketRow
              key={ticker.symbol}
              ticker={ticker}
              rank={firstRank + i}
              featured={ticker.symbol === pinnedSymbol}
            />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

// --- Header -----------------------------------------------------------------

// Sticky under the 64px navbar. Each cell carries its own background and
// bottom rule because sticky <thead> borders don't render with collapsed
// table borders.
const TH_CLASS =
  "sticky top-16 z-10 h-10 bg-background text-xs font-medium text-muted-foreground shadow-[inset_0_-1px_0_hsl(var(--border))] first:rounded-tl-xl last:rounded-tr-xl";

function Th({ className, children }: { className?: string; children?: React.ReactNode }) {
  return <TableHead className={cn(CELL_CLASS, TH_CLASS, className)}>{children}</TableHead>;
}

function SortableTh({
  column,
  sort,
  onSort,
  className,
  children,
}: {
  column: SortColumn;
  sort: SortKey;
  onSort: (sort: SortKey) => void;
  className?: string;
  children: React.ReactNode;
}) {
  const state = columnSortState(sort, column);
  const Icon = state === "asc" ? ArrowUp : state === "desc" ? ArrowDown : ChevronsUpDown;
  const alignRight = className?.includes("text-right");

  return (
    <TableHead
      aria-sort={state === "asc" ? "ascending" : state === "desc" ? "descending" : "none"}
      className={cn(CELL_CLASS, TH_CLASS, className)}
    >
      <button
        type="button"
        onClick={() => onSort(nextSortForColumn(sort, column))}
        className={cn(
          "-mx-1.5 inline-flex h-7 items-center gap-1 rounded-lg px-1.5 transition-colors outline-none hover:bg-elevated active:bg-border/60 hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50",
          state && "text-foreground",
          alignRight && "flex-row-reverse",
        )}
      >
        {children}
        <Icon
          className={cn("size-3.5", !state && "opacity-50")}
          aria-hidden
        />
      </button>
    </TableHead>
  );
}

// --- Row --------------------------------------------------------------------

/**
 * One pair. Memoized on the ticker object: the live merge keeps unchanged
 * tickers' identity, so a tick only re-renders the rows that changed.
 */
const MarketRow = memo(function MarketRow({
  ticker: t,
  rank,
  featured,
}: {
  ticker: Ticker;
  rank: number;
  featured: boolean;
}) {
  const router = useRouter();
  const href = `/coin/${t.symbol}`;
  const label = pairLabel(t);

  const onRowClick = (e: React.MouseEvent<HTMLTableRowElement>) => {
    // Links and buttons inside the row handle their own clicks.
    if ((e.target as HTMLElement).closest("a, button")) return;
    if (e.metaKey || e.ctrlKey) window.open(href, "_blank", "noopener");
    else router.push(href);
  };

  return (
    <TableRow
      onClick={onRowClick}
      className={cn(
        "h-[52px] cursor-pointer border-border hover:bg-elevated/60 active:bg-elevated",
        featured && "bg-primary/[0.04] hover:bg-primary/[0.08] active:bg-primary/[0.12]",
      )}
    >
      <TableCell className={cn(CELL_CLASS, COLUMN_CLASS.star)}>
        <StarButton symbol={t.symbol} label={label} />
      </TableCell>
      <TableCell className={cn(CELL_CLASS, COLUMN_CLASS.rank, "text-xs text-muted-foreground tabular-nums")}>
        {rank}
      </TableCell>
      <TableCell
        className={cn(
          CELL_CLASS,
          COLUMN_CLASS.coin,
          "max-w-0 md:max-w-none",
          featured && "shadow-[inset_2px_0_0_hsl(var(--primary))] sm:shadow-none",
        )}
      >
        <Link
          href={href}
          prefetch={false}
          className="block rounded-lg outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          aria-label={`${t.name}, ${label}${t.halted ? ", trading halted" : ""}`}
        >
          <CoinIdentity
            baseAsset={t.baseAsset}
            quoteAsset={t.quoteAsset}
            name={t.name}
            meta={
              t.halted ? (
                <span>
                  {" · "}Last trade: {formatDate(t.updatedAt)}
                </span>
              ) : null
            }
          >
            {featured && <FeaturedBadge />}
            {t.halted && <HaltedBadge />}
          </CoinIdentity>
        </Link>
      </TableCell>
      <TableCell className={cn(CELL_CLASS, COLUMN_CLASS.price)}>
        <PriceCell
          value={t.lastPrice}
          quote={t.quoteAsset}
          flash={!t.halted}
          muted={t.halted}
        />
      </TableCell>
      <TableCell className={cn(CELL_CLASS, COLUMN_CLASS.change)}>
        <ChangeBadge value={t.priceChangePercent} muted={t.halted} />
      </TableCell>
      <TableCell className={cn(CELL_CLASS, COLUMN_CLASS.range, "num text-xs leading-4")}>
        <div className="text-foreground">
          <span className="text-muted-foreground">H </span>
          {formatPrice(t.highPrice)}
        </div>
        <div className="text-foreground">
          <span className="text-muted-foreground">L </span>
          {formatPrice(t.lowPrice)}
        </div>
      </TableCell>
      <TableCell className={cn(CELL_CLASS, COLUMN_CLASS.volume, "num")}>
        {formatCompact(t.quoteVolume, { quote: t.quoteAsset })}
        {!isUsdQuote(t.quoteAsset) && (
          <span className="ml-1 text-xs text-muted-foreground">{t.quoteAsset}</span>
        )}
      </TableCell>
      <TableCell className={cn(CELL_CLASS, COLUMN_CLASS.spark)}>
        <SparklineCell
          symbol={t.symbol}
          halted={t.halted}
          trend={changeDirection(t.priceChangePercent)}
        />
      </TableCell>
    </TableRow>
  );
});
