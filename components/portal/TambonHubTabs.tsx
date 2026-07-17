"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { IconUserPlus, IconUsers, IconHeart } from "@tabler/icons-react";
import { cn } from "@/lib/utils";
import { EnrollPersonForm } from "./EnrollPersonForm";
import { PersonSearchPanel } from "./PersonSearchPanel";
import { OsmCountForm } from "./OsmCountForm";

type Tab = "people" | "enroll" | "osm";

/** The ตำบล hub: browse/search people, enroll a new person, or set the อสม. count. Opening a person and
 *  refreshing folder status are delegated up via onOpenPerson / onChange. */
export function TambonHubTabs({
  projectId, tambonCode, onOpenPerson, onChange, refreshKey = 0,
}: {
  projectId: string; tambonCode: string;
  onOpenPerson: (personId: string) => void;
  onChange: () => void;
  refreshKey?: number;
}) {
  const [tab, setTab] = useState<Tab>("people");
  const tabs = [
    { id: "people" as const, label: "รายชื่อ/ค้นหา", icon: IconUsers },
    { id: "enroll" as const, label: "เพิ่มผู้สูงอายุ", icon: IconUserPlus },
    { id: "osm" as const, label: "อสม.", icon: IconHeart },
  ];

  return (
    <div className="space-y-4">
      <div className="flex gap-1 rounded-full bg-surface-soft p-1">
        {tabs.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={cn(
              "flex min-h-[44px] flex-1 items-center justify-center gap-1.5 rounded-full px-2 text-sm font-medium transition",
              tab === t.id ? "bg-surface text-ink shadow-card" : "text-ink-soft",
            )}>
            <t.icon size={17} /> <span className="truncate">{t.label}</span>
          </button>
        ))}
      </div>
      <Card>
        {tab === "people" && (
          <PersonSearchPanel projectId={projectId} tambonCode={tambonCode} onOpenPerson={onOpenPerson} reloadKey={refreshKey} />
        )}
        {tab === "enroll" && (
          <EnrollPersonForm projectId={projectId} tambonCode={tambonCode}
            onEnrolled={onChange} onViewList={() => setTab("people")} />
        )}
        {tab === "osm" && <OsmCountForm projectId={projectId} tambonCode={tambonCode} />}
      </Card>
    </div>
  );
}
