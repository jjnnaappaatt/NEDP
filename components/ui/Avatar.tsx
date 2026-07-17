import { cn } from "@/lib/utils";
import { emojiFor } from "@/lib/avatarEmoji";
import type { Account } from "@/types";

// A deterministic professional emoji on the project/person's colour disc (keyed by a stable id), in
// place of 2-letter initials. Same id → same emoji everywhere (leaderboard, feed, top bar, exec).
export function Avatar({ account, size = 40, className }: { account: Account; size?: number; className?: string }) {
  // A linked LINE photo (a user's own, or an admin-chosen contact representing a project) wins over the emoji.
  if (account.pictureUrl) {
    return (
      <img
        src={account.pictureUrl}
        alt=""
        width={size}
        height={size}
        referrerPolicy="no-referrer"
        loading="lazy"
        className={cn("inline-block shrink-0 rounded-full object-cover", className)}
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <span
      className={cn("inline-flex select-none items-center justify-center rounded-full", className)}
      style={{ width: size, height: size, background: account.avatarColor, fontSize: Math.round(size * 0.5) }}
      aria-hidden
    >
      {emojiFor(account.id, account.sourceProjectId)}
    </span>
  );
}
