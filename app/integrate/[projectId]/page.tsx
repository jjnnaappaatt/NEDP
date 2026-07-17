import { notFound } from "next/navigation";
import { getProject, isProjectContact, getIntegrationStatus, getAssignedQuestionnaire, getQuestionnaireRequestStatus, getHeadQuestionnaireRequests } from "@/lib/data";
import { IntegrationRequestCard } from "@/components/integrate/IntegrationRequestCard";
import { RequestQuestionnaireCard } from "@/components/integrate/RequestQuestionnaireCard";
import { AdminCreateRequestCard } from "@/components/integrate/AdminCreateRequestCard";
import { HeadQuestionnaireApprovals } from "@/components/integrate/HeadQuestionnaireApprovals";
import { QuestionnaireFormatDemo } from "@/components/integrate/QuestionnaireFormatDemo";

export const dynamic = "force-dynamic";

/** Head-facing hub for individual-data integration: the request→approve gate, the bulk upload (once
 *  enabled), and the guide (authoring format + live preview + how the AAI is derived). */
export default async function IntegratePage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const [project, canEdit, status, assigned, qReq, headReqs] = await Promise.all([
    getProject(projectId), isProjectContact(projectId), getIntegrationStatus(projectId), getAssignedQuestionnaire(projectId),
    getQuestionnaireRequestStatus(projectId), getHeadQuestionnaireRequests(projectId),
  ]);
  if (!project) notFound();

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4">
      <header>
        <h1 className="hero-heading">นำเข้าแบบสอบถาม</h1>
        <p className="mt-1 text-sm text-ink-soft">{project.name}</p>
      </header>

      {!status.enabled && (
        <IntegrationRequestCard projectId={projectId} canEdit={canEdit} pending={status.pending} />
      )}

      {status.enabled && headReqs.length > 0 && <HeadQuestionnaireApprovals requests={headReqs} />}

      {status.enabled && (
        <details className="rounded-card border border-border bg-surface-soft/40 p-2 text-sm text-ink-soft" open={qReq.pending}>
          <summary className="cursor-pointer">ขอเพิ่มแบบสอบถามเฉพาะของโครงการ (ให้หัวหน้าโครงการอนุมัติ)</summary>
          <div className="space-y-2 pt-2">
            <RequestQuestionnaireCard projectId={projectId} canEdit={canEdit} pending={qReq.pending} />
            <AdminCreateRequestCard projectId={projectId} projectName={project.name} canEdit={canEdit} />
          </div>
        </details>
      )}

      <section className="space-y-5 rounded-card border border-border bg-surface p-5">
        <div>
          <h2 className="text-lg font-semibold text-ink">คู่มือเตรียมแบบสอบถามของโครงการ (ออกแบบของท่านเอง)</h2>
          <p className="mt-1 text-sm text-ink-soft">
            {assigned ? (
              <>โครงการนี้มี<b>แบบสอบถามตัวอย่าง (NEDP)</b> กำหนดไว้อยู่แล้ว — หากต้องการใช้<b>แบบสอบถามของท่านเอง</b> ให้เตรียมตามรูปแบบด้านล่าง แล้ว<b>เสนอขออนุมัติ</b> (ด้านบน) เมื่ออนุมัติแล้ว ระบบจะสร้างฟอร์มในแอป · ไฟล์ Excel · และคู่มือให้อัตโนมัติ พร้อมคำนวณคะแนน AAI ให้เอง</>
            ) : (
              <>โครงการนี้ยังไม่มีแบบสอบถามเฉพาะ — เตรียมแบบสอบถามของท่านในรูปแบบมาตรฐาน แล้ว<b>เสนอให้หัวหน้าโครงการอนุมัติ</b> (ด้านบน) เมื่ออนุมัติแล้ว ระบบจะสร้างฟอร์มในแอป · ไฟล์ Excel · และคู่มือให้อัตโนมัติ พร้อมคำนวณคะแนน AAI ให้เอง</>
            )}
          </p>
        </div>

        <div className="space-y-2 text-sm text-ink-soft">
          <h3 className="text-base font-semibold text-ink">1. หลักการเตรียมข้อมูล</h3>
          <ul className="list-inside list-disc space-y-1">
            <li>เก็บข้อมูลรายบุคคล — ผู้สูงอายุ 1 คน ต่อ 1 ชุดคำตอบ</li>
            <li>ต้องบันทึก <b>ความยินยอม (PDPA)</b> และพื้นที่ (จังหวัด/อำเภอ/ตำบล) ให้ตรงกับพื้นที่ของโครงการ</li>
            <li>ข้อที่ไม่มีข้อมูลให้เว้นว่าง — ระบบถือว่า “ไม่มีข้อมูล” (ไม่ใช่ 0)</li>
          </ul>
        </div>

        <div className="space-y-3 text-sm text-ink-soft">
          <h3 className="text-base font-semibold text-ink">2. รูปแบบไฟล์แบบสอบถาม (JSON)</h3>
          <ul className="list-inside list-disc space-y-1">
            <li><code>type</code>: <b>radio</b> (เลือกตอบ), <b>scale_5</b> (มาตร 1–5), <b>number</b> (ตัวเลข), <b>checkbox_multi</b> (เลือกได้หลายข้อ)</li>
            <li>แต่ละตัวเลือก (<code>options</code>) มี <code>value</code> (ค่าที่บันทึก) และ <code>label</code> (ข้อความ)</li>
            <li><code>id</code> ของแต่ละข้อไม่ซ้ำกัน — ใช้อ้างอิงในส่วน <code>scores</code></li>
          </ul>
          <QuestionnaireFormatDemo />
        </div>

        <div className="space-y-2 text-sm text-ink-soft">
          <h3 className="text-base font-semibold text-ink">3. ส่วนคำนวณ AAI (แนะนำ)</h3>
          <p>
            เปิดตัวเลือก “<b>รวมส่วนคำนวณ AAI</b>” ตอนเสนอแบบสอบถาม — ระบบจะเพิ่มส่วน “ข้อมูลทั่วไป (AAI)” ให้อัตโนมัติ
            และคำนวณคะแนน AAI (D1–D4) + คะแนนรวม ให้เอง ท่าน<b>ไม่ต้องกรอกคะแนน AAI เอง</b>
          </p>
        </div>

        <div className="space-y-2 text-sm text-ink-soft">
          <h3 className="text-base font-semibold text-ink">4. คะแนนเฉพาะโครงการ (specific score)</h3>
          <p>
            หากต้องการเก็บคะแนนเฉพาะที่ไม่ใช่ AAI (เช่น ความพึงพอใจ · ความรู้ที่เพิ่มขึ้น) ให้ประกาศในช่อง <code>scores</code>:
            ระบุ <code>key</code>, <code>label</code>, รายการข้อ (<code>questions</code>), วิธีรวม (<code>agg</code>: mean/sum) และช่วงค่า (<code>min</code>/<code>max</code>) —
            ระบบจะคำนวณและแสดง/ส่งออกคู่กับ AAI (ดูตัวอย่างในไฟล์ด้านบน)
          </p>
        </div>

        <div className="space-y-2 text-sm text-ink-soft">
          <h3 className="text-base font-semibold text-ink">5. การอนุมัติและนำเข้าข้อมูล</h3>
          <p>
            <b>แก้ไขแบบสอบถาม:</b> ดาวน์โหลดแบบฟอร์ม (.txt) จากด้านบน → แก้ไขเนื้อหาคำถามในโปรแกรมแก้ข้อความ → อัปโหลด/วางกลับในช่อง “ขอเพิ่มแบบสอบถาม” เพื่อเสนอ
          </p>
          <p>
            <b>เมื่ออนุมัติแล้ว:</b> หัวหน้าโครงการอนุมัติ → ระบบสร้างฟอร์มในแอปให้อัตโนมัติ แล้วกรอกข้อมูลผู้สูงอายุรายบุคคลผ่านฟอร์มในแอป (ที่หน้า “ส่งข้อมูล”)
          </p>
        </div>
      </section>
    </div>
  );
}
