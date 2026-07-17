import { listQuestionnaires } from "@/lib/data";
import { QuestionnaireManager } from "@/components/admin/QuestionnaireManager";

export const dynamic = "force-dynamic";

export default async function AdminQuestionnairesPage() {
  const questionnaires = await listQuestionnaires();
  return (
    <div className="space-y-5">
      <header>
        <h1 className="hero-heading hero-heading--wrap">แบบสอบถาม</h1>
        <p className="mt-2 text-sm text-ink-soft">
          สร้างแบบสอบถามเฉพาะของแต่ละโครงการโดยนำเข้า JSON แล้วนำไปกำหนดให้โครงการที่หน้า “โครงการ” — ระบบสร้างฟอร์ม/ไฟล์ Excel/คู่มือให้อัตโนมัติ
        </p>
      </header>
      <QuestionnaireManager initial={questionnaires} />
    </div>
  );
}
