import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./manual.css";

const TITLE = "NEDP — คู่มือการใช้งาน";
const DESC =
  "คู่มือการใช้งานระบบ NEDP สำหรับเจ้าหน้าที่ภาคสนาม — เปิดจาก LINE, บันทึกคะแนน AAI รายบุคคล 4 มิติ, ดูผลรายพื้นที่ และการแจ้งเตือน";

// The manual is a PUBLIC, shareable guide website (no login / no LINE). These tags give a pasted link
// a proper social preview card. og:image is a static brand card (no domain/QR baked in), so it's safe
// to ship as-is — no metadataBase dependency needed for it.
export const metadata: Metadata = {
  title: TITLE,
  description: DESC,
  alternates: { canonical: "/manual" },
  openGraph: {
    type: "website",
    siteName: "NEDP",
    locale: "th_TH",
    url: "/manual",
    title: TITLE,
    description: DESC,
    images: [{ url: "/manual/og.png", width: 1200, height: 630, alt: TITLE }],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESC,
    images: ["/manual/og.png"],
  },
};

/** /manual renders bare (AppChrome skips it) — this layout just scopes the guide's stylesheet + metadata. */
export default function ManualLayout({ children }: { children: ReactNode }) {
  return children;
}
