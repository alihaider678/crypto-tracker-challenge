/**
 * Section reveal: a short fade and 8px rise when content first renders.
 * motion-safe, so it does nothing under prefers-reduced-motion. Transforms
 * and opacity only, so it never causes layout shift. No page transitions or
 * exit animations (unreliable with the App Router).
 */
export const reveal =
  "motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-2 motion-safe:duration-300 motion-safe:ease-out";
