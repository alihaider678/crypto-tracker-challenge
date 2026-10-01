"use client";

import { memo, useRef } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { useInViewOnce } from "@/hooks/useInView";
import { useSparkline } from "@/hooks/useKlines";
import type { ChangeDirection } from "@/lib/market";

import { SPARKLINE_SIZE } from "./market-columns";
import { Sparkline } from "./sparkline";

/**
 * Loads the 24h sparkline once the cell scrolls near the viewport. Only the
 * current page's rows exist, so at most 50 load. The box has a fixed size,
 * so nothing shifts when the line arrives. Halted pairs skip the request:
 * their last candles are weeks old.
 */
export const SparklineCell = memo(function SparklineCell({
  symbol,
  halted,
  trend,
}: {
  symbol: string;
  halted: boolean;
  /** The row's 24h direction, so the line's color matches its badge. */
  trend: ChangeDirection;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInViewOnce(ref);
  const { data, isPending, isError } = useSparkline(symbol, {
    enabled: inView && !halted,
  });

  let content: React.ReactNode;
  if (halted) {
    content = <span className="text-xs text-muted-foreground">No recent trades</span>;
  } else if (isError) {
    content = <span className="text-xs text-muted-foreground">—</span>;
  } else if (isPending || !data) {
    content = <Skeleton className="size-full" />;
  } else {
    content = <Sparkline values={data} trend={trend} {...SPARKLINE_SIZE} />;
  }

  return (
    <div
      ref={ref}
      style={SPARKLINE_SIZE}
      className="ml-auto flex items-center justify-end"
    >
      {content}
    </div>
  );
});
