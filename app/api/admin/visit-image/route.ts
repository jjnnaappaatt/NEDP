import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { getAdminSession } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
const MAX_BYTES = 5 * 1024 * 1024; // 5 MB

/** Admin uploads a ลงพื้นที่ invite image → public visit-invite-images bucket → returns the public URL, which
 *  becomes the LINE Flex hero (LINE's servers fetch the URL, so it must be publicly reachable). */
export async function POST(req: Request) {
  if (!(await getAdminSession())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const form = await req.formData();
  const file = form.get("image");
  if (!(file instanceof File) || file.size === 0) return NextResponse.json({ error: "image required" }, { status: 400 });
  if (!file.type.startsWith("image/")) return NextResponse.json({ error: "image only" }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: "file too large" }, { status: 400 });

  const ext = (file.name.split(".").pop() || "png").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 5) || "png";
  const path = `${randomUUID()}.${ext}`;
  const buf = Buffer.from(await file.arrayBuffer());
  const db = supabaseAdmin();
  const { error } = await db.storage.from("visit-invite-images").upload(path, buf, { contentType: file.type });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const { data } = db.storage.from("visit-invite-images").getPublicUrl(path);
  return NextResponse.json({ ok: true, url: data.publicUrl });
}
