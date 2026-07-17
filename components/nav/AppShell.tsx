import type { ReactNode } from "react";
import { headers } from "next/headers";
import { getMe } from "@/lib/data";
import { AppChrome } from "./AppChrome";
import type { Account } from "@/types";

// The bare routes (public /manual guide, self-shelled /admin) render children directly in AppChrome and
// never read `me`, so we skip getMe() there — that keeps the PUBLIC /manual free of any Supabase call.
// Mirrors getMe()'s own guest fallback shape (see lib/data/sb/accounts.ts). `me` is unused on these routes.
const GUEST: Account = { id: "", name: "ผู้เยี่ยมชม", avatarColor: "#1a56db", isMe: true };
const isBare = (p: string) =>
  p === "/manual" || p.startsWith("/manual/") || p === "/admin" || p.startsWith("/admin/");

// Renders the entire shell (identity included) in ONE server pass — deliberately NOT streamed.
// Streaming the TopBar behind <Suspense> made the LINE/iOS WKWebView hold the first paint until you
// tapped; a single complete HTML response (no $RC swap-ins) paints on load. getMe is one cached
// cookie+query, so awaiting it up front costs little. The pathname comes from middleware's x-pathname
// header. AppChrome (client) then picks the chrome by route — bare under /admin* and /manual*.
export async function AppShell({ children }: { children: ReactNode }) {
  const path = (await headers()).get("x-pathname") ?? "";
  const me = isBare(path) ? GUEST : await getMe();
  return <AppChrome me={me}>{children}</AppChrome>;
}
