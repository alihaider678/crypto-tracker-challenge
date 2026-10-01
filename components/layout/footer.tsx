import Link from "next/link";

import { Logo } from "./logo";
import { NAV_LINKS } from "./nav-links";

export function Footer() {
  return (
    <footer className="mt-auto border-t border-border">
      <div className="container-page flex flex-col gap-8 py-12 md:flex-row md:items-start md:justify-between">
        <div className="max-w-sm space-y-3">
          <Logo />
          <p className="text-sm text-muted-foreground">
            Live spot prices, 24h movement and charts for Binance trading pairs.
          </p>
        </div>

        <nav aria-label="Footer">
          <h2 className="text-xs font-medium tracking-[0.04em] text-muted-foreground uppercase">
            Explore
          </h2>
          <ul className="mt-3 space-y-2">
            {NAV_LINKS.map(({ href, label }) => (
              <li key={href}>
                <Link
                  href={href}
                  className="rounded-sm text-sm text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      <div className="border-t border-border">
        <div className="container-page flex flex-col gap-2 py-6 text-xs text-muted-foreground sm:flex-row sm:justify-between">
          <p>&copy; {new Date().getFullYear()} CryptoPulse</p>
          <p>
            Market data from the Binance public API. Not financial advice.
          </p>
        </div>
      </div>
    </footer>
  );
}
