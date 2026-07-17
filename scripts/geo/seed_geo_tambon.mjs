// Phase 1 data-prep — seed public.geo_tambon (TIS-1099 tambon dimension).
// Source: thailand-geography-data (full national set, 6-digit subdistrictCode).
// Usage: node scripts/geo/seed_geo_tambon.mjs <path-to-geo_seed.json>
// geo_seed.json rows are arrays:
//   [tambon_code, province_code, amphoe_code, province_th, amphoe_th, tambon_th,
//    province_en, amphoe_en, tambon_en, postal_code, geo_join_key]
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

// Read .env.local (URL + service-role key) without echoing secret values.
const env = Object.fromEntries(
  readFileSync(new URL("../../.env.local", import.meta.url), "utf8")
    .split("\n")
    .filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; })
);
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) { console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local"); process.exit(1); }

const seedPath = process.argv[2];
if (!seedPath) { console.error("Usage: node seed_geo_tambon.mjs <geo_seed.json>"); process.exit(1); }

const cols = ["tambon_code","province_code","amphoe_code","province_th","amphoe_th","tambon_th","province_en","amphoe_en","tambon_en","postal_code","geo_join_key"];
const rows = JSON.parse(readFileSync(seedPath, "utf8")).map((r) => Object.fromEntries(cols.map((c, i) => [c, r[i]])));

const db = createClient(url, key, { auth: { persistSession: false } });
const BATCH = 1000;
let done = 0;
for (let i = 0; i < rows.length; i += BATCH) {
  const chunk = rows.slice(i, i + BATCH);
  const { error } = await db.from("geo_tambon").upsert(chunk, { onConflict: "tambon_code" });
  if (error) { console.error("\nBatch failed at", i, "—", error.message); process.exit(1); }
  done += chunk.length;
  process.stdout.write(`  upserted ${done}/${rows.length}\r`);
}
const { count } = await db.from("geo_tambon").select("*", { count: "exact", head: true });
console.log(`\nDone. seeded=${done}, table count=${count}`);
