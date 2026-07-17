import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { supabaseAdmin } from "@/lib/supabase/server";
import { submitIssue } from "@/lib/data";

export const dynamic = "force-dynamic";
const MAX_BYTES = 5 * 1024 * 1024; // 5 MB

/** User รายงานปัญหา submit (multipart: type, description, email, screenshot). Uploads the screenshot to the
 *  private issue-screenshots bucket, then creates a monitor_issues row (→ admin queue). Returns the ticket. */
export async function POST(req: Request) {
  const form = await req.formData();
  const type = String(form.get("type") ?? "").trim();
  const description = String(form.get("description") ?? "").trim();
  const email = String(form.get("email") ?? "").trim();
  if (!description) return NextResponse.json({ error: "description required" }, { status: 400 });

  let screenshotPath: string | undefined;
  const file = form.get("screenshot");
  if (file instanceof File && file.size > 0) {
    if (!file.type.startsWith("image/")) return NextResponse.json({ error: "image only" }, { status: 400 });
    if (file.size > MAX_BYTES) return NextResponse.json({ error: "file too large" }, { status: 400 });
    const ext = (file.name.split(".").pop() || "png").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 5) || "png";
    const path = `${randomUUID()}.${ext}`;
    const buf = Buffer.from(await file.arrayBuffer());
    const { error: upErr } = await supabaseAdmin().storage
      .from("issue-screenshots").upload(path, buf, { contentType: file.type });
    if (!upErr) screenshotPath = path; // a failed upload shouldn't lose the report — just skip the image
  }

  try {
    const report = await submitIssue({ type, description, email: email || undefined, screenshotPath });
    return NextResponse.json({ ok: true, ticket: report.ticket });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
