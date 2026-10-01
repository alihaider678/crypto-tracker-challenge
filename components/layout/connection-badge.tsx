"use client";

import { useLiveTickers } from "@/hooks/useLiveTickers";
import type { FeedStatus } from "@/lib/live-feed";
import { cn } from "@/lib/utils";

export type ConnectionStatus = FeedStatus;

const LABELS: Record<ConnectionStatus, string> = {
  connecting: "Connecting",
  live: "Live",
  reconnecting: "Reconnecting",
  offline: "Offline",
};

/** The badge, driven by the shared live feed (keeps it connected). */
export function LiveConnectionBadge({ className }: { className?: string }) {
  const status = useLiveTickers();
  return <ConnectionBadge status={status} className={className} />;
}

/*
 * Green/red are reserved for price movement, so connection state uses the
 * teal brand color for "live" and neutrals for everything else.
 */
export function ConnectionBadge({
  status,
  announce = true,
  className,
}: {
  status: ConnectionStatus;
  /**
   * Announce changes to screen readers (polite). Keep this on for the
   * navbar badge only, so a reconnect isn't read out twice.
   */
  announce?: boolean;
  className?: string;
}) {
  return (
    <span
      role={announce ? "status" : undefined}
      aria-live={announce ? "polite" : undefined}
      className={cn(
        "inline-flex h-7 items-center gap-2 rounded-full border px-2.5 text-xs font-medium",
        status === "live"
          ? "border-primary/30 text-foreground"
          : "border-border text-muted-foreground",
        className,
      )}
    >
      <span className="relative flex size-2" aria-hidden>
        {status !== "offline" && (
          <span
            className={cn(
              "absolute inline-flex size-full animate-ping rounded-full opacity-60",
              status === "live" ? "bg-primary" : "bg-muted-foreground",
            )}
          />
        )}
        <span
          className={cn(
            "relative inline-flex size-2 rounded-full",
            status === "live" ? "bg-primary" : "bg-muted-foreground",
          )}
        />
      </span>
      <span className="sr-only">Market data connection: </span>
      {LABELS[status]}
    </span>
  );
}
