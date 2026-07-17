import "./globals.css";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Inter, IBM_Plex_Sans_Thai } from "next/font/google";
import { AppShell } from "@/components/nav/AppShell";

// Mintlify pairs Inter (Latin/numbers) with a clean neutral sans. Inter has no Thai glyphs, so Thai
// falls back to IBM Plex Sans Thai (a neutral, Inter-adjacent Thai face) via the CSS font stack.
const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-inter",
  display: "swap",
});

const plexThai = IBM_Plex_Sans_Thai({
  subsets: ["thai", "latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-thai",
  display: "swap",
});

export const metadata: Metadata = {
  // Absolute-URL base for OG/Twitter/canonical/sitemap. Reuses the existing site-URL env
  // (NEXT_PUBLIC_APP_URL — also used by lib/line/liff.ts, reminders.ts, _core.ts).
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "https://your-app.example"),
  title: "NEDP — ระบบติดตามโครงการมุ่งเป้าสูงวัย",
  description: "ระบบติดตาม จัดอันดับ และส่งข้อมูลรายเดือนของโครงการวิจัยมุ่งเป้าสูงวัย",
};

export const dynamic = "force-dynamic";

// Runs before paint (first thing in <body>) so the saved theme — or the OS preference when none is
// saved — is applied with no flash of the wrong theme. The ThemeToggle persists the choice.
const THEME_INIT = `(function(){try{var t=localStorage.getItem('nedp-theme');` +
  `var d=t==='dark'||(t!=='light'&&matchMedia('(prefers-color-scheme: dark)').matches);` +
  `var r=document.documentElement;r.classList.toggle('dark',d);r.style.colorScheme=d?'dark':'light';}catch(e){}})();`;

// AppShell renders the whole shell (incl. identity) in one server pass — deliberately NOT streamed.
// Streaming behind <Suspense> made the LINE/iOS WebView hold the first paint until you tapped a menu;
// a single complete HTML response paints on load. (getMe is a cached cookie+query.)
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="th" className={`${inter.variable} ${plexThai.variable}`}>
      <body>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT }} />
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
