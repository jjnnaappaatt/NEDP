"use client";

import { useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useIsoLayoutEffect } from "./motion";

export type PhoneStep = { src: string; alt: string; caption: string; detail?: string };

/**
 * The signature "phone-content transition": a single sticky phone MORPHS between the step screenshots as
 * each step block scrolls through the viewport (GSAP ScrollTrigger drives which step is active). The morph
 * (zoom-crossfade) is pure CSS (`.mn-sticky.is-scrolly .mn-sticky-img`) — interruption-safe. It runs at
 * ALL widths (desktop = a 2-column sticky, mobile = a pinned top phone; see manual.css) and even under
 * reduced-motion: the CSS fade/zoom is gated to `prefers-reduced-motion: no-preference`, so reduced-motion
 * users still get the informative content swap, just INSTANT (no animation). SSR renders the plain
 * filmstrip; the client upgrades to the scroll-morph after mount.
 */
export function StickyPhone({ steps }: { steps: PhoneStep[] }) {
  const [active, setActive] = useState(0);
  const [scrolly, setScrolly] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  // Turn on scroll-driven mode on the client — all widths, regardless of reduced-motion.
  useIsoLayoutEffect(() => {
    if (rootRef.current) setScrolly(true);
  }, []);

  // Create the per-step ScrollTriggers only AFTER `is-scrolly` is committed, so their start/end are
  // measured in the final (tall) layout — not the compact filmstrip that flipping `scrolly` replaces.
  // Refreshing again once the screenshots load / a beat later keeps positions correct after the long
  // page (screenshots, lazy iframe, Hero3D) settles → the phone reliably advances as you scroll.
  useIsoLayoutEffect(() => {
    const root = rootRef.current;
    if (!scrolly || !root) return;
    gsap.registerPlugin(ScrollTrigger);
    const ctx = gsap.context(() => {
      root.querySelectorAll<HTMLElement>("[data-step]").forEach((el, i) => {
        ScrollTrigger.create({
          trigger: el,
          start: "top 60%",
          end: "bottom 60%",
          onToggle: (self) => { if (self.isActive) setActive(i); },
        });
      });
    }, root);
    ScrollTrigger.refresh();
    const imgs = [...root.querySelectorAll<HTMLImageElement>(".mn-sticky-img")];
    const onImgLoad = () => ScrollTrigger.refresh();
    imgs.forEach((im) => { if (!im.complete) im.addEventListener("load", onImgLoad); });
    const t = window.setTimeout(() => ScrollTrigger.refresh(), 400);
    return () => {
      clearTimeout(t);
      imgs.forEach((im) => im.removeEventListener("load", onImgLoad));
      ctx.revert();
    };
  }, [scrolly]);

  return (
    <div ref={rootRef} className={`mn-sticky ${scrolly ? "is-scrolly" : ""}`}>
      <div className="mn-sticky-phonecol">
        <div className="mn-phone mn-sticky-phone">
          <div className="mn-phone-screen">
            {steps.map((s, i) => (
              // eslint-disable-next-line @next/next/no-img-element -- static /manual asset
              <img
                key={s.src}
                src={s.src}
                alt={s.alt}
                className={`mn-sticky-img ${i === active ? "is-on" : ""}`}
              />
            ))}
          </div>
        </div>
        {/* which of the steps the phone is showing */}
        <div className="mn-sticky-dots" aria-hidden="true">
          {steps.map((s, i) => (
            <i key={s.src} className={i === active ? "is-on" : ""} />
          ))}
        </div>
      </div>
      <ol className="mn-sticky-steps">
        {steps.map((s, i) => (
          <li key={s.src} data-step className={`mn-sticky-step ${scrolly && i === active ? "is-active" : ""}`}>
            <span className="mn-step-num">{i + 1}</span>
            <div className="mn-step-body">
              <div className="mn-step-cap">{s.caption}</div>
              {s.detail && <p className="mn-step-detail">{s.detail}</p>}
              <div className="mn-phone mn-step-phone">
                <div className="mn-phone-screen">
                  {/* eslint-disable-next-line @next/next/no-img-element -- static /manual asset */}
                  <img src={s.src} alt={s.alt} />
                </div>
              </div>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
