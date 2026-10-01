import { useEffect, useSyncExternalStore } from "react";
import { useQueryClient, type QueryClient } from "@tanstack/react-query";

import { MINI_TICKER_STREAM_URL } from "@/lib/binance";
import { LiveTickerFeed, type FeedStatus } from "@/lib/live-feed";
import { mergeMiniTickers } from "@/lib/market";
import type { Ticker } from "@/lib/types";

import { tickersQueryKey } from "./useTickers";

const feeds = new WeakMap<QueryClient, LiveTickerFeed>();

function getFeed(queryClient: QueryClient): LiveTickerFeed {
  let feed = feeds.get(queryClient);
  if (!feed) {
    feed = new LiveTickerFeed({
      url: MINI_TICKER_STREAM_URL,
      // One cache write per second. Pairs that didn't change keep their
      // object identity, so memoized rows don't re-render.
      onBatch: (updates) =>
        queryClient.setQueryData<Ticker[]>(tickersQueryKey, (old) =>
          old ? mergeMiniTickers(old, updates) : old,
        ),
    });
    feeds.set(queryClient, feed);
  }
  return feed;
}

const serverStatus = (): FeedStatus => "connecting";

/**
 * Keeps the useTickers cache live from Binance's !miniTicker@arr stream and
 * returns the connection status. Every caller shares one socket. Updates are
 * dropped until the REST snapshot has loaded.
 */
export function useLiveTickers(): FeedStatus {
  const feed = getFeed(useQueryClient());
  useEffect(() => feed.retain(), [feed]);
  return useSyncExternalStore(feed.subscribe, feed.getStatus, serverStatus);
}
