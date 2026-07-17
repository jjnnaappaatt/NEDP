"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Embeds the standalone interactive AAI calculator (public/manual/aai-dashboard.html) as a
 * same-origin iframe that auto-sizes to its content, so the whole calculator sits on one page
 * with no inner scrollbar.
 *
 * The dashboard rebuilds its own DOM (innerHTML) on every slider drag / panel toggle. A
 * ResizeObserver on the inner <body> is NOT enough here: the body's border-box stays pinned to
 * the iframe viewport, so it never fires on those content changes. Instead we watch DOM mutations
 * with a MutationObserver and re-measure body.scrollHeight (which does track the real content,
 * both when a panel expands and when it collapses). A resize listener covers width-driven
 * responsive reflow (which mutates no DOM), and a few early re-measures catch web-font settle.
 */
export function AaiDashboardFrame() {
  const ref = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState(760);

  useEffect(() => {
    const frame = ref.current;
    if (!frame) return;
    let mo: MutationObserver | undefined;
    let poll: number | undefined;
    let win: Window | null = null;
    let themeObs: MutationObserver | undefined;
    let queued = false;
    let disposed = false;

    const measure = () => {
      if (disposed) return;
      try {
        const body = frame.contentWindow?.document?.body;
        if (body && body.scrollHeight > 0) setHeight(body.scrollHeight);
      } catch {
        /* same-origin; ignore transient access errors during (re)navigation */
      }
    };
    // Coalesce mutation/resize bursts into one measure. queueMicrotask (not requestAnimationFrame)
    // so it still runs when the tab is backgrounded — rAF is paused in hidden tabs.
    const schedule = () => {
      if (queued) return;
      queued = true;
      queueMicrotask(() => { queued = false; measure(); });
    };

    // Mirror the app's theme (a `.dark` class on the parent <html>) onto the same-origin iframe's
    // <html>, so the calculator's CSS variables flip light↔dark together with the rest of the app.
    const syncTheme = () => {
      try {
        const idoc = frame.contentWindow?.document;
        if (!idoc?.documentElement) return;
        const dark = document.documentElement.classList.contains("dark");
        idoc.documentElement.classList.toggle("dark", dark);
        idoc.documentElement.style.colorScheme = dark ? "dark" : "light";
      } catch {
        /* ignore */
      }
    };

    const onLoad = () => {
      measure();
      syncTheme();
      try {
        const doc = frame.contentWindow?.document;
        win = frame.contentWindow;
        if (doc?.body) {
          mo = new MutationObserver(schedule);
          mo.observe(doc.body, { childList: true, subtree: true, attributes: true });
        }
        win?.addEventListener("resize", schedule);
      } catch {
        /* ignore */
      }
      let n = 0;
      poll = window.setInterval(() => {
        measure();
        if (++n >= 8 && poll) window.clearInterval(poll);
      }, 500);
    };

    frame.addEventListener("load", onLoad);
    // Handle the already-cached case where "load" fired before this effect ran.
    if (frame.contentWindow?.document?.readyState === "complete") onLoad();

    // The app's theme toggle only flips the parent <html> class, so watch it and re-sync the iframe.
    themeObs = new MutationObserver(syncTheme);
    themeObs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });

    return () => {
      disposed = true;
      frame.removeEventListener("load", onLoad);
      mo?.disconnect();
      themeObs?.disconnect();
      try { win?.removeEventListener("resize", schedule); } catch { /* ignore */ }
      if (poll) window.clearInterval(poll);
    };
  }, []);

  return (
    <div
      style={{
        marginTop: 20,
        borderRadius: 18,
        overflow: "hidden",
        background: "var(--surface-1)",
        border: "1px solid var(--border)",
        boxShadow: "0 1px 3px rgba(15,23,42,0.06)",
      }}
    >
      <iframe
        ref={ref}
        src="/manual/aai-dashboard.html"
        title="เครื่องมือคำนวณ AAI แบบโต้ตอบ"
        loading="lazy"
        style={{ display: "block", width: "100%", height, border: "none" }}
      />
    </div>
  );
}
