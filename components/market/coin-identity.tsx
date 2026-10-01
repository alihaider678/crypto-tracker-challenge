"use client";

import { memo, useState } from "react";

import { coinIconUrl } from "@/lib/symbols";
import { cn } from "@/lib/utils";

// Icons that 404ed this session, so rows don't retry them on every page.
const failedIcons = new Set<string>();

function letterFor(baseAsset: string): string {
  // "1000SATS" -> "S"
  return (baseAsset.match(/[A-Z]/)?.[0] ?? baseAsset.charAt(0)) || "?";
}

export function CoinIcon({
  baseAsset,
  size = 32,
  className,
}: {
  baseAsset: string;
  size?: number;
  className?: string;
}) {
  const [failed, setFailed] = useState(() => failedIcons.has(baseAsset));

  if (failed) {
    return (
      <span
        aria-hidden
        style={{ width: size, height: size }}
        className={cn(
          "grid shrink-0 place-items-center rounded-full border border-border bg-elevated text-xs font-semibold text-muted-foreground",
          className,
        )}
      >
        {letterFor(baseAsset)}
      </span>
    );
  }

  // Small icons: the 32px file on 1x screens, 128px on high-DPI ones (the
  // set has no 64px). A plain <img>: these third-party PNGs often 404, so
  // next/image's optimizer would add nothing.
  const small = size <= 32;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={coinIconUrl(baseAsset, small ? 32 : 128)}
      srcSet={small ? `${coinIconUrl(baseAsset, 32)} 1x, ${coinIconUrl(baseAsset, 128)} 2x` : undefined}
      alt=""
      width={size}
      height={size}
      loading="lazy"
      decoding="async"
      onError={() => {
        failedIcons.add(baseAsset);
        setFailed(true);
      }}
      className={cn("shrink-0 rounded-full bg-elevated", className)}
    />
  );
}

/**
 * Icon + name + pair. The name line takes extra content such as badges.
 * Memoized: rows re-render on every tick, this part almost never changes
 * (pass primitive props; children/meta elements defeat the memo).
 */
export const CoinIdentity = memo(function CoinIdentity({
  baseAsset,
  quoteAsset,
  name,
  children,
  meta,
}: {
  baseAsset: string;
  quoteAsset: string;
  name: string;
  /** Rendered after the name, e.g. badges. */
  children?: React.ReactNode;
  /** Rendered after the pair on the second line. */
  meta?: React.ReactNode;
}) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <CoinIcon key={baseAsset} baseAsset={baseAsset} />
      <div className="min-w-0">
        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
          {/* Badges wrap below the name before the name truncates. */}
          <span className="max-w-full shrink-0 truncate font-medium text-foreground">
            {name}
          </span>
          {children}
        </div>
        <div className="truncate text-xs text-muted-foreground">
          <span>
            {baseAsset}/{quoteAsset}
          </span>
          {meta}
        </div>
      </div>
    </div>
  );
});
