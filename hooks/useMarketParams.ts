import { useCallback, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import {
  parseMarketParams,
  serializeMarketParams,
  updateMarketParams,
  type MarketParams,
} from "@/lib/market-params";

type NavigateOptions = {
  /** Replace the history entry (typing) instead of pushing (discrete changes). */
  replace?: boolean;
  scroll?: boolean;
};

/**
 * Markets view state, read from and written to the URL, so views are
 * shareable and the back button works. Needs a Suspense boundary above it
 * (useSearchParams).
 */
export function useMarketParams() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  const params = useMemo(() => parseMarketParams(searchParams), [searchParams]);

  const hrefFor = useCallback(
    (next: MarketParams) => {
      const qs = serializeMarketParams(next);
      return qs ? `${pathname}?${qs}` : pathname;
    },
    [pathname],
  );

  const setParams = useCallback(
    (
      patch: Partial<MarketParams>,
      { replace = false, scroll = false }: NavigateOptions = {},
    ) => {
      const href = hrefFor(updateMarketParams(params, patch));
      if (replace) router.replace(href, { scroll });
      else router.push(href, { scroll });
    },
    [hrefFor, params, router],
  );

  /** Navigate to a complete params object (e.g. "Clear filters"). */
  const navigate = useCallback(
    (next: MarketParams, options: NavigateOptions = {}) => {
      const href = hrefFor(next);
      if (options.replace) router.replace(href, { scroll: options.scroll ?? false });
      else router.push(href, { scroll: options.scroll ?? false });
    },
    [hrefFor, router],
  );

  return { params, setParams, navigate, hrefFor };
}
