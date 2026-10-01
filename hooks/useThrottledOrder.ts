import { useEffect, useMemo, useRef, useState } from "react";

import { applyFrozenOrder } from "@/lib/market";
import type { Ticker } from "@/lib/types";

/**
 * Holds the row order of a live-sorted list and re-sorts at most every
 * `intervalMs`, while every row keeps showing its latest values. Without
 * this, sorting by 24h % or price reshuffles rows every second.
 *
 * A new `resetKey` (search, filter or sort change) takes a fresh order
 * immediately, so user actions never feel delayed.
 */
export function useThrottledOrder(
  list: Ticker[],
  { enabled, resetKey, intervalMs = 5000 }: { enabled: boolean; resetKey: string; intervalMs?: number },
): Ticker[] {
  const latest = useRef(list);
  useEffect(() => {
    latest.current = list;
  });

  const [frozen, setFrozen] = useState<{ key: string; symbols: string[] } | null>(null);
  const current = enabled && frozen?.key === resetKey ? frozen.symbols : null;

  // First data for this view: snapshot right away (adjusting state while
  // rendering, React's pattern for deriving state from a prop change).
  if (enabled && list.length > 0 && !current) {
    setFrozen({ key: resetKey, symbols: list.map((t) => t.symbol) });
  }

  useEffect(() => {
    if (!enabled) return;
    const id = setInterval(() => {
      setFrozen({ key: resetKey, symbols: latest.current.map((t) => t.symbol) });
    }, intervalMs);
    return () => clearInterval(id);
  }, [enabled, resetKey, intervalMs]);

  return useMemo(() => applyFrozenOrder(list, current), [list, current]);
}
