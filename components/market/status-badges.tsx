import { PauseCircle } from "lucide-react";

import { cn } from "@/lib/utils";

const PILL =
  "inline-flex h-5 shrink-0 items-center gap-1 rounded-full border px-2 text-xs font-medium";

/** Teal "Featured" tag for the pinned pair (VANRY). */
export function FeaturedBadge({ className }: { className?: string }) {
  return (
    <span className={cn(PILL, "border-primary/40 bg-primary/10 text-primary", className)}>
      Featured
    </span>
  );
}

/**
 * Neutral tag for pairs with no trades in the last 24h. Reads "Halted" on
 * small screens (or always, with `short`) and "Trading halted" otherwise.
 */
export function HaltedBadge({ short = false, className }: { short?: boolean; className?: string }) {
  return (
    <span className={cn(PILL, "border-border bg-elevated text-muted-foreground", className)}>
      <PauseCircle className="size-3" aria-hidden />
      <span className={short ? undefined : "sm:hidden"}>Halted</span>
      {!short && <span className="hidden sm:inline">Trading halted</span>}
    </span>
  );
}
