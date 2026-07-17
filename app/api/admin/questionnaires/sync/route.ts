import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-auth";
import { syncQuestionnaireRegistry } from "@/lib/data";

/** Push the built-in questionnaire schemas (lib/questionnaire/registry) into the DB registry. Admin-gated. */
export async function POST() {
  if (!(await getAdminSession())) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  return NextResponse.json(await syncQuestionnaireRegistry());
}
