import type { Metadata } from "next";
import Link from "next/link";
import { Compass } from "lucide-react";

import { EmptyState } from "@/components/feedback/empty-state";
import { Button } from "@/components/ui/button";

/** App-wide 404: unmatched URLs and notFound() outside /coin. */
export const metadata: Metadata = { title: "Page not found" };

export default function NotFound() {
  return (
    <section className="container-page py-16 md:py-24">
      <EmptyState
        icon={Compass}
        headingLevel={1}
        title="Page not found"
        description="That page doesn't exist or has moved."
        action={
          <div className="flex flex-wrap justify-center gap-3">
            <Button asChild>
              <Link href="/">Go to Overview</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/markets">Browse markets</Link>
            </Button>
          </div>
        }
      />
    </section>
  );
}
