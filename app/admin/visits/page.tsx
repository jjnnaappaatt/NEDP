import { getSiteVisits, getMonitorProvinces } from "@/lib/data";
import { VisitsManager } from "@/components/admin/VisitsManager";

export const dynamic = "force-dynamic";

export default async function AdminVisitsPage() {
  const [visits, provinces] = await Promise.all([getSiteVisits(), getMonitorProvinces()]);
  return (
    <div className="space-y-5">
      <header>
        <h1 className="hero-heading hero-heading--wrap">ลงพื้นที่</h1>
        <p className="mt-2 text-sm text-ink-soft">
          สร้างและส่งคำเชิญลงพื้นที่ตรวจเยี่ยมผ่าน LINE ไปยังโครงการในจังหวัดเป้าหมาย · ดูผู้ตอบรับ (RSVP)
        </p>
      </header>
      <VisitsManager initial={visits} provinces={provinces} />
    </div>
  );
}
