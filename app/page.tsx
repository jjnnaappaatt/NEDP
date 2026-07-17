import { redirect } from "next/navigation";

/** Only allow same-origin paths — never an absolute/protocol-relative URL (open-redirect guard). */
function safeInternalPath(value: string | string[] | undefined): string | null {
  const v = Array.isArray(value) ? value[0] : value;
  if (!v) return null;
  let p: string;
  try {
    p = decodeURIComponent(v);
  } catch {
    return null;
  }
  if (!p.startsWith("/") || p.startsWith("//")) return null;
  return p;
}

/**
 * Root entry. Opened from LINE via a LIFF deep link (liff.line.me/{id}/<path>), LINE lands here as
 * `/?liff.state=%2F<path>` (the Endpoint URL is the site root). Honor that path so each menu/card
 * opens its intended page instead of all collapsing onto /dashboard. A normal visit → /dashboard.
 */
export default async function Home({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const target = safeInternalPath(sp["liff.state"]) ?? safeInternalPath(sp["to"]);
  redirect(target && target !== "/" ? target : "/dashboard");
}
