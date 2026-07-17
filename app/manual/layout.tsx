import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./manual.css";

const TITLE = "NEDP — คู่มือการใช้งาน";
const DESC =
  "คู่มือการใช้งานระบบ NEDP สำหรับเจ้าหน้าที่ภาคสนาม — เปิดจาก LINE, บันทึกคะแนน AAI รายบุคคล 4 มิติ, ดูผลรายพื้นที่ และการแจ้งเตือน";

// The manual is a PUBLIC, shareable guide website (no login / no LINE). These tags give a pasted link
// a proper social preview card. Add your own /manual/og.png (1200x630) and an `images` field back in
// to enable a social preview image — omitted here since this repo ships without one.
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
  },
  twitter: {
    card: "summary",
    title: TITLE,
    description: DESC,
  },
};

/** /manual renders bare (AppChrome skips it) — this layout just scopes the guide's stylesheet + metadata. */
export default function ManualLayout({ children }: { children: ReactNode }) {
  return children;
}
