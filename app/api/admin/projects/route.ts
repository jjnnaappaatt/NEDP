import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-auth";
import {
  createMonitorProject, updateMonitorProject, deleteMonitorProject, setProjectAvatar, setProjectHead,
  assignQuestionnaire, unassignQuestionnaire, mintProjectClaimLink,
} from "@/lib/data";

/** Admin project management. POST { action: create|update|delete|avatar|head, ... }. Admin-gated. */
export async function POST(req: Request) {
  if (!(await getAdminSession())) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const action = String(b.action ?? "");
  switch (action) {
    case "create": {
      const name = String(b.name ?? "").trim();
      if (!name) return NextResponse.json({ ok: false, error: "ต้องระบุชื่อโครงการ" }, { status: 400 });
      return NextResponse.json(await createMonitorProject({ name, researcher: b.researcher as string, org: b.org as string }));
    }
    case "update":
      return NextResponse.json(await updateMonitorProject(Number(b.pid), {
        name: b.name as string, researcher: b.researcher as string, org: b.org as string, active: b.active as boolean,
      }));
    case "delete":
      return NextResponse.json(await deleteMonitorProject(Number(b.pid)));
    case "avatar":
      return NextResponse.json(await setProjectAvatar(Number(b.sourcePid), (b.accountId as string) ?? null));
    case "head":
      return NextResponse.json(await setProjectHead(Number(b.sourcePid), (b.accountId as string) ?? null));
    case "claim-link":
      return NextResponse.json(await mintProjectClaimLink(Number(b.sourcePid)));
    case "assign-questionnaire":
      return NextResponse.json(await assignQuestionnaire(
        String(b.projectId ?? ""), String(b.questionnaireId ?? ""),
        Array.isArray(b.modules) ? (b.modules as string[]) : []));
    case "unassign-questionnaire":
      return NextResponse.json(await unassignQuestionnaire(String(b.projectId ?? "")));
    default:
      return NextResponse.json({ ok: false, error: "bad action" }, { status: 400 });
  }
}
