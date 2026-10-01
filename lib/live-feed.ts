import type { BinanceMiniTicker } from "./types";

export type FeedStatus = "connecting" | "live" | "reconnecting" | "offline";

/** The slice of WebSocket the feed uses, so tests can pass a fake. */
export type SocketLike = {
  onopen: (() => void) | null;
  onmessage: ((event: { data: unknown }) => void) | null;
  onclose: (() => void) | null;
  onerror: (() => void) | null;
  close(): void;
};

export type LiveTickerFeedOptions = {
  url: string;
  /** Called at most once per flush interval with the latest update per symbol. */
  onBatch: (updates: ReadonlyMap<string, BinanceMiniTicker>) => void;
  flushIntervalMs?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  /** Reconnect if a socket goes this long without a message. */
  staleAfterMs?: number;
  /** Keep the socket open this long after the last consumer leaves. */
  lingerMs?: number;
  random?: () => number;
  createSocket?: (url: string) => SocketLike;
};

/**
 * One shared connection to Binance's !miniTicker@arr stream.
 *
 * - Consumers call retain() and get a release function; the socket opens on
 *   the first retain and closes `lingerMs` after the last release, so route
 *   changes don't reconnect.
 * - Messages are buffered per symbol and flushed once per interval: one
 *   cache write per second instead of one per message.
 * - Drops reconnect with exponential backoff (1s, 2s, 4s ... 30s, with
 *   jitter). The backoff resets once data flows again, so a server that
 *   accepts then immediately closes can't cause a tight loop.
 * - A watchdog reconnects silent sockets (Binance also closes every
 *   connection after 24h).
 * - Goes "offline" while the browser is offline and reconnects on "online".
 */
export class LiveTickerFeed {
  private readonly opts: Required<LiveTickerFeedOptions>;
  private status: FeedStatus = "offline";
  private readonly listeners = new Set<() => void>();

  private consumers = 0;
  private socket: SocketLike | null = null;
  private attempt = 0;
  private pending = new Map<string, BinanceMiniTicker>();

  private flushTimer: ReturnType<typeof setInterval> | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private watchdogTimer: ReturnType<typeof setTimeout> | null = null;
  private lingerTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(options: LiveTickerFeedOptions) {
    this.opts = {
      flushIntervalMs: 1000,
      baseDelayMs: 1000,
      maxDelayMs: 30_000,
      staleAfterMs: 15_000,
      lingerMs: 5000,
      random: Math.random,
      createSocket: (url) => new WebSocket(url) as unknown as SocketLike,
      ...options,
    };
  }

  // --- external store (for useSyncExternalStore) ------------------------

  getStatus = (): FeedStatus => this.status;

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  // --- consumers --------------------------------------------------------

  retain(): () => void {
    this.consumers += 1;
    this.clearTimer("lingerTimer");
    if (this.consumers === 1 && !this.isRunning()) this.start();

    let released = false;
    return () => {
      if (released) return;
      released = true;
      this.consumers -= 1;
      if (this.consumers === 0) {
        this.lingerTimer = setTimeout(() => this.stop(), this.opts.lingerMs);
      }
    };
  }

  // --- lifecycle --------------------------------------------------------

  private isRunning(): boolean {
    return this.flushTimer !== null;
  }

  private start() {
    this.attempt = 0;
    this.flushTimer = setInterval(() => this.flush(), this.opts.flushIntervalMs);
    if (typeof window !== "undefined") {
      window.addEventListener("online", this.handleOnline);
      window.addEventListener("offline", this.handleOffline);
    }
    if (this.browserOffline()) this.setStatus("offline");
    else this.connect();
  }

  private stop() {
    this.clearTimer("lingerTimer");
    this.clearTimer("reconnectTimer");
    if (this.flushTimer) clearInterval(this.flushTimer);
    this.flushTimer = null;
    this.teardownSocket();
    this.pending = new Map();
    if (typeof window !== "undefined") {
      window.removeEventListener("online", this.handleOnline);
      window.removeEventListener("offline", this.handleOffline);
    }
    this.setStatus("offline");
  }

  private connect() {
    this.clearTimer("reconnectTimer");
    this.setStatus(this.attempt === 0 ? "connecting" : "reconnecting");

    let socket: SocketLike;
    try {
      socket = this.opts.createSocket(this.opts.url);
    } catch {
      this.scheduleReconnect();
      return;
    }
    this.socket = socket;

    socket.onopen = () => {
      this.setStatus("live");
      this.armWatchdog();
    };
    socket.onmessage = (event) => this.handleMessage(event.data);
    // Errors are always followed by close; reconnect happens there.
    socket.onerror = null;
    socket.onclose = () => {
      if (this.socket !== socket) return;
      this.teardownSocket();
      this.scheduleReconnect();
    };
  }

  private handleMessage(data: unknown) {
    let items: unknown;
    try {
      items = JSON.parse(String(data));
    } catch {
      return;
    }
    if (!Array.isArray(items)) return;

    for (const item of items as BinanceMiniTicker[]) {
      if (item && typeof item.s === "string") this.pending.set(item.s, item);
    }
    this.attempt = 0;
    this.setStatus("live");
    this.armWatchdog();
  }

  private flush() {
    if (this.pending.size === 0) return;
    const batch = this.pending;
    this.pending = new Map();
    this.opts.onBatch(batch);
  }

  private scheduleReconnect() {
    if (!this.isRunning()) return;
    if (this.browserOffline()) {
      this.setStatus("offline");
      return;
    }
    const full = Math.min(
      this.opts.maxDelayMs,
      this.opts.baseDelayMs * 2 ** this.attempt,
    );
    const delay = full / 2 + (this.opts.random() * full) / 2;
    this.attempt += 1;
    this.setStatus("reconnecting");
    this.reconnectTimer = setTimeout(() => this.connect(), delay);
  }

  private armWatchdog() {
    this.clearTimer("watchdogTimer");
    this.watchdogTimer = setTimeout(() => {
      this.teardownSocket();
      this.scheduleReconnect();
    }, this.opts.staleAfterMs);
  }

  private teardownSocket() {
    this.clearTimer("watchdogTimer");
    const socket = this.socket;
    if (!socket) return;
    this.socket = null;
    socket.onopen = socket.onmessage = socket.onclose = socket.onerror = null;
    try {
      socket.close();
    } catch {
      // Already closed.
    }
  }

  private handleOnline = () => {
    if (!this.isRunning() || this.socket) return;
    this.attempt = 0;
    this.connect();
  };

  private handleOffline = () => {
    if (!this.isRunning()) return;
    this.clearTimer("reconnectTimer");
    this.teardownSocket();
    this.setStatus("offline");
  };

  // --- helpers ----------------------------------------------------------

  private browserOffline(): boolean {
    return typeof navigator !== "undefined" && navigator.onLine === false;
  }

  private clearTimer(
    name: "reconnectTimer" | "watchdogTimer" | "lingerTimer",
  ) {
    const timer = this[name];
    if (timer) clearTimeout(timer);
    this[name] = null;
  }

  private setStatus(next: FeedStatus) {
    if (this.status === next) return;
    this.status = next;
    for (const listener of this.listeners) listener();
  }
}
