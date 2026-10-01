import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  LiveTickerFeed,
  type FeedStatus,
  type SocketLike,
} from "@/lib/live-feed";
import type { BinanceMiniTicker } from "@/lib/types";

class FakeSocket implements SocketLike {
  static instances: FakeSocket[] = [];
  onopen: (() => void) | null = null;
  onmessage: ((e: { data: unknown }) => void) | null = null;
  onclose: (() => void) | null = null;
  onerror: (() => void) | null = null;
  closed = false;

  constructor(readonly url: string) {
    FakeSocket.instances.push(this);
  }
  close() {
    this.closed = true;
  }
  // test helpers
  open() {
    this.onopen?.();
  }
  send(items: Partial<BinanceMiniTicker>[]) {
    this.onmessage?.({ data: JSON.stringify(items) });
  }
  drop() {
    this.onclose?.();
  }
  static get last() {
    return FakeSocket.instances[FakeSocket.instances.length - 1];
  }
}

const tick = (s: string, c: string): Partial<BinanceMiniTicker> => ({
  e: "24hrMiniTicker",
  E: 1,
  s,
  c,
  o: "1",
  h: "1",
  l: "1",
  v: "1",
  q: "1",
});

function makeFeed() {
  const batches: Map<string, BinanceMiniTicker>[] = [];
  const statuses: FeedStatus[] = [];
  const feed = new LiveTickerFeed({
    url: "wss://example.test/ws/!miniTicker@arr",
    onBatch: (b) => batches.push(new Map(b)),
    createSocket: (url) => new FakeSocket(url),
    random: () => 1, // no jitter: delay = full backoff
    lingerMs: 5000,
  });
  feed.subscribe(() => statuses.push(feed.getStatus()));
  return { feed, batches, statuses };
}

beforeEach(() => {
  vi.useFakeTimers();
  FakeSocket.instances = [];
});

afterEach(() => {
  vi.useRealTimers();
});

