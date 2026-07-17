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
  const dest = target && target !== "/" ? target : "/dashboard";
  // A LINE Login (web/desktop) return lands here as `/?liff.state=%2F<path>&code=…&state=…`: LINE
  // appends the OAuth `code`/`state` to the LIFF Endpoint URL (this root). Forward every param EXCEPT
  // the deep-link keys we just consumed, so the code reaches the target page where the client `liff.init()`
  // exchanges it for a session. A bare `redirect(dest)` drops the code → `isLoggedIn()` stays false →
  // no account cookie → the login loops back as guest. (In-LINE opens don't carry a code, so this is inert
  // for them.)
  const passthrough = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) {
    if (k === "liff.state" || k === "to") continue;
    const val = Array.isArray(v) ? v[0] : v;
    if (typeof val === "string") passthrough.set(k, val);
  }
  const qs = passthrough.toString();
  redirect(qs ? `${dest}?${qs}` : dest);
}
