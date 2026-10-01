"use client";

import { useEffect } from "react";
import Link from "next/link";

import { ErrorState } from "@/components/feedback/error-state";
import { Button } from "@/components/ui/button";

/** Catches render errors below the root layout; navbar and footer stay. */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <section className="container-page space-y-4 py-16 md:py-24">
      <ErrorState
        title="Something went wrong"
        message="This page hit an unexpected error. Try again, or head back to the overview."
        onRetry={reset}
      />
      <div className="flex justify-center">
        <Button asChild variant="ghost">
          <Link href="/">Go to Overview</Link>
        </Button>
      </div>
      {error.digest && (
        <p className="text-center text-xs text-muted-foreground">
          Reference: <span className="tabular-nums">{error.digest}</span>
        </p>
      )}
    </section>
  );
}
