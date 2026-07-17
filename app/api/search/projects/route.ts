import { NextResponse } from "next/server";
import { getProjects } from "@/lib/data";

export const dynamic = "force-dynamic";

/** Lightweight project list for the top-bar search (id + name + org) → jump to /submit/[id]. */
export async function GET() {
  const projects = await getProjects();
  return NextResponse.json({
    projects: projects.map((p) => ({ id: p.id, name: p.name, org: p.org ?? "" })),
  });
}
