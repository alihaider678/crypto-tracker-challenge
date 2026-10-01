/*
 * Lets the navbar search box focus the Markets search input. Replaced by the
 * command palette in Phase 7.
 *
 * - Already on /markets: an event focuses the input.
 * - Elsewhere: navigate to /markets#search; the input focuses on mount and
 *   removes the hash.
 */
export const MARKET_SEARCH_HASH = "#search";
const EVENT = "cryptopulse:focus-market-search";

export function requestMarketSearchFocus() {
  window.dispatchEvent(new Event(EVENT));
}

export function onMarketSearchFocusRequest(handler: () => void): () => void {
  window.addEventListener(EVENT, handler);
  return () => window.removeEventListener(EVENT, handler);
}

/** True (and clears the hash) when we arrived via /markets#search. */
export function consumeMarketSearchHash(): boolean {
  if (window.location.hash !== MARKET_SEARCH_HASH) return false;
  const { pathname, search } = window.location;
  window.history.replaceState(window.history.state, "", pathname + search);
  return true;
}