describe("LiveTickerFeed", () => {
  it("connects on first retain and goes live on open", () => {
    const { feed } = makeFeed();
    expect(feed.getStatus()).toBe("offline");
    feed.retain();
    expect(FakeSocket.instances).toHaveLength(1);
    expect(FakeSocket.last.url).toBe("wss://example.test/ws/!miniTicker@arr");
    expect(feed.getStatus()).toBe("connecting");
    FakeSocket.last.open();
    expect(feed.getStatus()).toBe("live");
  });

  it("shares one socket between consumers", () => {
    const { feed } = makeFeed();
    feed.retain();
    feed.retain();
    expect(FakeSocket.instances).toHaveLength(1);
  });

  it("batches updates once per second, keeping the latest per symbol", () => {
    const { feed, batches } = makeFeed();
    feed.retain();
    FakeSocket.last.open();
    FakeSocket.last.send([tick("BTCUSDT", "100"), tick("ETHUSDT", "10")]);
    FakeSocket.last.send([tick("BTCUSDT", "101")]);
    expect(batches).toHaveLength(0);

    vi.advanceTimersByTime(1000);
    expect(batches).toHaveLength(1);
    expect(batches[0].get("BTCUSDT")?.c).toBe("101");
    expect(batches[0].get("ETHUSDT")?.c).toBe("10");

    // nothing new -> no empty batch
    vi.advanceTimersByTime(1000);
    expect(batches).toHaveLength(1);
  });

  it("ignores malformed messages", () => {
    const { feed, batches } = makeFeed();
    feed.retain();
    FakeSocket.last.open();
    FakeSocket.last.onmessage?.({ data: "not json" });
    FakeSocket.last.onmessage?.({ data: JSON.stringify({ result: null }) });
    vi.advanceTimersByTime(1000);
    expect(batches).toHaveLength(0);
    expect(feed.getStatus()).toBe("live");
  });

  it("reconnects with exponential backoff capped at 30s", () => {
    const { feed } = makeFeed();
    feed.retain();
    const expected = [1000, 2000, 4000, 8000, 16000, 30000, 30000];
    for (const delay of expected) {
      const before = FakeSocket.instances.length;
      FakeSocket.last.drop();
      expect(feed.getStatus()).toBe("reconnecting");
      vi.advanceTimersByTime(delay - 1);
      expect(FakeSocket.instances).toHaveLength(before);
      vi.advanceTimersByTime(1);
      expect(FakeSocket.instances).toHaveLength(before + 1);
    }
  });

  it("resets the backoff once data flows again", () => {
    const { feed } = makeFeed();
    feed.retain();
    FakeSocket.last.drop();
    vi.advanceTimersByTime(1000);
    FakeSocket.last.drop();
    vi.advanceTimersByTime(2000);
    // healthy connection
    FakeSocket.last.open();
    FakeSocket.last.send([tick("BTCUSDT", "1")]);
    FakeSocket.last.drop();
    const before = FakeSocket.instances.length;
    vi.advanceTimersByTime(1000);
    expect(FakeSocket.instances).toHaveLength(before + 1);
  });

  it("applies jitter between 50% and 100% of the backoff", () => {
    const feed = new LiveTickerFeed({
      url: "wss://x",
      onBatch: () => {},
      createSocket: (url) => new FakeSocket(url),
      random: () => 0,
    });
    feed.retain();
    FakeSocket.last.drop();
    vi.advanceTimersByTime(499);
    expect(FakeSocket.instances).toHaveLength(1);
    vi.advanceTimersByTime(1);
    expect(FakeSocket.instances).toHaveLength(2);
  });

  it("reconnects when a live socket goes quiet for 15s", () => {
    const { feed } = makeFeed();
    feed.retain();
    FakeSocket.last.open();
    FakeSocket.last.send([tick("BTCUSDT", "1")]);
    const quiet = FakeSocket.last;
    vi.advanceTimersByTime(15000);
    expect(quiet.closed).toBe(true);
    expect(feed.getStatus()).toBe("reconnecting");
    vi.advanceTimersByTime(1000);
    expect(FakeSocket.last).not.toBe(quiet);
  });

  it("stays connected for a short linger after the last release", () => {
    const { feed } = makeFeed();
    const release = feed.retain();
    FakeSocket.last.open();
    release();
    vi.advanceTimersByTime(4999);
    expect(FakeSocket.last.closed).toBe(false);
    // a new consumer within the linger reuses the socket
    feed.retain();
    vi.advanceTimersByTime(10000);
    expect(FakeSocket.instances).toHaveLength(1);
    expect(FakeSocket.last.closed).toBe(false);
  });

  it("closes after the linger and stops reconnecting", () => {
    const { feed, batches } = makeFeed();
    const release = feed.retain();
    FakeSocket.last.open();
    FakeSocket.last.send([tick("BTCUSDT", "1")]);
    release();
    vi.advanceTimersByTime(5000);
    expect(FakeSocket.last.closed).toBe(true);
    expect(feed.getStatus()).toBe("offline");
    // Batches still flush during the linger, but never after stop.
    const flushed = batches.length;
    FakeSocket.last.send([tick("BTCUSDT", "2")]);
    vi.advanceTimersByTime(60000);
    expect(FakeSocket.instances).toHaveLength(1);
    expect(batches).toHaveLength(flushed);
  });

  it("release is idempotent", () => {
    const { feed } = makeFeed();
    const releaseA = feed.retain();
    feed.retain();
    releaseA();
    releaseA();
    vi.advanceTimersByTime(10000);
    expect(FakeSocket.last.closed).toBe(false);
  });

  it("notifies subscribers only on status changes", () => {
    const { feed, statuses } = makeFeed();
    feed.retain();
    FakeSocket.last.open();
    FakeSocket.last.send([tick("BTCUSDT", "1")]);
    FakeSocket.last.send([tick("BTCUSDT", "2")]);
    FakeSocket.last.drop();
    expect(statuses).toEqual(["connecting", "live", "reconnecting"]);
  });
});
