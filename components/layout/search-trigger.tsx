"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  MARKET_SEARCH_HASH,
  requestMarketSearchFocus,
} from "@/lib/search-focus";

const HREF = `/markets${MARKET_SEARCH_HASH}`;

/*
 * Focuses the Markets search box (navigating there first if needed), also
 * on Ctrl/Cmd+K. The command palette replaces this in Phase 7.
 */
export function SearchTrigger() {
  const pathname = usePathname();
  const router = useRouter();
  const onMarkets = pathname === "/markets";

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() !== "k" || !(e.metaKey || e.ctrlKey)) return;
      e.preventDefault();
      if (onMarkets) requestMarketSearchFocus();
      else router.push(HREF);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onMarkets, router]);

  const onClick = (e: React.MouseEvent) => {
    if (!onMarkets) return; // the link navigates
    e.preventDefault();
    requestMarketSearchFocus();
  };

  return (
    <>
      <Link
        href={HREF}
        onClick={onClick}
        className="hidden h-8 w-56 items-center gap-2 rounded-lg border border-border bg-surface px-2.5 text-sm text-muted-foreground transition-colors outline-none hover:border-muted-foreground/40 hover:text-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 lg:inline-flex xl:w-64"
      >
        <Search className="size-4" aria-hidden />
        <span className="flex-1 text-left">Search markets</span>
        <kbd className="num rounded-sm border border-border bg-elevated px-1.5 text-xs text-muted-foreground">
          Ctrl K
        </kbd>
      </Link>
      <Button
        asChild
        variant="ghost"
        size="icon"
        className="lg:hidden"
        aria-label="Search markets"
      >
        <Link href={HREF} onClick={onClick}>
          <Search aria-hidden />
        </Link>
      </Button>
    </>
  );
}
