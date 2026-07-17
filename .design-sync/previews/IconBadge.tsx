import { IconBadge } from "aai-next-dashboard";

// IconBadge takes any icon component shaped { size, className, stroke }. A small inline glyph keeps
// the preview self-contained (the app passes @tabler/icons-react icons the same way).
function HomeGlyph({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
         strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 11l9-8 9 8" />
      <path d="M5 10v10h14V10" />
    </svg>
  );
}

/** Circular tinted icon badge — soft 10% tint disc + brand-colored glyph, across colors and sizes. */
export function Colors() {
  return (
    <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
      <IconBadge icon={HomeGlyph} color="#1a56db" />
      <IconBadge icon={HomeGlyph} color="#00b48a" />
      <IconBadge icon={HomeGlyph} color="#d97706" />
      <IconBadge icon={HomeGlyph} color="#7c3aed" size={56} />
    </div>
  );
}
