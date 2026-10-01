import { formatPrice } from "@/lib/format";
import { rangePosition } from "@/lib/market";
import { cn } from "@/lib/utils";

/**
 * 24h low -> high track with a marker at the last price. Neutral colors:
 * a position in the range isn't a direction, so no green/red.
 */
export function RangeBar({
  low,
  high,
  price,
  quote,
  muted = false,
  className,
}: {
  low: number;
  high: number;
  price: number;
  quote: string;
  muted?: boolean;
  className?: string;
}) {
  const position = rangePosition(low, high, price);
  const lowText = formatPrice(low, { quote });
  const highText = formatPrice(high, { quote });

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-baseline justify-between gap-3 text-xs text-muted-foreground">
        <span>24h Low</span>
        <span>24h range</span>
        <span>24h High</span>
      </div>
      <div
        role="img"
        aria-label={
          position === null
            ? "24h range unavailable"
            : `Last price ${formatPrice(price, { quote })}, in a 24h range of ${lowText} to ${highText}`
        }
        className="relative h-1.5 rounded-full bg-elevated"
      >
        {position !== null && (
          <>
            <div
              className={cn(
                "absolute inset-y-0 left-0 rounded-full",
                muted ? "bg-muted-foreground/30" : "bg-muted-foreground/50",
              )}
              style={{ width: `${position * 100}%` }}
            />
            <div
              className={cn(
                "absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-surface",
                muted ? "bg-muted-foreground" : "bg-foreground",
              )}
              style={{ left: `${position * 100}%` }}
            />
          </>
        )}
      </div>
      <div
        className={cn(
          "num flex justify-between gap-3 text-sm",
          muted ? "text-muted-foreground" : "text-foreground",
        )}
      >
        <span>{lowText}</span>
        <span>{highText}</span>
      </div>
    </div>
  );
}
