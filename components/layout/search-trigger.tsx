"use client";

import { useSyncExternalStore } from "react";
import { Search } from "lucide-react";

import { Button } from "@/components/ui/button";

const subscribe = () => () => {};
const isMac = () => /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);

/** Opens the command palette (which also listens for Ctrl/Cmd+K itself). */
export function SearchTrigger({ onOpen }: { onOpen: () => void }) {
  // Server and first client render say "Ctrl K"; Macs switch to ⌘K after.
  const shortcut = useSyncExternalStore(
    subscribe,
    () => (isMac() ? "⌘ K" : "Ctrl K"),
    () => "Ctrl K",
  );

  return (
    <>
      <button
        type="button"
        onClick={onOpen}
        aria-keyshortcuts="Control+K Meta+K"
        className="hidden h-8 w-56 items-center gap-2 rounded-lg border border-border bg-surface px-2.5 text-sm text-muted-foreground transition-colors outline-none hover:border-muted-foreground/40 hover:text-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 active:bg-elevated lg:inline-flex xl:w-64"
      >
        <Search className="size-4" aria-hidden />
        <span className="flex-1 text-left">Search</span>
        <kbd className="rounded-sm border border-border bg-elevated px-1.5 text-xs text-muted-foreground">
          {shortcut}
        </kbd>
      </button>
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden"
        aria-label="Search"
        onClick={onOpen}
      >
        <Search aria-hidden />
      </Button>
    </>
  );
}
