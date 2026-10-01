import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { formatInteger } from "@/lib/format";

/** Prev / next as real links, so pages are shareable and open in new tabs. */
export function MarketPagination({
  page,
  pageCount,
  from,
  to,
  total,
  hrefForPage,
}: {
  page: number;
  pageCount: number;
  from: number;
  to: number;
  total: number;
  hrefForPage: (page: number) => string;
}) {
  return (
    <nav
      aria-label="Pagination"
      className="flex flex-col items-center justify-between gap-3 sm:flex-row"
    >
      <p className="text-sm text-muted-foreground">
        Showing{" "}
        <span className="text-foreground tabular-nums">
          {formatInteger(from)}–{formatInteger(to)}
        </span>{" "}
        of <span className="text-foreground tabular-nums">{formatInteger(total)}</span> pairs
      </p>
      {pageCount > 1 && (
        <div className="flex items-center gap-2">
          <PageLink
            href={page > 1 ? hrefForPage(page - 1) : null}
            label="Previous page"
          >
            <ChevronLeft aria-hidden />
            Previous
          </PageLink>
          <span className="px-2 text-sm text-muted-foreground tabular-nums" aria-current="page">
            {page} / {pageCount}
          </span>
          <PageLink
            href={page < pageCount ? hrefForPage(page + 1) : null}
            label="Next page"
          >
            Next
            <ChevronRight aria-hidden />
          </PageLink>
        </div>
      )}
    </nav>
  );
}

function PageLink({
  href,
  label,
  children,
}: {
  href: string | null;
  label: string;
  children: React.ReactNode;
}) {
  if (!href) {
    return (
      <Button variant="outline" size="lg" disabled aria-label={label}>
        {children}
      </Button>
    );
  }
  return (
    <Button asChild variant="outline" size="lg">
      <Link href={href} aria-label={label}>
        {children}
      </Link>
    </Button>
  );
}
