import { getAdminIssues, getEditRequests } from "@/lib/data";
import { IssuesList } from "@/components/admin/IssuesList";
import { EditRequestsList } from "@/components/admin/EditRequestsList";

export const dynamic = "force-dynamic";

export default async function AdminIssuesPage() {
  const [issues, editRequests] = await Promise.all([getAdminIssues(), getEditRequests()]);
  return (
    <div className="space-y-5">
      <header>
        <h1 className="hero-heading hero-heading--wrap">แจ้งปัญหา</h1>
        <p className="mt-2 text-sm text-ink-soft">
          คำขอแก้ไขข้อมูล {editRequests.length} · เรื่องที่ผู้ใช้แจ้งผ่าน LINE บอท และเว็บแอป {issues.length} รายการ
        </p>
      </header>
      <EditRequestsList initial={editRequests} />
      <div className="space-y-2">
        <p className="text-xs text-ink-muted">💡 กด “แก้แล้ว” เพื่อแจ้งผู้รายงานอัตโนมัติ (LINE + การแจ้งเตือนในแอป)</p>
        <IssuesList initial={issues} />
      </div>
    </div>
  );
}
