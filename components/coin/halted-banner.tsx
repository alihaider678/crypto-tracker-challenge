import { PauseCircle } from "lucide-react";

import { formatDate, formatTime } from "@/lib/format";

/** Says plainly that nothing on the page is live. */
export function HaltedBanner({ lastTradeAt }: { lastTradeAt: number }) {
  return (
    <div
      role="status"
      className="flex items-start gap-3 rounded-xl border border-border bg-surface px-4 py-3"
    >
      <PauseCircle className="mt-0.5 size-5 shrink-0 text-muted-foreground" aria-hidden />
      <div className="space-y-0.5 text-sm">
        <p className="font-semibold">Trading halted</p>
        <p className="text-muted-foreground">
          No trades since{" "}
          {/* Local date and time; the server's timezone may differ. */}
          <time
            className="num text-foreground"
            dateTime={new Date(lastTradeAt).toISOString()}
            suppressHydrationWarning
          >
            {formatDate(lastTradeAt)}, {formatTime(lastTradeAt).slice(0, 5)}
          </time>
          . The price, chart and stats show the last available data and are not
          live.
        </p>
      </div>
    </div>
  );
}
