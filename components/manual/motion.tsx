"use client";

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

/** useLayoutEffect on the client, useEffect on the server (avoids the SSR warning). */
export const useIsoLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

/** Tracks the user's reduced-motion preference so every animation can bow out. */
export function usePrefersReducedMotion(): boolean {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduce(mq.matches);
    const on = () => setReduce(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return reduce;
}

/**
 * Fade + rise a block into view on scroll (GSAP ScrollTrigger). The hidden start-state is set in
 * useLayoutEffect (before paint) so there's no flash; under reduced-motion it renders as-is and never hides.
 */
export function Reveal({
  children, y = 26, delay = 0, className, as: Tag = "div",
}: {
  children: ReactNode; y?: number; delay?: number; className?: string;
  as?: "div" | "section" | "li" | "figure";
}) {
  const ref = useRef<HTMLElement>(null);
  const reduce = usePrefersReducedMotion();
  useIsoLayoutEffect(() => {
    const el = ref.current;
    if (reduce || !el) return;
    gsap.registerPlugin(ScrollTrigger);
    let revealTween: ReturnType<typeof gsap.fromTo> | undefined;
    const staggerTweens: ReturnType<typeof gsap.fromTo>[] = [];
    const staggerGrids: HTMLElement[] = [];
    const ctx = gsap.context(() => {
      revealTween = gsap.fromTo(
        el,
        { opacity: 0, y },
        {
          // clearProps drops the residual transform/will-change so the settled block (and any phone
          // screenshot inside it) composites at native resolution — no lingering soft layer.
          opacity: 1, y: 0, duration: 0.7, ease: "power3.out", delay, clearProps: "transform,willChange",
          scrollTrigger: { trigger: el, start: "top 88%", once: true },
        },
      );
      // card grids marked .mn-stagger rise one-by-one on top of the block fade
      el.querySelectorAll<HTMLElement>(".mn-stagger").forEach((grid) => {
        staggerGrids.push(grid);
        staggerTweens.push(gsap.fromTo(
          grid.children,
          { opacity: 0, y: 16 },
          {
            opacity: 1, y: 0, duration: 0.55, ease: "power2.out", stagger: 0.08, delay: delay + 0.12,
            clearProps: "transform,willChange",
            scrollTrigger: { trigger: grid, start: "top 92%", once: true },
          },
        ));
      });
    }, el);

    // Force this block (and its stagger children) fully visible — immediately and irreversibly.
    // A scrollTrigger-driven tween is created PAUSED and played by the trigger; on an anchor jump the
    // `once` fade can start then stall PAUSED mid-fade (the "stuck at ~9% opacity" bug on /manual#part2).
    // Killing the trigger alone leaves that paused tween in place, and `progress(1)` doesn't reliably
    // override it — so we kill the TWEEN itself, then hard-set the end state with gsap.set (a synchronous
    // inline-style write nothing on the ticker can walk back).
    let revealed = false;
    const forceReveal = () => {
      if (revealed || !el) return;
      revealed = true;
      revealTween?.scrollTrigger?.kill();
      revealTween?.kill();
      gsap.set(el, { opacity: 1, y: 0, clearProps: "transform,willChange" });
      staggerTweens.forEach((t) => { t.scrollTrigger?.kill(); t.kill(); });
      staggerGrids.forEach((grid) => gsap.set(grid.children, { opacity: 1, y: 0, clearProps: "transform,willChange" }));
    };
    // In view OR already scrolled past (top above the viewport bottom).
    const inOrAboveView = () => el.getBoundingClientRect().top < window.innerHeight;

    // Anchor landing (a fresh #hash load OR an in-app nav-link click): the browser jumps straight to a
    // section, so its `once` fade freezes mid-jump. Reveal the landed section without waiting — identity
    // match covers the exact target; the in/above-view check covers its siblings. A short time-boxed
    // scroll listener catches the case where the browser's async scroll-to-anchor lands the block AFTER
    // the retry timeouts fire. Outside that window normal top-to-bottom scrolling still fades in.
    const timeouts: number[] = [];
    let landingUntil = 0;
    const maybeSnap = () => {
      if (revealed) return;
      const id = window.location.hash.slice(1);
      const target = id ? document.getElementById(id) : null;
      const isTarget = !!target && (el === target || el.contains(target) || target.contains(el));
      if (isTarget || inOrAboveView()) forceReveal();
    };
    const onScroll = () => {
      if (revealed) return;
      if (performance.now() < landingUntil && inOrAboveView()) forceReveal();
    };
    const onLanding = () => {
      landingUntil = performance.now() + 1200;
      [0, 100, 260, 520, 900].forEach((ms) => timeouts.push(window.setTimeout(maybeSnap, ms)));
    };
    const raf = requestAnimationFrame(() => requestAnimationFrame(() => { if (window.location.hash) onLanding(); }));
    const onHashChange = () => onLanding();
    window.addEventListener("hashchange", onHashChange);
    window.addEventListener("scroll", onScroll, { passive: true });

    // Universal safety net — the guarantee that no block is EVER left faded, on any entry path. After a
    // grace window (longer than the 0.7s fade, and re-armed once images finish loading and reflow the
    // page), any block that is in/above the viewport but still not fully opaque is force-revealed. Normal
    // fades have completed by now, and below-the-fold blocks (top ≥ viewport bottom) are left to scroll.
    const mountedAt = performance.now();
    const NET_FLOOR_MS = 1400; // > the 0.7s fade, so a normal fade completes before the net could clip it
    const safetyNet = () => {
      if (revealed || !el) return;
      if (inOrAboveView() && parseFloat(getComputedStyle(el).opacity || "1") < 0.99) forceReveal();
    };
    let netTimer = window.setTimeout(safetyNet, NET_FLOOR_MS);
    // Re-check once images finish loading and reflow the page — but never earlier than the fade-safe
    // floor, so a fast `load` can't cut a still-playing fade short.
    const onLoad = () => {
      window.clearTimeout(netTimer);
      netTimer = window.setTimeout(safetyNet, Math.max(NET_FLOOR_MS - (performance.now() - mountedAt), 350));
    };
    window.addEventListener("load", onLoad);

    return () => {
      cancelAnimationFrame(raf);
      timeouts.forEach((t) => clearTimeout(t));
      window.clearTimeout(netTimer);
      window.removeEventListener("hashchange", onHashChange);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("load", onLoad);
      ctx.revert();
    };
  }, [reduce, y, delay]);
  return (
    <Tag ref={ref as never} className={`mn-reveal ${className ?? ""}`}>
      {children}
    </Tag>
  );
}

/**
 * Number that counts up from 0 when scrolled into view (GSAP). Under reduced-motion (or before
 * hydration) it renders the final value as-is, so nothing depends on the animation to be readable.
 */
export function CountUp({ value, decimals = 0 }: { value: number; decimals?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const reduce = usePrefersReducedMotion();
  useIsoLayoutEffect(() => {
    const el = ref.current;
    if (reduce || !el) return;
    gsap.registerPlugin(ScrollTrigger);
    const state = { n: 0 };
    const tween = gsap.to(state, {
      n: value, duration: 1.1, ease: "power2.out",
      onUpdate: () => { el.textContent = state.n.toFixed(decimals); },
      scrollTrigger: { trigger: el, start: "top 92%", once: true },
    });
    return () => { tween.scrollTrigger?.kill(); tween.kill(); };
  }, [reduce, value, decimals]);
  return <span ref={ref}>{value.toFixed(decimals)}</span>;
}
