"use client";

import { useState } from "react";
import { IconHome2, IconPencil, IconListCheck, IconTrophy, IconDots } from "@tabler/icons-react";

/** The app screens reachable from the bottom nav (the screenshots are light-mode captures at 390×844). */
const TABS = [
  { key: "home", label: "หน้าหลัก", Icon: IconHome2, src: "/manual/dashboard.png", alt: "หน้าหลัก NEDP" },
  { key: "submit", label: "ส่งข้อมูล", Icon: IconPencil, src: "/manual/submit-picker.png", alt: "ส่งข้อมูล — เลือกโครงการ" },
  { key: "status", label: "สถานะ", Icon: IconListCheck, src: "/manual/status.png", alt: "สถานะการส่งข้อมูล" },
  { key: "rank", label: "อันดับ", Icon: IconTrophy, src: "/manual/leaderboard.png", alt: "อันดับการส่งข้อมูล" },
] as const;

/**
 * A phone mock whose in-phone bottom nav is clickable — tapping a tab crossfades the screen to that menu's
 * screenshot (the screenshot's own captured nav is cropped away and replaced by this live one). Lets a
 * reader explore หน้าหลัก / ส่งข้อมูล / สถานะ / อันดับ from any section. The nav stays light to match the
 * light-mode app captures, regardless of the page theme.
 */
export function InteractivePhone({ initial = "home", className = "" }: { initial?: string; className?: string }) {
  const [active, setActive] = useState(initial);
  return (
    <div className={`mn-phone mn-iphone ${className}`}>
      <div className="mn-phone-screen mn-iphone-screen">
        <div className="mn-iphone-shot">
          {TABS.map((t) => (
            // eslint-disable-next-line @next/next/no-img-element -- static /manual asset, crossfaded
            <img key={t.key} src={t.src} alt={t.alt} className={active === t.key ? "is-on" : ""} />
          ))}
        </div>
        <div className="mn-iphone-nav" role="tablist" aria-label="เมนูแอป NEDP">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={active === t.key}
              aria-label={t.label}
              className={`mn-iphone-tab ${active === t.key ? "is-active" : ""}`}
              onClick={() => setActive(t.key)}
            >
              <t.Icon size={18} stroke={1.9} />
              <span>{t.label}</span>
            </button>
          ))}
          <span className="mn-iphone-tab mn-iphone-tab--more" aria-hidden="true">
            <IconDots size={18} stroke={1.9} />
            <span>เพิ่มเติม</span>
          </span>
        </div>
      </div>
    </div>
  );
}
