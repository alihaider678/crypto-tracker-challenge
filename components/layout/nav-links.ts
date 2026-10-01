export const NAV_LINKS = [
  { href: "/", label: "Overview" },
  { href: "/markets", label: "Markets" },
  { href: "/watchlist", label: "Watchlist" },
] as const;

export function isActivePath(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}
