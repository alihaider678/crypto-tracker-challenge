import Link from "next/link";
import { Search } from "lucide-react";

import { Button } from "@/components/ui/button";

/*
 * Opens the command palette once it exists (Phase 7). Until then it goes to
 * /markets, which is where search lives.
 */
export function SearchTrigger() {
  return (
    <>
      <Link
        href="/markets"
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
        <Link href="/markets">
          <Search aria-hidden />
        </Link>
      </Button>
    </>
  );
}
