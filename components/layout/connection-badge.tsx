import { cn } from "@/lib/utils";

export type ConnectionStatus = "live" | "reconnecting" | "offline";

const LABELS: Record<ConnectionStatus, string> = {
  live: "Live",
  reconnecting: "Reconnecting",
  offline: "Offline",
};

/*
 * Green/red are reserved for price movement, so connection state uses the
 * teal brand color for "live" and neutrals for everything else.
 */
export function ConnectionBadge({
  status,
  className,
}: {
  status: ConnectionStatus;
  className?: string;
}) {
  return (
    <span
      role="status"
      aria-live="polite"
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
