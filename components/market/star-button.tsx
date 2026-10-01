"use client";

import { memo } from "react";
import { Star } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useWatchlist } from "@/store/watchlist";

/**
 * Watchlist toggle. Reads the store directly (no hydration hook per row);
 * the page calls useWatchlistHydration once.
 */
export const StarButton = memo(function StarButton({
  symbol,
  label,
}: {
  symbol: string;
  label: string;
}) {
  const watched = useWatchlist((s) => s.symbols.includes(symbol));
  const toggle = useWatchlist((s) => s.toggle);

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      aria-pressed={watched}
      aria-label={watched ? `Remove ${label} from watchlist` : `Add ${label} to watchlist`}
      onClick={() => toggle(symbol)}
      className={cn(
        "text-muted-foreground hover:text-foreground",
        watched && "text-primary hover:text-primary",
      )}
    >
      <Star className={cn(watched && "fill-current")} aria-hidden />
    </Button>
  );
});
