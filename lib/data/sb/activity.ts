/**
 * Project team-activity feed — everything members did that affects project data (enroll / AAI score /
 * purge / monthly submit / location edits / อสม.), normalized + newest-first, for the chief (หัวหน้า
 * โครงการ) and owner-role members. Per-source limited queries merged in memory (same approach as
 * accounts.getMyActivity). PRIVACY: restricted.name_lookup_log / reidentification_log are deliberately
 * NOT surfaced here — who looked up whose real name stays admin-only. Imports ./_core only.
 */
import "server-only";
import { supabaseAdmin } from "@/lib/supabase/server";
import { _num } from "./_core";

export type ProjectActivityAction =
  | "enroll" | "assess" | "purge" | "submit" | "draft" | "edit_request" | "loc_edit" | "verify" | "osm";

export type ProjectActivityItem = {
  when: string;                 // ISO timestamp
  whoName: string;              // display name; "ไม่ระบุ" for rows written before actor attribution
  action: ProjectActivityAction;
  targetLabel: string;          // person_code · "ต.<tambon>" · "รายการพื้นที่"
  detail?: string;
};

type Rec = Record<string, unknown>;
const S = (v: unknown) => (v == null ? "" : String(v));
const monthTh = (ym: string) => { const [y, m] = (ym ?? "").split("-"); return y ? `${m}/${Number(y) + 543}` : ym; };

/** All recent member actions affecting this project's data, newest first. Gate upstream with
 *  canSeeTeamActivity() — this function itself does no authorization. */
