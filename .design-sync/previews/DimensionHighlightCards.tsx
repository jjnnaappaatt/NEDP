import { DimensionHighlightCards } from "aai-next-dashboard";

/** Per-dimension takeaway: strongest (จุดเด่น, green) + weakest (ควรพัฒนา, amber) มิติ by the latest score.
 *  Renders nothing when either is null or the two labels match. */
export function Default() {
  return (
    <div style={{ maxWidth: 360 }}>
      <DimensionHighlightCards
        strongest={{ label: "มิติ 4 สภาพแวดล้อม", v: 63.2 }}
        weakest={{ label: "มิติ 1 การมีงานทำ/รายได้", v: 52.2 }}
      />
    </div>
  );
}
