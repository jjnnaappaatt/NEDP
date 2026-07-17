"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

/**
 * A slim top progress bar shown during client-side navigation. The app de-streams (no `loading.tsx`,
 * to avoid the LINE/WKWebView paint bug), so without this a tap to a data-heavy route feels dead until
 * the new page paints. It starts on an internal-link click and ends when the pathname commits.
 */
export function RouteProgress() {
  const path = usePathname();
  const [active, setActive] = useState(false);
  const prev = useRef(path);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Start on internal-link clicks (capture phase, before Next handles the navigation).
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as HTMLElement | null)?.closest?.("a");
      const href = a?.getAttribute("href");
      if (!a || !href || !href.startsWith("/") || href.startsWith("//") || a.getAttribute("target") === "_blank") return;
      if (href.split("?")[0] === window.location.pathname) return; // same page → no nav
      setActive(true);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setActive(false), 8000); // safety: never stick on
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  // Finish when the route actually commits.
  useEffect(() => {
    if (prev.current !== path) {
      prev.current = path;
      if (timer.current) clearTimeout(timer.current);
      setActive(false);
    }
  }, [path]);

  return (
    <div aria-hidden className="pointer-events-none fixed inset-x-0 top-0 z-[60] h-0.5 overflow-hidden">
      {active && <div className="animate-routebar h-full w-1/3 bg-accent" />}
    </div>
  );
}
