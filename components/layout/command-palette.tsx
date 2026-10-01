"use client";

import { useDeferredValue, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { BarChart3, LayoutGrid, Star, type LucideIcon } from "lucide-react";

import { CoinIcon } from "@/components/market/coin-identity";
import { HaltedBadge } from "@/components/market/status-badges";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { tickersQueryOptions } from "@/hooks/useTickers";
import { formatPrice } from "@/lib/format";
import { isTradingHalted } from "@/lib/market";
import { buildSearchIndex, searchCoins, searchPages } from "@/lib/search";
import { pairLabel } from "@/lib/symbols";

// CommandItem appends a hidden check icon with ml-auto, which would split
// the free space with our right-aligned price. Nothing here is "checked".
const ITEM = "[&>svg:last-child]:hidden";

// cmdk compares item values as given; keep them lower-case and unique.
const pageValue = (href: string) => `page ${href}`;
const coinValue = (symbol: string) => `coin ${symbol.toLowerCase()}`;

const PAGE_ICONS: Record<string, LucideIcon> = {
  "/": LayoutGrid,
  "/markets": BarChart3,
  "/watchlist": Star,
};

/**
 * Ctrl/Cmd+K palette: jump to a coin (ticker, name or pair) or a page.
 * Loaded lazily by the Navbar, which also owns the shortcut and focus return.
 * Our own ranking replaces cmdk's filter (shouldFilter={false}): the index
 * is built once per snapshot, results are capped, and typing is deferred so
 * fast typing never blocks the input.
 */
export function CommandPalette({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);

  // Same cache entry as Markets/Overview; only fetched here while open.
  const tickers = useQuery({ ...tickersQueryOptions(), enabled: open });
  const index = useMemo(
    () => (tickers.data ? buildSearchIndex(tickers.data) : []),
    [tickers.data],
  );
  const coins = useMemo(() => searchCoins(index, deferredQuery), [index, deferredQuery]);
  const pages = searchPages(deferredQuery);
  const hasQuery = deferredQuery.trim() !== "";

  // Controlled selection. With our own filtering, cmdk doesn't always move
  // the highlight when the list is replaced (e.g. typing removes the Pages
  // group), which left Enter with nothing selected. Whenever the first
  // result changes, select it; arrow keys still move it as usual.
  const firstValue = hasQuery
    ? coins[0]
      ? coinValue(coins[0].symbol)
      : pages[0]
        ? pageValue(pages[0].href)
        : ""
    : pages[0]
      ? pageValue(pages[0].href)
      : "";
  const [selected, setSelected] = useState(firstValue);
  const [selectedFor, setSelectedFor] = useState(firstValue);
  if (firstValue !== selectedFor) {
    setSelectedFor(firstValue);
    setSelected(firstValue);
  }

  const setOpen = (next: boolean) => {
    if (!next) setQuery("");
    onOpenChange(next);
  };

  const go = (href: string) => {
    setOpen(false);
    router.push(href);
  };

  const pageGroup = pages.length > 0 && (
    <CommandGroup heading="Pages">
      {pages.map((p) => {
        const Icon = PAGE_ICONS[p.href] ?? LayoutGrid;
        return (
          <CommandItem
            key={p.href}
            value={pageValue(p.href)}
            onSelect={() => go(p.href)}
            className={ITEM}
          >
            <Icon aria-hidden />
            {p.label}
          </CommandItem>
        );
      })}
    </CommandGroup>
  );

  let coinGroup: React.ReactNode = null;
  if (tickers.isError && !tickers.data) {
    coinGroup = (
      <p className="px-3 py-4 text-sm text-muted-foreground">
        Couldn&apos;t load coins. Pages still work.
      </p>
    );
  } else if (!tickers.data) {
    coinGroup = <p className="px-3 py-4 text-sm text-muted-foreground">Loading coins…</p>;
  } else if (coins.length > 0) {
    coinGroup = (
      <CommandGroup heading={hasQuery ? "Coins" : "Popular"}>
        {coins.map((t) => {
          const halted = isTradingHalted(t);
          return (
            <CommandItem
              key={t.symbol}
              value={coinValue(t.symbol)}
              onSelect={() => go(`/coin/${t.symbol}`)}
              className={`gap-3 ${ITEM}`}
            >
              <CoinIcon key={t.baseAsset} baseAsset={t.baseAsset} size={20} />
              <span className="min-w-0 truncate font-medium">{t.name}</span>
              <span className="shrink-0 text-xs text-muted-foreground">{pairLabel(t)}</span>
              {halted && <HaltedBadge short />}
              <span
                className={
                  halted
                    ? "num ml-auto shrink-0 text-xs text-muted-foreground"
                    : "num ml-auto shrink-0 text-xs"
                }
              >
                {formatPrice(t.lastPrice, { quote: t.quoteAsset })}
              </span>
            </CommandItem>
          );
        })}
      </CommandGroup>
    );
  }

  return (
    <CommandDialog
      open={open}
      onOpenChange={setOpen}
      title="Search CryptoPulse"
      description="Jump to a coin or a page"
      className="sm:max-w-xl"
    >
      <Command shouldFilter={false} loop value={selected} onValueChange={setSelected}>
        <CommandInput
          value={query}
          onValueChange={setQuery}
          placeholder="Search coins, pairs or pages…"
          aria-label="Search coins, pairs or pages"
        />
        <CommandList className="max-h-[min(420px,60vh)]">
          {tickers.data && <CommandEmpty>No results for “{deferredQuery.trim()}”.</CommandEmpty>}
          {/* Coins lead once you type; pages lead on an empty query. */}
          {hasQuery ? (
            <>
              {coinGroup}
              {pageGroup}
            </>
          ) : (
            <>
              {pageGroup}
              {coinGroup}
            </>
          )}
        </CommandList>
      </Command>
    </CommandDialog>
  );
}
