import Link from "next/link";
import { redirect } from "next/navigation";
import { IconChevronRight, IconMapPin } from "@tabler/icons-react";
import { getMyProjects } from "@/lib/data";
import { getCurrentMonth } from "@/lib/format";

export const dynamic = "force-dynamic";

/** ส่งข้อมูล portal — pick a project to enter this month's data. (Jumps straight in if there's only one.) */
export default async function SubmitPickerPage() {
  const mine = await getMyProjects(getCurrentMonth());
  if (mine.length === 1) redirect(`/submit/${mine[0].project.id}`);

  return (
    <div className="space-y-4">
      <header>
        <h1 className="hero-heading">ส่งข้อมูล</h1>
        <p className="mt-2 text-sm text-ink-soft">เลือกโครงการเพื่อกรอกและส่งข้อมูลรายเดือน</p>
      </header>

      {mine.length === 0 ? (
        <div className="card p-8 text-center">
          <p className="text-ink-soft">ยังไม่มีโครงการที่ลงทะเบียนไว้</p>
          <Link href="/register" className="mt-4 inline-block rounded-xl bg-hero px-5 py-2.5 text-sm font-semibold text-[var(--on-primary)]">
            ➕ ลงทะเบียนโครงการ
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {mine.map((m) => (
            <Link key={m.project.id} href={`/submit/${m.project.id}`} className="card flex items-center gap-3 p-4 hover:border-border-accent">
              <span className="icon-badge" style={{ background: "var(--accent-soft)", color: "var(--text-accent)" }}>
                <IconMapPin size={22} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium text-ink">{m.project.name}</div>
                <div className="text-xs text-ink-muted">ส่งแล้ว {m.locationsDone}/{m.locationsTotal} พื้นที่</div>
              </div>
              <IconChevronRight size={18} className="shrink-0 text-ink-muted" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
