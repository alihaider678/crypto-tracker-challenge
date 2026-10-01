"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, Search, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { Direction, QuoteOption, SortKey } from "@/lib/market";
import { SORT_OPTIONS, type MarketParams } from "@/lib/market-params";
import { cn } from "@/lib/utils";

const ALL_QUOTES = "ALL";
const SEARCH_DEBOUNCE_MS = 250;

const PILL_CLASS =
  "h-7 rounded-full border border-transparent px-3 text-xs text-muted-foreground hover:bg-elevated hover:text-foreground active:bg-border/60 data-[state=on]:border-border data-[state=on]:bg-elevated data-[state=on]:text-foreground";

type ChangeFn = (patch: Partial<MarketParams>, options?: { replace?: boolean }) => void;

export function MarketToolbar({
  params,
  quotes,
  onChange,
}: {
  params: MarketParams;
  quotes: { primary: QuoteOption[]; more: QuoteOption[] };
  onChange: ChangeFn;
}) {
  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <SearchInput value={params.q} onChange={onChange} />
        <div className="flex min-w-0 items-center gap-2 md:ml-auto">
          <DirectionControl
            value={params.dir}
            onChange={(dir) => onChange({ dir })}
          />
          <SortSelect value={params.sort} onChange={(sort) => onChange({ sort })} />
        </div>
      </div>
      <QuotePills
        value={params.quote}
        quotes={quotes}
        onChange={(quote) => onChange({ quote })}
      />
    </div>
  );
}

// --- Search ---------------------------------------------------------------

function SearchInput({ value, onChange }: { value: string; onChange: ChangeFn }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [text, setText] = useState(value);
  // The last value this input wrote to the URL, and the last URL value seen.
  const [sent, setSent] = useState(value);
  const [seen, setSeen] = useState(value);

  // The URL changed from outside (back button, "Clear filters"): show it.
  // Our own debounced write coming back is ignored, so fast typing isn't
  // overwritten by an older value.
  if (value !== seen) {
    setSeen(value);
    if (value !== sent) {
      setText(value);
      setSent(value);
    }
  }

  useEffect(() => {
    const next = text.trim();
    if (next === value) return;
    const timer = setTimeout(() => {
      setSent(next);
      onChange({ q: next }, { replace: true });
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [text, value, onChange]);

  return (
    <div className="relative md:w-72 lg:w-80">
      <Search
        className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden
      />
      <Input
        ref={inputRef}
        id="market-search"
        type="search"
        inputMode="search"
        autoComplete="off"
        spellCheck={false}
        placeholder="Search coin, name or pair"
        aria-label="Search markets"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Escape" && text) {
            e.preventDefault();
            setText("");
          }
        }}
        className="h-9 bg-surface pr-9 pl-8 hover:border-muted-foreground/40 [&::-webkit-search-cancel-button]:hidden"
      />
      {text && (
        <Button
          variant="ghost"
          size="icon-xs"
          aria-label="Clear search"
          onClick={() => {
            setText("");
            inputRef.current?.focus();
          }}
          className="absolute top-1/2 right-1.5 -translate-y-1/2 text-muted-foreground"
        >
          <X aria-hidden />
        </Button>
      )}
    </div>
  );
}

// --- Gainers / losers -----------------------------------------------------

const DIRECTIONS: { value: Direction; label: string }[] = [
  { value: "all", label: "All" },
  { value: "gainers", label: "Gainers" },
  { value: "losers", label: "Losers" },
];

function DirectionControl({
  value,
  onChange,
}: {
  value: Direction;
  onChange: (value: Direction) => void;
}) {
  return (
    <ToggleGroup
      type="single"
      variant="outline"
      spacing={0}
      value={value}
      // Radix sends "" when the active item is clicked again; keep it.
      onValueChange={(v) => v && onChange(v as Direction)}
      aria-label="Show"
      className="shrink-0 rounded-lg bg-surface"
    >
      {DIRECTIONS.map((d) => (
        <ToggleGroupItem
          key={d.value}
          value={d.value}
          className="h-9 px-3 text-muted-foreground active:bg-border/60 data-[state=on]:bg-elevated data-[state=on]:text-foreground"
        >
          {d.label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}

// --- Sort -------------------------------------------------------------------

function SortSelect({
  value,
  onChange,
}: {
  value: SortKey;
  onChange: (value: SortKey) => void;
}) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as SortKey)}>
      <SelectTrigger
        aria-label="Sort by"
        className="h-9 min-w-0 flex-1 bg-surface hover:bg-elevated active:bg-border/60 md:w-56 md:flex-none [&>span]:truncate"
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent position="popper" align="end">
        {SORT_OPTIONS.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

// --- Quote assets -------------------------------------------------------------

function QuotePills({
  value,
  quotes,
  onChange,
}: {
  value: string | null;
  quotes: { primary: QuoteOption[]; more: QuoteOption[] };
  onChange: (quote: string | null) => void;
}) {
  const selected = value ?? ALL_QUOTES;
  const inMore = quotes.more.some((o) => o.quote === value);

  return (
    // Scrolls sideways on small screens instead of overflowing the page.
    <div className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none] md:mx-0 md:px-0">
      <div className="flex w-max items-center gap-1">
        <ToggleGroup
          type="single"
          spacing={1}
          value={inMore ? "" : selected}
          onValueChange={(v) => v && onChange(v === ALL_QUOTES ? null : v)}
          aria-label="Quote asset"
        >
          <ToggleGroupItem value={ALL_QUOTES} className={PILL_CLASS}>
            All
          </ToggleGroupItem>
          {quotes.primary.map((o) => (
            <ToggleGroupItem key={o.quote} value={o.quote} className={PILL_CLASS}>
              {o.quote}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>

        {quotes.more.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                data-state={inMore ? "on" : "off"}
                className={cn(PILL_CLASS, "gap-1")}
              >
                {inMore ? value : "More"}
                <ChevronDown aria-hidden />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="max-h-80 w-48">
              <DropdownMenuLabel>Other quote assets</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuRadioGroup
                value={inMore ? (value ?? "") : ""}
                onValueChange={(v) => onChange(v)}
              >
                {quotes.more.map((o) => (
                  <DropdownMenuRadioItem key={o.quote} value={o.quote}>
                    <span className="flex-1">{o.quote}</span>
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {o.count}
                    </span>
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  );
}
