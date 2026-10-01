import { beforeEach, describe, expect, it, vi } from "vitest";

class MemoryStorage {
  private data = new Map<string, string>();
  getItem = (k: string) => this.data.get(k) ?? null;
  setItem = (k: string, v: string) => void this.data.set(k, v);
  removeItem = (k: string) => void this.data.delete(k);
}

let storage: MemoryStorage;

async function loadStore() {
  vi.resetModules();
  return import("@/store/watchlist");
}

beforeEach(() => {
  storage = new MemoryStorage();
  vi.stubGlobal("localStorage", storage);
});

describe("watchlist store", () => {
  it("starts empty and unhydrated, even with saved data (SSR-safe)", async () => {
    storage.setItem(
      "cryptopulse:watchlist",
      JSON.stringify({ state: { symbols: ["BTCUSDT"] }, version: 1 }),
    );
    const { useWatchlist } = await loadStore();
    expect(useWatchlist.getState().symbols).toEqual([]);
    expect(useWatchlist.getState().hydrated).toBe(false);
  });

  it("loads saved symbols on rehydrate", async () => {
    storage.setItem(
      "cryptopulse:watchlist",
      JSON.stringify({ state: { symbols: ["BTCUSDT", "ethusdt"] }, version: 1 }),
    );
    const { useWatchlist } = await loadStore();
    await useWatchlist.persist.rehydrate();
    expect(useWatchlist.getState().symbols).toEqual(["BTCUSDT", "ETHUSDT"]);
    expect(useWatchlist.getState().hydrated).toBe(true);
  });

  it("ignores corrupt saved data", async () => {
    storage.setItem(
      "cryptopulse:watchlist",
      JSON.stringify({ state: { symbols: [1, null, "SOLUSDT"] }, version: 1 }),
    );
    const { useWatchlist } = await loadStore();
    await useWatchlist.persist.rehydrate();
    expect(useWatchlist.getState().symbols).toEqual(["SOLUSDT"]);
  });

  it("toggles, dedupes and persists only the symbols", async () => {
    const { useWatchlist } = await loadStore();
    await useWatchlist.persist.rehydrate();
    const { toggle, add } = useWatchlist.getState();
    toggle("btcusdt");
    add("BTCUSDT");
    add("VANRYUSDT");
    expect(useWatchlist.getState().symbols).toEqual(["BTCUSDT", "VANRYUSDT"]);
    toggle("BTCUSDT");
    expect(useWatchlist.getState().symbols).toEqual(["VANRYUSDT"]);

    const saved = JSON.parse(storage.getItem("cryptopulse:watchlist")!);
    expect(saved.state).toEqual({ symbols: ["VANRYUSDT"] });
  });
});
