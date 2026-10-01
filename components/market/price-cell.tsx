"use client";

import { useState } from "react";

import { formatPrice } from "@/lib/format";
import { tickDirection, type TickDirection } from "@/lib/market";
import { cn } from "@/lib/utils";

type Flash = { direction: Exclude<TickDirection, null>; id: number };

/**
 * Mono, tabular price. Flashes green/red for 400ms when the value ticks up
 * or down. The flash is off when `flash` is false (halted pairs) and under
 * prefers-reduced-motion (motion-safe).
 */
export function PriceCell({
  value,
  quote,
  flash: canFlash = true,
  muted = false,
  className,
}: {
  value: number;
  quote: string;
  flash?: boolean;
  muted?: boolean;
  className?: string;
}) {
  // Compare with the previous render's value; React's documented pattern
  // for reacting to a prop change without an effect.
  const [prev, setPrev] = useState(value);
  const [flash, setFlash] = useState<Flash | null>(null);
  if (value !== prev) {
    setPrev(value);
    const direction = tickDirection(prev, value);
    if (canFlash && direction) {
      setFlash({ direction, id: (flash?.id ?? 0) + 1 });
    }
  }

  return (
    <span
      // A new key restarts the animation on every tick.
      key={flash?.id ?? 0}
      className={cn(
        "num -mx-1 inline-block rounded-sm px-1 font-medium",
        muted ? "text-muted-foreground" : "text-foreground",
        flash?.direction === "up" && "motion-safe:animate-flash-up",
        flash?.direction === "down" && "motion-safe:animate-flash-down",
        className,
      )}
    >
      {formatPrice(value, { quote })}
    </span>
  );
}
