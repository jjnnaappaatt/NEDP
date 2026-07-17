"use client";

import { useLiff } from "@/components/line/LiffProvider";
import { cn } from "@/lib/utils";

/** "เชื่อมต่อบัญชี LINE" — runs LINE Login (returns to the current page) so the account gets its
 *  line_user_id + profile picture. No-op target is handled by LiffProvider (already-linked / in-LINE). */
export function ConnectLineButton({ className, label = "เชื่อมต่อบัญชี LINE" }: { className?: string; label?: string }) {
  const { login, ready, error } = useLiff();
  return (
    <span className="inline-flex flex-col items-start gap-1">
      <button
        type="button"
        disabled={!ready}
        onClick={() => login({ redirectUri: typeof window !== "undefined" ? window.location.href : undefined })}
        className={cn(
          "inline-flex min-h-[44px] items-center justify-center gap-2 rounded-card bg-[#06C755] px-4 text-sm font-semibold text-white transition hover:brightness-105 active:brightness-95 disabled:opacity-50",
          className,
        )}
      >
        <span className="grid h-4 w-4 place-items-center rounded-[4px] bg-white text-[10px] font-bold text-[#06C755]">L</span>
        {label}
      </button>
      {/* Show a failed link instead of looping silently (the exact status pinpoints the cause). */}
      {error && <span className="text-xs font-medium text-red-600">{error}</span>}
    </span>
  );
}