export async function getProjectActivity(projectId: string, opts: { limit?: number } = {}): Promise<ProjectActivityItem[]> {
  const db = supabaseAdmin();

  const [enrolls, assesses, purges, subs, locEdits, osm] = await Promise.all([
    db.from("persons").select("id,person_code,tambon_code,enrolled_at,enrolled_by")
      .eq("project_id", projectId).order("enrolled_at", { ascending: false }).limit(30),
    db.from("person_assessments").select("person_id,year_month,aai_overall,assessor_account_id,updated_at")
      .eq("project_id", projectId).order("updated_at", { ascending: false }).limit(50),
    db.from("person_purge_audit").select("person_code,tambon_code,n_assessments,purged_by,purged_at")
      .eq("project_id", projectId).order("purged_at", { ascending: false }).limit(20),
    db.from("location_submissions").select("account_id,location_id,year_month,status,submitted_at,updated_at,edit_requested_at")
      .eq("project_id", projectId).order("updated_at", { ascending: false }).limit(40),
    db.from("location_audit_log").select("action,changed_by,changed_at,before_data,after_data")
      .eq("project_id", projectId).order("changed_at", { ascending: false }).limit(30),
    db.from("tambon_osm_counts").select("tambon_code,year_month,osm_before,osm_after,entered_by,updated_by,updated_at")
      .eq("project_id", projectId).order("updated_at", { ascending: false }).limit(20),
  ]);

  const eRows = (enrolls.data ?? []) as Rec[];
  const aRows = (assesses.data ?? []) as Rec[];
  const pRows = (purges.data ?? []) as Rec[];
  const sRows = (subs.data ?? []) as Rec[];
  const lRows = (locEdits.data ?? []) as Rec[];
  const oRows = (osm.data ?? []) as Rec[];

  // one accounts lookup for every uuid actor (loc audit already stores names)
  const actorIds = new Set<string>();
  for (const r of eRows) if (r.enrolled_by) actorIds.add(S(r.enrolled_by));
  for (const r of aRows) if (r.assessor_account_id) actorIds.add(S(r.assessor_account_id));
  for (const r of pRows) if (r.purged_by) actorIds.add(S(r.purged_by));
  for (const r of sRows) if (r.account_id) actorIds.add(S(r.account_id));
  for (const r of oRows) { if (r.updated_by) actorIds.add(S(r.updated_by)); else if (r.entered_by) actorIds.add(S(r.entered_by)); }

  // person codes for assessments outside the recent-enroll window + tambon names + location names
  const personIds = new Set(aRows.map((r) => S(r.person_id)));
  const tambonCodes = new Set<string>();
  for (const r of [...eRows, ...pRows, ...oRows]) if (r.tambon_code) tambonCodes.add(S(r.tambon_code));
  const locIds = new Set(sRows.map((r) => S(r.location_id)));

  const [acctRes, personRes, geoRes, locRes] = await Promise.all([
    actorIds.size ? db.from("accounts").select("id,name").in("id", [...actorIds]) : Promise.resolve({ data: [] as Rec[] }),
    personIds.size ? db.from("persons").select("id,person_code").in("id", [...personIds]) : Promise.resolve({ data: [] as Rec[] }),
    tambonCodes.size ? db.from("geo_tambon").select("tambon_code,tambon_th").in("tambon_code", [...tambonCodes]) : Promise.resolve({ data: [] as Rec[] }),
    locIds.size ? db.from("project_locations").select("id,tambon").in("id", [...locIds]) : Promise.resolve({ data: [] as Rec[] }),
  ]);
  const who = new Map(((acctRes.data ?? []) as Rec[]).map((a) => [S(a.id), S(a.name)]));
  const code = new Map(((personRes.data ?? []) as Rec[]).map((p) => [S(p.id), S(p.person_code)]));
  const tam = new Map(((geoRes.data ?? []) as Rec[]).map((g) => [S(g.tambon_code), S(g.tambon_th)]));
  const loc = new Map(((locRes.data ?? []) as Rec[]).map((l) => [S(l.id), S(l.tambon)]));
  const name = (id: unknown) => (id ? who.get(S(id)) || "ไม่ระบุ" : "ไม่ระบุ");
  const tName = (c: unknown) => { const t = tam.get(S(c)); return t ? `ต.${t}` : S(c); };

  const items: ProjectActivityItem[] = [];

  for (const r of eRows) {
    items.push({
      when: S(r.enrolled_at), whoName: name(r.enrolled_by), action: "enroll",
      targetLabel: S(r.person_code), detail: tName(r.tambon_code),
    });
  }
  for (const r of aRows) {
    const overall = _num(r.aai_overall);
    items.push({
      when: S(r.updated_at), whoName: name(r.assessor_account_id), action: "assess",
      targetLabel: code.get(S(r.person_id)) ?? "—",
      detail: `รอบ ${monthTh(S(r.year_month))}${overall != null ? ` · AAI รวม ${overall}` : ""}`,
    });
  }
  for (const r of pRows) {
    items.push({
      when: S(r.purged_at), whoName: name(r.purged_by), action: "purge",
      targetLabel: S(r.person_code),
      detail: `${tName(r.tambon_code)} · ลบคะแนน ${_num(r.n_assessments) ?? 0} รายการ`,
    });
  }
  for (const r of sRows) {
    const submitted = r.status === "submitted";
    items.push({
      when: S(submitted ? (r.submitted_at ?? r.updated_at) : r.updated_at), whoName: name(r.account_id),
      action: submitted ? "submit" : "draft",
      targetLabel: `ต.${loc.get(S(r.location_id)) || "—"}`, detail: `รอบ ${monthTh(S(r.year_month))}`,
    });
    if (r.edit_requested_at) {
      items.push({
        when: S(r.edit_requested_at), whoName: name(r.account_id), action: "edit_request",
        targetLabel: `ต.${loc.get(S(r.location_id)) || "—"}`, detail: `รอบ ${monthTh(S(r.year_month))}`,
      });
    }
  }
  for (const r of lRows) {
    const before = (r.before_data ?? {}) as Rec;
    const after = (r.after_data ?? {}) as Rec;
    const tambon = S(after.tambon ?? before.tambon);
    items.push({
      when: S(r.changed_at), whoName: S(r.changed_by) || "ไม่ระบุ",
      action: r.action === "verify" ? "verify" : "loc_edit",
      targetLabel: tambon ? `ต.${tambon}` : "รายการพื้นที่",
      detail: r.action === "verify" ? undefined : S(r.action),
    });
  }
  for (const r of oRows) {
    items.push({
      when: S(r.updated_at), whoName: name(r.updated_by ?? r.entered_by), action: "osm",
      targetLabel: tName(r.tambon_code),
      detail: `รอบ ${monthTh(S(r.year_month))} · ก่อน ${_num(r.osm_before) ?? "—"} / หลัง ${_num(r.osm_after) ?? "—"}`,
    });
  }

  return items.filter((i) => i.when).sort((a, b) => (a.when < b.when ? 1 : -1)).slice(0, opts.limit ?? 50);
}
