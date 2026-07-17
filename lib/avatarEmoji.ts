// Professional emoji avatars — health / elderly / research / nature / community themed, NO silly
// faces. 40 distinct icons (> the 22 projects) so a per-PROJECT index gives every project a UNIQUE,
// stable icon; real (non-project) accounts fall back to a stable hash of their id.
const AVATAR_EMOJI = [
  "👵", "👴", "🧓", "🩺", "⚕️", "💊", "💉", "🩹", "🔬", "🧬",
  "🧪", "🥼", "📋", "📊", "📈", "🗂️", "🧭", "🗺️", "🏥", "🏡",
  "🌿", "🌱", "🍃", "🌳", "🥗", "🍎", "🧠", "🫀", "🦴", "🦷",
  "🤝", "🫶", "💡", "❤️", "💚", "💙", "☀️", "🌤️", "🧩", "🎯",
] as const;

/** Stable FNV-1a hash of a string. */
function hashIndex(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0) % AVATAR_EMOJI.length;
}

/**
 * Pick an emoji for an avatar. When `projectIndex` (a project's stable 1..N ordinal) is given, use a
 * DIRECT index → every project ≤ 40 is guaranteed a distinct, stable emoji (no hash collisions).
 * Otherwise hash the account id (real users).
 */
export function emojiFor(id: string | undefined | null, projectIndex?: number): string {
  if (typeof projectIndex === "number" && projectIndex > 0) {
    return AVATAR_EMOJI[(projectIndex - 1) % AVATAR_EMOJI.length];
  }
  return AVATAR_EMOJI[hashIndex(id ?? "")];
}
