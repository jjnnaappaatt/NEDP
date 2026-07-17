import { getMonitorSettings } from "@/lib/data";
import { SettingsForm } from "@/components/admin/SettingsForm";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const settings = await getMonitorSettings();
  return (
    <div className="space-y-5">
      <header>
        <h1 className="hero-heading hero-heading--wrap">ตั้งค่าการแจ้งเตือน</h1>
        <p className="mt-2 text-sm text-ink-soft">
          รอบแจ้งเตือนอัตโนมัติรายวันอ่านค่าเหล่านี้แบบเรียลไทม์ — การบันทึกมีผลกับการแจ้งเตือนรอบถัดไป
        </p>
      </header>
      <SettingsForm initial={settings} />
    </div>
  );
}
