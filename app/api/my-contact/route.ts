import { NextResponse } from "next/server";
import { setMyContact } from "@/lib/data";

export const dynamic = "force-dynamic";

/** Save the signed-in account's profile (name + phone required; org + email optional). */
export async function POST(req: Request) {
  let name = "", phone = "";
  let org: string | undefined, email: string | undefined;
  try {
    const body = await req.json();
    name = String(body?.name ?? "").trim();
    phone = String(body?.phone ?? "").trim();
    if (body?.org !== undefined) org = String(body.org ?? "").trim();
    if (body?.email !== undefined) email = String(body.email ?? "").trim();
  } catch {
    return NextResponse.json({ ok: false, error: "bad body" }, { status: 400 });
  }
  if (!phone) {
    return NextResponse.json({ ok: false, error: "phone required" }, { status: 400 });
  }
  const r = await setMyContact({ name, phone, org, email });
  return NextResponse.json(r, { status: r.ok ? 200 : 400 });
}
