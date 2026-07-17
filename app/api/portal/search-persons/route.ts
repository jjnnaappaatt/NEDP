import { NextResponse } from "next/server";
import { searchPersons, isProjectContact } from "@/lib/data";

export const dynamic = "force-dynamic";

/** Project-scoped name search (names are decrypted server-side). Gated here because the data-layer
 *  search itself does not check membership — only project contacts may see names. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const projectId = url.searchParams.get("projectId") ?? "";
  const tambonCode = url.searchParams.get("tambonCode") || undefined;
  const query = url.searchParams.get("query") ?? "";
  if (!projectId) return NextResponse.json({ people: [] });
  if (!(await isProjectContact(projectId))) {
    return NextResponse.json({ people: [], error: "not_contact" }, { status: 403 });
  }
  const people = await searchPersons(projectId, { query, tambonCode });
  return NextResponse.json({ people });
}
