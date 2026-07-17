"use client";

import { useRouter } from "next/navigation";
import { IconArrowLeft } from "@tabler/icons-react";
import type { ReactNode } from "react";

/** ← Back · [Page Title] · [Action] — spec §1.3. Action collapses to an icon on mobile. */
export function InnerPageNav({ title, action }: { title: string; action?: ReactNode }) {
  const router = useRouter();
  return (
    <div className="mb-4 flex items-center gap-2">
      <button
        onClick={() => router.back()}
        aria-label="กลับ"
        className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-ink-soft hover:bg-surface-soft"
      >
        <IconArrowLeft size={22} />
      </button>
      <h2 className="min-w-0 flex-1 truncate font-display text-lg font-semibold">{title}</h2>
      {action}
    </div>
  );
}
