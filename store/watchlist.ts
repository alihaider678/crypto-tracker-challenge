import { useEffect } from "react";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export const WATCHLIST_STORAGE_KEY = "cryptopulse:watchlist";

type WatchlistState = {
  /** Starred pairs, oldest first. */
  symbols: string[];
  /** True once localStorage has been read. Before that, `symbols` is empty. */
  hydrated: boolean;
  toggle: (symbol: string) => void;
  add: (symbol: string) => void;
  remove: (symbol: string) => void;
  clear: () => void;
};

/*
 * SSR-safe: skipHydration keeps the server render and the first client
 * render identical (empty list). useWatchlistHydration() reads storage after
 * mount. The selector hooks below call it, so consumers don't have to.
 */
export const useWatchlist = create<WatchlistState>()(
  persist(
    (set, get) => ({
      symbols: [],
      hydrated: false,
      toggle: (symbol) => {
        const s = symbol.toUpperCase();
        if (get().symbols.includes(s)) get().remove(s);
        else get().add(s);
      },
      add: (symbol) => {
        const s = symbol.toUpperCase();
        set((state) =>
          state.symbols.includes(s) ? state : { symbols: [...state.symbols, s] },
        );
      },
      remove: (symbol) => {
        const s = symbol.toUpperCase();
        set((state) => ({ symbols: state.symbols.filter((x) => x !== s) }));
      },
      clear: () => set({ symbols: [] }),
    }),
    {
      name: WATCHLIST_STORAGE_KEY,
      version: 1,
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
      partialize: (state) => ({ symbols: state.symbols }),
      // Ignore anything in storage that isn't a list of strings.
      merge: (persisted, current) => {
        const raw = (persisted as { symbols?: unknown } | undefined)?.symbols;
        const symbols = Array.isArray(raw)
          ? [
              ...new Set(
                raw
                  .filter((x): x is string => typeof x === "string")
                  .map((x) => x.toUpperCase()),
              ),
            ]
          : [];
        return { ...current, symbols };
      },
      // Runs after success and failure (e.g. storage blocked): either way
      // we're done waiting.
      onRehydrateStorage: () => () => {
        useWatchlist.setState({ hydrated: true });
      },
    },
  ),
);

/** Loads the saved watchlist after mount and follows changes from other tabs. */
export function useWatchlistHydration(): boolean {
  const hydrated = useWatchlist((s) => s.hydrated);

  useEffect(() => {
    if (!useWatchlist.persist.hasHydrated()) {
      void useWatchlist.persist.rehydrate();
    }
    const onStorage = (e: StorageEvent) => {
      if (e.key === WATCHLIST_STORAGE_KEY) void useWatchlist.persist.rehydrate();
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  return hydrated;
}

export function useWatchlistSymbols(): string[] {
  useWatchlistHydration();
  return useWatchlist((s) => s.symbols);
}

export function useIsWatched(symbol: string): boolean {
  useWatchlistHydration();
  const upper = symbol.toUpperCase();
  return useWatchlist((s) => s.symbols.includes(upper));
}
