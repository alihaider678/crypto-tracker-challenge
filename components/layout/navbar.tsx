"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

import { LiveConnectionBadge } from "./connection-badge";
import { Logo } from "./logo";
import { NAV_LINKS, isActivePath } from "./nav-links";
import { SearchTrigger } from "./search-trigger";
import { ThemeToggle } from "./theme-toggle";

// cmdk and the dialog load on first use, not with every page.
const loadPalette = () => import("./command-palette");
const CommandPalette = dynamic(() => loadPalette().then((m) => m.CommandPalette), {
  ssr: false,
});

export function Navbar() {
  const pathname = usePathname();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [paletteMounted, setPaletteMounted] = useState(false);
  // Element to refocus on close (Radix can't know it when opened by shortcut).
  const returnFocusRef = useRef<HTMLElement | null>(null);

  const setPalette = useCallback((open: boolean) => {
    if (open) {
      returnFocusRef.current =
        document.activeElement instanceof HTMLElement ? document.activeElement : null;
      setPaletteMounted(true);
    } else {
      const el = returnFocusRef.current;
      returnFocusRef.current = null;
      // After Radix finishes its own focus handling.
      if (el?.isConnected) setTimeout(() => el.focus(), 0);
    }
    setPaletteOpen(open);
  }, []);

  // Ctrl/Cmd+K everywhere, including /markets.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setPalette(!paletteOpen);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [paletteOpen, setPalette]);

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur-md">
      <div className="container-page flex h-16 items-center gap-6">
        <Logo />

        <nav aria-label="Main" className="hidden h-full items-center gap-1 md:flex">
          {NAV_LINKS.map(({ href, label }) => {
            const active = isActivePath(pathname, href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative inline-flex h-8 items-center rounded-lg px-3 text-sm font-medium transition-colors outline-none hover:bg-elevated hover:text-foreground active:bg-border/60 focus-visible:ring-3 focus-visible:ring-ring/50",
                  active ? "text-foreground" : "text-muted-foreground",
                )}
              >
                {label}
                {active && (
                  <span
                    aria-hidden
                    className="absolute inset-x-3 -bottom-[17px] h-0.5 rounded-full bg-primary"
                  />
                )}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <SearchTrigger onOpen={() => setPalette(true)} onPrefetch={() => void loadPalette()} />
          <LiveConnectionBadge className="hidden sm:inline-flex" />
          <ThemeToggle />
          <MobileNav pathname={pathname} />
        </div>
      </div>
      {paletteMounted && <CommandPalette open={paletteOpen} onOpenChange={setPalette} />}
    </header>
  );
}

function MobileNav({ pathname }: { pathname: string }) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden" aria-label="Open menu">
          <Menu aria-hidden />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-72">
        <SheetHeader>
          <SheetTitle>Menu</SheetTitle>
        </SheetHeader>
        <nav aria-label="Main" className="flex flex-col gap-1 px-4">
          {NAV_LINKS.map(({ href, label }) => {
            const active = isActivePath(pathname, href);
            return (
              <SheetClose asChild key={href}>
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex h-10 items-center rounded-lg px-3 text-sm font-medium transition-colors outline-none hover:bg-elevated active:bg-border/60 focus-visible:ring-3 focus-visible:ring-ring/50",
                    active
                      ? "bg-elevated text-foreground"
                      : "text-muted-foreground",
                  )}
                >
                  {label}
                </Link>
              </SheetClose>
            );
          })}
        </nav>
        <div className="mt-auto border-t border-border p-4">
          <LiveConnectionBadge />
        </div>
      </SheetContent>
    </Sheet>
  );
}
