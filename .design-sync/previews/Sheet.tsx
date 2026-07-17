import { Sheet } from "aai-next-dashboard";

// Sheet renders as position:fixed inset-0 (full-screen overlay). A `transform` on the wrapper makes
// that fixed positioning resolve relative to the wrapper instead of the page, so the backdrop + panel
// render fully INSIDE the card. The capture viewport is ≥640px (see cfg.overrides.Sheet), so the
// desktop centered-dialog layout applies.
const stage: React.CSSProperties = {
  position: "relative",
  transform: "translateZ(0)",
  width: 660,
  height: 460,
  overflow: "hidden",
  borderRadius: 12,
  background: "var(--page)",
};

/** Centered dialog (desktop) / bottom-sheet (mobile), shown open with a real confirmation body. */
export function Open() {
  return (
    <div style={stage}>
      <Sheet open title="ขอเป็นหัวหน้าโครงการ" onClose={() => {}}>
        <p className="text-sm text-ink-soft">
          ยืนยันการส่งคำขอเป็นหัวหน้าโครงการนี้ ระบบจะแจ้งแอดมินเพื่ออนุมัติ และจะใช้รูป LINE ของคุณเป็นรูปแทนโครงการ
        </p>
        <div className="mt-4 flex gap-2">
          <button className="rounded-full bg-hero px-4 py-2 text-sm font-medium text-[var(--on-primary)]">ส่งคำขอ</button>
          <button className="rounded-full border border-border px-4 py-2 text-sm text-ink">ยกเลิก</button>
        </div>
      </Sheet>
    </div>
  );
}
