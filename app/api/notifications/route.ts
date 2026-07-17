import { NextResponse } from "next/server";
import { getNotifications } from "@/lib/data";

export const dynamic = "force-dynamic";

/** Bell feed for the signed-in user (deadlines + unfinished work + pending requests). */
export async function GET() {
  const items = await getNotifications();
  return NextResponse.json({ items });
}
