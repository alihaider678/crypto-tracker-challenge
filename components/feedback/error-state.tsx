import { AlertTriangle, RotateCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function ErrorState({
  title = "Couldn't load market data",
  message,
  onRetry,
  retrying = false,
  headingLevel = 2,
  className,
}: {
  title?: string;
  message?: string;
  onRetry?: () => void;
  retrying?: boolean;
  /** 1 when this is the page's main content (error page). */
  headingLevel?: 1 | 2;
  className?: string;
}) {
  const Heading = headingLevel === 1 ? "h1" : "h2";
  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col items-center gap-4 rounded-xl border border-border bg-surface px-6 py-12 text-center",
        className,
      )}
    >
      <span className="grid size-12 place-items-center rounded-full bg-elevated text-muted-foreground">
        <AlertTriangle className="size-5" aria-hidden />
      </span>
      <div className="space-y-1">
        <Heading className="text-base font-semibold">{title}</Heading>
        {message && (
          <p className="max-w-md text-sm text-muted-foreground">{message}</p>
        )}
      </div>
      {onRetry && (
        <Button variant="outline" onClick={onRetry} disabled={retrying}>
          <RotateCw className={cn(retrying && "animate-spin")} aria-hidden />
          {retrying ? "Retrying" : "Retry"}
        </Button>
      )}
    </div>
  );
}
