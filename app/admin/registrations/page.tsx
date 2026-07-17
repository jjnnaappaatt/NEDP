import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils";
import { getRegistrations } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function AdminRegistrationsPage() {
  const groups = await getRegistrations();
  const totalContacts = groups.reduce((s, g) => s + g.contacts.length, 0);
  return (
    <div className="space-y-5">
      <header>
        <h1 className="hero-heading hero-heading--wrap">การลงทะเบียนผู้ติดต่อ</h1>
        <p className="mt-2 text-sm text-ink-soft">
          ผู้รับการแจ้งเตือน (LINE / อีเมล) รายโครงการ · {totalContacts} ราย ·{" "}
          <Link href="/register" className="text-accent hover:underline">ลิงก์ลงทะเบียน</Link>
        </p>
      </header>
      <div className="space-y-2">
        {groups.map((g) => (
          <Card key={g.pid} className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="line-clamp-2 min-w-0 font-medium text-ink">{g.projectName}</div>
              <span className="shrink-0 text-sm text-ink-soft">{g.contacts.length} ราย</span>
            </div>
            {g.contacts.length === 0 ? (
              <p className="text-xs text-ink-muted">ยังไม่มีผู้ลงทะเบียน</p>
            ) : (
              <ul className="space-y-1">
                {g.contacts.map((c, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm">
                    <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", c.active ? "bg-success" : "bg-ink-muted/40")} />
                    <span className="truncate text-ink">{c.name ?? "—"}</span>
                    {c.hasLine && <span className="rounded bg-[#06C755]/15 px-1.5 text-[10px] font-medium text-[#06C755]">LINE</span>}
                    {!c.active && <span className="text-xs text-ink-muted">(ปิดใช้งาน)</span>}
                  </li>
                ))}
              </ul>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
