import { NextResponse } from "next/server";
import { enrollPerson } from "@/lib/data";

export const dynamic = "force-dynamic";

/** Enroll a new elderly person (code auto-assigned server-side; name encrypted server-side). Gated in the data layer. */
export async function POST(req: Request) {
  let body: Parameters<typeof enrollPerson>[0];
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "bad body" }, { status: 400 });
  }
  if (!body?.projectId || !body?.tambonCode) {
    return NextResponse.json({ ok: false, error: "missing fields" }, { status: 400 });
  }
  const r = await enrollPerson(body);
  return NextResponse.json(r, { status: r.ok ? 200 : 400 });
}
