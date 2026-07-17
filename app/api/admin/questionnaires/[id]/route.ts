import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-auth";
import { getQuestionnaireSchema } from "@/lib/data";

export const dynamic = "force-dynamic";

/** Admin-gated: one questionnaire's schema, for the live preview of an existing "แบบสอบถามในระบบ". */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getAdminSession())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;
  const q = await getQuestionnaireSchema(id);
  if (!q) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json(q);
}
