import Link from "next/link";
import { InnerPageNav } from "@/components/nav/InnerPageNav";
import { HeroHeading } from "@/components/forms/HeroHeading";
import { ProfileForm } from "@/components/profile/ProfileForm";
import { ActivityLog } from "@/components/profile/ActivityLog";
import { getMe, getMyContact, getMyActivity } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const [me, contact, activity] = await Promise.all([getMe(), getMyContact(), getMyActivity()]);

  return (
    <div className="space-y-4">
      <InnerPageNav title="โปรไฟล์" />
      <header>
        <HeroHeading>โปรไฟล์ของฉัน</HeroHeading>
        <p className="mt-2 text-sm text-ink-soft">แก้ไขข้อมูลผู้ติดต่อ และดูประวัติการใช้งานของคุณ</p>
      </header>

      <ProfileForm me={me} initial={{ name: contact.name, phone: contact.phone, org: contact.org, email: contact.email }} lineLinked={contact.lineLinked} />

      <ActivityLog items={activity} />

      <Link href="/dashboard" className="block py-2 text-center text-sm text-ink-soft">← กลับหน้าหลัก</Link>
    </div>
  );
}
