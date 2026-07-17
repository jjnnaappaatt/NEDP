import type { ReactNode } from "react";

/**
 * Route-level enter transition: template.tsx remounts on every navigation, retriggering the pure-CSS
 * `.route-enter` animation (200ms fade + 6px rise, defined in globals.css behind a
 * prefers-reduced-motion guard). Zero client JS — no hydration dependency, so LINE WebView first
 * paint is delayed by at most the animation itself. Applies to all routes incl. /admin + /manual.
 */
export default function Template({ children }: { children: ReactNode }) {
  return <div className="route-enter">{children}</div>;
}
