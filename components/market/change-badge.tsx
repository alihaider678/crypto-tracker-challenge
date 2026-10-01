import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";

import { formatPercent } from "@/lib/format";
import { changeDirection } from "@/lib/market";
import { cn } from "@/lib/utils";

/**
 * 24h change pill: arrow icon + signed number + color, so the direction
 * never depends on color alone. `muted` drops the color (halted pairs,
 * whose change is a frozen snapshot) but keeps the arrow and sign.
 */
export function ChangeBadge({
  value,
  muted = false,
  className,
}: {
  value: number;
  muted?: boolean;
  className?: string;
}) {
  const text = formatPercent(value);
  const direction = changeDirection(value);
  const Icon =
    direction === "up" ? ArrowUpRight : direction === "down" ? ArrowDownRight : Minus;

  return (
    <span
      className={cn(
        "num inline-flex h-6 items-center gap-0.5 rounded-full px-2 text-xs font-medium",
        muted || direction === "flat"
          ? "bg-elevated text-muted-foreground"
          : direction === "up"
            ? "bg-positive-bg text-positive"
            : "bg-negative-bg text-negative",
        className,
      )}
    >
      <Icon className="size-3.5 shrink-0" aria-hidden />
      <span className="sr-only">
        {direction === "up" ? "Up" : direction === "down" ? "Down" : "Unchanged"}{" "}
      </span>
      {text}
    </span>
  );
}
