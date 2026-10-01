import Link from "next/link";
import { Activity } from "lucide-react";

import { cn } from "@/lib/utils";

export function Logo({ className }: { className?: string }) {
  return (
    <Link
      href="/"
      className={cn(
        "group inline-flex items-center gap-2 rounded-lg transition-opacity outline-none hover:opacity-90 focus-visible:ring-3 focus-visible:ring-ring/50 active:opacity-75",
        className,
      )}
    >
      <span className="grid size-8 place-items-center rounded-lg border border-primary/30 bg-primary/10 text-primary">
        <Activity className="size-4" aria-hidden />
      </span>
      <span className="text-base font-semibold tracking-tight text-foreground">
        CryptoPulse
      </span>
    </Link>
  );
}
