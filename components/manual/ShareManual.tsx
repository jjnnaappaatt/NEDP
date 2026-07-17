"use client";

import { useState } from "react";
import { IconLink, IconCheck } from "@tabler/icons-react";

// Always share the CANONICAL production link (not a preview/host URL), so a copied/QR link points at the
// real guide. NEXT_PUBLIC_APP_URL is inlined at build (same env the rest of the app uses).
const MANUAL_URL = (process.env.NEXT_PUBLIC_APP_URL || "https://your-app.example") + "/manual";

/**
 * "แชร์คู่มือนี้" — a self-contained share card for the PUBLIC guide: a copy-link button (canonical
 * /manual URL) + a QR of the same. Styled with the guide's own manual.css tokens (not the app's Tailwind).
 * The manual is open to anyone (no login / no LINE), so this is safe to hand to non-users.
 */
export function ShareManual() {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(MANUAL_URL);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable (insecure context / denied) — the QR is the fallback */
    }
  }

  return (
    <div
      style={{
        display: "flex", flexWrap: "wrap", alignItems: "center",
        gap: "clamp(16px,3vw,28px)", justifyContent: "space-between",
        padding: "clamp(20px,3vw,28px)", borderRadius: 20,
        border: "1px solid var(--border)", background: "var(--accent-soft)",
      }}
    >
      <div style={{ minWidth: "min(100%,280px)", flex: "1 1 300px" }}>
        <div style={{ fontSize: "clamp(19px,2.4vw,22px)", fontWeight: 800, color: "var(--text-primary)" }}>
          แชร์คู่มือนี้
        </div>
        <div style={{ marginTop: 6, fontSize: 16, lineHeight: 1.55, color: "var(--text-secondary)", maxWidth: "40em" }}>
          เปิดได้ทันที ไม่ต้องเข้าสู่ระบบหรือเพิ่มเพื่อน LINE — ส่งลิงก์ให้เพื่อนร่วมงาน หรือให้สแกน QR
        </div>
        <button
          type="button"
          onClick={copy}
          aria-live="polite"
          style={{
            marginTop: 16, display: "inline-flex", alignItems: "center", gap: 9,
            padding: "12px 20px", borderRadius: 999, border: "1px solid var(--border)",
            background: "var(--page)", color: copied ? "var(--success-fg)" : "var(--text-primary)",
            fontWeight: 700, fontSize: 16, cursor: "pointer", transition: "color .2s, border-color .2s",
          }}
        >
          {copied ? <IconCheck size={18} stroke={2.4} /> : <IconLink size={18} stroke={2} />}
          {copied ? "คัดลอกแล้ว" : "คัดลอกลิงก์คู่มือ"}
        </button>
      </div>
      {/* Add your own /manual/manual-qr.png (a QR of MANUAL_URL) + an <img> here for a scannable QR. */}
    </div>
  );
}
