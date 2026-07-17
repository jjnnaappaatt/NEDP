import Link from "next/link";
import { getProjects, getRegisteredProjectIds, getMyContact } from "@/lib/data";
import { ProjectPicker } from "@/components/register/ProjectPicker";
import { ContactForm } from "@/components/register/ContactForm";

export const dynamic = "force-dynamic";

export default async function RegisterPage() {
  const [projects, registered, contact] = await Promise.all([
    getProjects(),
    getRegisteredProjectIds(),
    getMyContact(),
  ]);

  return (
    <div className="space-y-4">
      <header>
        <h1 className="hero-heading">ลงทะเบียนโครงการ</h1>
        <p className="mt-2 text-sm text-ink-soft">
          เลือกโครงการที่คุณรับผิดชอบ เพื่อรับการแจ้งเตือนและส่งข้อมูลรายเดือน
        </p>
      </header>

      <ContactForm initialName={contact.name} initialPhone={contact.phone} hasContact={contact.hasContact} lineLinked={contact.lineLinked} />

      {projects.length === 0 ? (
        <div className="card p-8 text-center text-ink-soft">ยังไม่มีโครงการในระบบ</div>
      ) : (
        <ProjectPicker projects={projects} registeredIds={[...registered]} canEnroll={contact.hasContact} />
      )}

      <Link href="/status" className="block py-2 text-center text-sm text-ink-soft">
        ← กลับไปหน้าสถานะ
      </Link>
    </div>
  );
}
