"use client";

import { useEffect, useState } from "react";
import { IconSun, IconMoon } from "@tabler/icons-react";

/**
 * Light/dark toggle. The active theme is applied pre-paint by the inline script in layout.tsx
 * (saved choice → else OS preference); this button flips it and persists the explicit choice.
 * `dark === null` until mounted, so SSR and first client render match (no hydration mismatch).
 */
export function ThemeToggle() {
  const [dark, setDark] = useState<boolean | null>(null);

  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
  }, []);

  const toggle = () => {
    const next = !document.documentElement.classList.contains("dark");
    document.documentElement.classList.toggle("dark", next);
    document.documentElement.style.colorScheme = next ? "dark" : "light";
    try {
      localStorage.setItem("nedp-theme", next ? "dark" : "light");
    } catch {
      /* private mode — fall back to in-session only */
    }
    setDark(next);
  };

  return (
    <button
      onClick={toggle}
      aria-label={dark ? "สลับเป็นโหมดสว่าง" : "สลับเป็นโหมดมืด"}
      title={dark ? "โหมดสว่าง" : "โหมดมืด"}
      className="grid h-11 w-11 place-items-center rounded-full text-ink-soft hover:bg-surface-soft"
    >
      {dark === null
        ? <IconSun size={20} className="opacity-0" />
        : dark ? <IconSun size={20} /> : <IconMoon size={20} />}
    </button>
  );
}
