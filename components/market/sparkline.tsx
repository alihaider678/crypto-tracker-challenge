import type { ChangeDirection } from "@/lib/market";
import { seriesTrend, sparklinePoints } from "@/lib/sparkline";
import { cn } from "@/lib/utils";

/**
 * Tiny trend line. Pass `trend` (the row's 24h direction) so the color
 * always agrees with the change badge next to it; without it, the line's
 * own first-vs-last movement is used.
 */
export function Sparkline({
  values,
  width,
  height,
  trend,
  muted = false,
  fluid = false,
  className,
}: {
  values: number[];
  /** Drawing size; with `fluid`, only the aspect used for the path. */
  width: number;
  height: number;
  trend?: ChangeDirection;
  muted?: boolean;
  /** Stretch to fill the parent box (the stroke keeps its width). */
  fluid?: boolean;
  className?: string;
}) {
  const direction = trend ?? seriesTrend(values);
  const points = sparklinePoints(values, width, height);

  return (
    <svg
      width={fluid ? "100%" : width}
      height={fluid ? "100%" : height}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio={fluid ? "none" : undefined}
      aria-hidden
      className={cn(
        "overflow-visible",
        muted || direction === "flat"
          ? "text-muted-foreground"
          : direction === "up"
            ? "text-positive"
            : "text-negative",
        className,
      )}
    >
      {points && (
        <polyline
          points={points}
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          strokeLinejoin="round"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
      )}
    </svg>
  );
}
