"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";

// three.js is heavy — client-only, lazy, and only mounted once we've decided to show it.
const AmbientHero = dynamic(() => import("./AmbientHero"), { ssr: false });

/**
 * Drops the ambient 3D scene behind a hero band, decoration only:
 * - Gated like the manual's Hero3DMount — OFF under reduced-motion and on narrow screens (<720px),
 *   so it NEVER loads in the mobile LINE WebView or taxes a phone. Reduced-motion is read
 *   synchronously so those users don't even trigger the lazy three.js import. Fallback: a cheap
 *   static mint glow.
 * - Only renders the Canvas while the band is on screen (IntersectionObserver): the rAF loop pauses
 *   when scrolled away, and a page with two ambient bands (e.g. /exec header + podium) only ever runs
 *   the one in view.
 * - aria-hidden + pointer-events:none — decorates without interfering with the content on top.
 */
export function AmbientHeroMount({
  color,
  particle,
  density,
  className,
}: {
  color?: string;
  particle?: string;
  density?: number;
  className?: string;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [enabled, setEnabled] = useState(false); // desktop + no-reduced-motion
  const [inView, setInView] = useState(false);

  useEffect(() => {
    // Read reduced-motion synchronously: a reduced-motion (or mobile) user never flips `enabled`
    // true, so the lazy AmbientHero chunk is never even requested.
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!reduced && window.innerWidth >= 720) setEnabled(true);
  }, []);

  useEffect(() => {
    const el = wrapRef.current;
    if (!enabled || !el) return;
    // Synchronous first check so an in-view (above-the-fold) hero mounts the scene immediately,
    // with no glow → 3D flash; the observer then handles scroll in/out.
    const r = el.getBoundingClientRect();
    setInView(r.bottom > -140 && r.top < window.innerHeight + 140);
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { rootMargin: "140px" });
    io.observe(el);
    return () => io.disconnect();
  }, [enabled]);

  return (
    <div
      ref={wrapRef}
      aria-hidden
      className={className}
      style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}
    >
      {enabled && inView ? (
        <AmbientHero color={color} particle={particle} density={density} />
      ) : (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(130% 100% at 82% -10%, color-mix(in srgb, var(--accent) 14%, transparent), transparent 62%)",
          }}
        />
      )}
    </div>
  );
}
