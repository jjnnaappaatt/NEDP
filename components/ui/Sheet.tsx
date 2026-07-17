"use client";

import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { ReactNode } from "react";

/** Bottom-sheet on mobile; on desktop either a centered dialog (default) or a `top-right` dropdown anchored
 *  under the bell (spec §4.2 / §7). `closeTone="danger"` renders a red close X. */
export function Sheet({
  open,
  onClose,
  title,
  children,
  placement = "center",
  closeTone = "default",
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  placement?: "center" | "top-right";
  closeTone?: "default" | "danger";
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (open) document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || !mounted) return null;
  const topRight = placement === "top-right";
  // Portal to <body>: the sticky TopBar uses `backdrop-blur`, and backdrop-filter makes an ancestor a containing
  // block for position:fixed descendants — which would trap this overlay inside the 56px header box. Portaling
  // escapes that so `fixed inset-0` is truly viewport-relative.
  return createPortal(
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true">
      {/* Mask — dims the page; click to close. */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      {/* Positioning layer: bottom-sheet on mobile; on desktop either centered or a column-aligned dropdown. */}
      <div
        className={cn(
          "absolute inset-x-0 bottom-0 flex justify-center",
          topRight
            ? "sm:bottom-auto sm:top-14 sm:mx-auto sm:max-w-[1100px] sm:justify-end sm:px-4"
            : "sm:inset-0 sm:items-center",
        )}
      >
        <div
          className={cn(
            "relative flex w-full animate-pop flex-col border border-border bg-surface",
            "rounded-t-2xl safe-bottom sm:rounded-card sm:max-w-[92vw]",
            topRight ? "max-h-[80vh] sm:max-h-[75vh] sm:w-[380px]" : "max-h-[92vh] sm:w-[440px]",
          )}
        >
          {/* Pinned header — stays put while the body scrolls (so the title never clips under the close button). */}
          <div className="shrink-0">
            <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-border sm:hidden" />
            <div className="flex items-center justify-between gap-2 px-5 pb-3 pt-3 sm:pt-4">
              <h3 className="min-w-0 truncate font-display text-lg font-semibold text-ink">{title ?? ""}</h3>
              <button
                onClick={onClose}
                aria-label="ปิด"
                className={cn(
                  "grid h-9 w-9 shrink-0 place-items-center rounded-full transition",
                  closeTone === "danger"
                    ? "bg-danger-bg text-danger-fg hover:bg-danger hover:text-white"
                    : "text-ink-soft hover:bg-surface-soft",
                )}
              >
                ✕
              </button>
            </div>
          </div>
          {/* Scrollable body */}
          <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-5 pt-1">{children}</div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
