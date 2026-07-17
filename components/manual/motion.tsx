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
    // Fallback for anchor landings (a fresh #hash load OR an in-app nav-link click). When the browser
    // jumps straight to a section instead of scrolling through its trigger point, GSAP's once-on-scroll
    // tween can skip firing (block stays hidden) OR get caught mid-fade (the block looks half-faded — the
    // "is this broken?" state). So on ANY landing we snap the target block to fully revealed. Normal
    // top-to-bottom scrolling (no anchor) is untouched — those fade-ins still play.
    let revealed = false;
    const timeouts: number[] = [];
    const snap = () => {
      if (revealed || !el) return;
      revealed = true;
      revealTween?.scrollTrigger?.kill();
      revealTween?.progress(1);
      staggerTweens.forEach((t) => { t.scrollTrigger?.kill(); t.progress(1); });
    };
    // Anchor landing (fresh #hash load OR an in-app nav-link click) → snap the LANDED section fully
    // revealed instead of letting its `once` fade get caught mid-jump ("stuck faded"). The robust signal
    // is IDENTITY, not timing: if this block is / contains / sits inside the element the hash points at,
    // reveal it unconditionally (don't wait for the async scroll to arrive). Anything else already in view
    // is snapped too; a few retries cover the browser's async scroll-to-anchor. No hash → untouched, so
    // normal top-to-bottom scrolling still fades in.
    const maybeSnap = () => {
      const id = window.location.hash.slice(1);
      if (!id) return;
      const target = document.getElementById(id);
      const isTarget = !!target && (el === target || el.contains(target) || target.contains(el));
      const r = el.getBoundingClientRect();
      if (isTarget || (r.top < window.innerHeight && r.bottom > 0)) snap();
    };
    const onLanding = () => { [0, 100, 260, 520].forEach((ms) => timeouts.push(window.setTimeout(maybeSnap, ms))); };
    const raf = requestAnimationFrame(() => requestAnimationFrame(() => { if (window.location.hash) onLanding(); }));
    const onHashChange = () => onLanding();
    window.addEventListener("hashchange", onHashChange);
    return () => {
      cancelAnimationFrame(raf);
      timeouts.forEach((t) => clearTimeout(t));
      window.removeEventListener("hashchange", onHashChange);
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
