import Link from "next/link";
import { ProjectStatusCard } from "@/components/status/ProjectStatusCard";
import { getMyProjects } from "@/lib/data";
import { getCurrentMonth, monthLabelThai } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function StatusPage() {
  const month = getCurrentMonth();
  const items = await getMyProjects(month);

  return (
    <div className="space-y-4">
      <header>
        <h1 className="hero-heading">สถานะการส่งข้อมูล</h1>
        <p className="mt-2 text-sm text-ink-soft">
          รอบ {monthLabelThai(month)} · โครงการที่คุณรับผิดชอบ {items.length} โครงการ
        </p>
      </header>

      {items.length === 0 ? (
        <div className="card p-8 text-center">
          <p className="text-ink-soft">ยังไม่มีโครงการที่ลงทะเบียนไว้</p>
          <Link
            href="/register"
            className="mt-4 inline-block rounded-xl bg-hero px-5 py-2.5 text-sm font-semibold text-[var(--on-primary)]"
          >
            ➕ ลงทะเบียนโครงการ
          </Link>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {items.map((item) => (
              <ProjectStatusCard key={item.project.id} item={item} />
            ))}
          </div>
          <Link href="/register" className="block py-1 text-center text-sm text-ink-soft">
            ➕ ลงทะเบียนโครงการเพิ่ม
          </Link>
        </>
      )}
    </div>
  );
}
