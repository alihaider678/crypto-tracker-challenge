"use client";

import { useEffect, useState } from "react";
import { WifiOff } from "lucide-react";

import { formatTime } from "@/lib/format";
import type { FeedStatus } from "@/lib/live-feed";

/**
 * Shown when live updates stop. Waits 3s before appearing so a quick
 * reconnect doesn't flash a banner.
 */
export function LiveStatusNotice({
  status,
  lastUpdatedAt,
}: {
  status: FeedStatus;
  lastUpdatedAt: number;
}) {
  if (status !== "reconnecting" && status !== "offline") return null;
  // Remount per status so the delay restarts.
  return (
    <DelayedNotice key={status} status={status} lastUpdatedAt={lastUpdatedAt} />
  );
}

function DelayedNotice({
  status,
  lastUpdatedAt,
}: {
  status: "reconnecting" | "offline";
  lastUpdatedAt: number;
}) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 3000);
    return () => clearTimeout(timer);
  }, []);

  if (!visible) return null;

  return (
    <div
      role="status"
      className="flex items-start gap-3 rounded-xl border border-border bg-surface px-4 py-3 text-sm"
    >
      <WifiOff className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
      <p>
        <span className="font-medium">
          {status === "offline" ? "You're offline." : "Live updates paused."}
        </span>{" "}
        <span className="text-muted-foreground">
          Prices are from{" "}
          <time className="num" dateTime={new Date(lastUpdatedAt).toISOString()}>
            {formatTime(lastUpdatedAt)}
          </time>{" "}
          and may be out of date.{" "}
          {status === "offline"
            ? "We'll reconnect when your connection is back."
            : "Reconnecting…"}
        </span>
      </p>
    </div>
  );
}
