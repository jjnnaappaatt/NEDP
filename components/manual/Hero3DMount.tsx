"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { usePrefersReducedMotion } from "./motion";

// three.js is heavy — load it only on the client, and only once we've decided to show it.
const Hero3D = dynamic(() => import("./Hero3D"), { ssr: false });

/** Gates the WebGL hero: off under reduced-motion and on narrow screens (mobile shows the static
 *  gradient + phone instead), so three.js never taxes a phone or fights an accessibility preference. */
export function Hero3DMount() {
  const reduce = usePrefersReducedMotion();
  const [show, setShow] = useState(false);
  useEffect(() => {
    setShow(!reduce && window.innerWidth >= 720);
  }, [reduce]);
  if (!show) return null;
  return <Hero3D />;
}
