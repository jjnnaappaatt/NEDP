import "server-only";
import { createClient } from "@supabase/supabase-js";

/** Server-only admin client (service-role key — never imported by client components). */
export function supabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase env not configured");
  return createClient(url, key, { auth: { persistSession: false } });
}

export const USE_SUPABASE =
  process.env.NEXT_PUBLIC_DATA_SOURCE === "supabase" &&
  !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
  !!process.env.SUPABASE_SERVICE_ROLE_KEY;
