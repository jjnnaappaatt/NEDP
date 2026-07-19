/**
 * AAI dimension aggregates + the general individual-entry portal — จังหวัด→อำเภอ→ตำบล drill-down,
 * person enroll + direct 4-domain AAI, อสม. counts, multi-level snapshot dashboard, per-project area
 * tree. All reads/writes go through the service-role client; writes are app-layer gated with
 * isProjectContact(). Imports shared internals from ./_core only.
 */
import "server-only";
import { cache } from "react";
import { supabaseAdmin } from "@/lib/supabase/server";
import { CURRENT_MONTH, prevMonth } from "@/lib/format";
import { meId, isProjectContact, isIntegrationEnabled, _num, _toPersonRow, type PersonRow } from "./_core";
import { bundleForRegs, bundleProjectId, expandProjectIds } from "@/lib/specialProjects";

export type DimensionStat = { key: string; before: number | null; after: number | null; count: number };

/** Average AAI dimension (D1–D4) ก่อน/หลัง across every submitted location for the month. */
export async function getDimensionSummary(month = CURRENT_MONTH): Promise<DimensionStat[]> {
  const db = supabaseAdmin();
  const { data } = await db.from("location_submissions").select("data").eq("year_month", month).eq("status", "submitted");
  const rows = (data ?? []) as { data: Record<string, string> | null }[];
  const avg = (arr: number[]) => (arr.length ? Math.round((arr.reduce((s, x) => s + x, 0) / arr.length) * 10) / 10 : null);
  return ["aai_d1", "aai_d2", "aai_d3", "aai_d4"].map((key) => {
    const befores = rows.map((r) => _num(r.data?.[`${key}_before`])).filter((n): n is number => n != null);
    const afters = rows.map((r) => _num(r.data?.[`${key}_after`])).filter((n): n is number => n != null);
    return { key, before: avg(befores), after: avg(afters), count: afters.length };
  });
}

export type TambonDimensionRow = {
  tambon_code: string; province_th: string; amphoe_th: string; tambon_th: string;
  year_month: string; project_id: string | null;
  n_pre: number; n_post: number | null;
  aai_d1_before: number | null; aai_d1_after: number | null;
  aai_d2_before: number | null; aai_d2_after: number | null;
  aai_d3_before: number | null; aai_d3_after: number | null;
  aai_d4_before: number | null; aai_d4_after: number | null;
  overall_before: number | null; overall_after: number | null;
  n_flag_pre: number | null; n_flag_post: number | null;
};

/** Per-tambon AAI (D1–D4 + overall) เริ่มต้น→ล่าสุด from the individual-level rollup
 *  (public.tambon_aai_monthly_pivot). The snapshot pivot is baseline→latest (NOT month-keyed), so the
 *  `month` arg is accepted for signature compatibility but no longer filters. Scores suppressed (null)
 *  for any cell with < 5 people. */
export async function getTambonDimensionSummary(
  _month = CURRENT_MONTH, projectId?: string,
): Promise<TambonDimensionRow[]> {
  const db = supabaseAdmin();
  let q = db.from("tambon_aai_monthly_pivot").select("*");
  if (projectId) q = q.eq("project_id", projectId);
  const { data } = await q
    .order("province_th", { ascending: true })
    .order("amphoe_th", { ascending: true })
    .order("tambon_th", { ascending: true });
  const rows = (data ?? []) as Record<string, unknown>[];
  return rows.map((r) => ({
    tambon_code: String(r.tambon_code ?? ""), province_th: String(r.province_th ?? ""),
    amphoe_th: String(r.amphoe_th ?? ""), tambon_th: String(r.tambon_th ?? ""),
    year_month: String(r.year_month ?? ""), project_id: r.project_id == null ? null : String(r.project_id),
    n_pre: _num(r.n_pre) ?? 0, n_post: _num(r.n_post),
    aai_d1_before: _num(r.aai_d1_before), aai_d1_after: _num(r.aai_d1_after),
    aai_d2_before: _num(r.aai_d2_before), aai_d2_after: _num(r.aai_d2_after),
    aai_d3_before: _num(r.aai_d3_before), aai_d3_after: _num(r.aai_d3_after),
    aai_d4_before: _num(r.aai_d4_before), aai_d4_after: _num(r.aai_d4_after),
    overall_before: _num(r.overall_before), overall_after: _num(r.overall_after),
    n_flag_pre: _num(r.n_flag_pre), n_flag_post: _num(r.n_flag_post),
  }));
}

// ─────────────────────────────────────────────────────────────────────────────
// General individual-entry portal — จังหวัด → อำเภอ → ตำบล drill-down, person enroll +
// direct 4-domain AAI, อสม. counts, multi-level snapshot dashboard.
// See supabase/migrations/20260701000000_individual_portal_snapshots.sql. All reads/writes go through
// the service-role client; writes are app-layer gated with isProjectContact() (the DB RPCs are
// service-role-only or self-gating). Names are decrypted only inside the logged, gated RPCs.
// ─────────────────────────────────────────────────────────────────────────────

export type GeoNode = { code: string; nameTh: string };

/** Distinct provinces from the TIS-1099 geo dimension (cached per request). */
export const getProvinces = cache(async function getProvinces(): Promise<GeoNode[]> {
  const db = supabaseAdmin();
  // Via the geo_provinces() RPC — a plain geo_tambon scan hits PostgREST's 1000-row cap (7,436 tambons)
  // and would surface only ~10 provinces; the RPC returns the full distinct set (77).
  const { data } = await db.rpc("geo_provinces");
  return ((data ?? []) as { province_code: string; province_th: string }[])
    .map((r) => ({ code: r.province_code, nameTh: r.province_th }));
});

/** Distinct amphoes within a province. */
export async function getAmphoes(provinceCode: string): Promise<GeoNode[]> {
  const db = supabaseAdmin();
  const { data } = await db.from("geo_tambon").select("amphoe_code,amphoe_th")
    .eq("province_code", provinceCode).order("amphoe_th");
  const seen = new Map<string, string>();
  for (const r of (data ?? []) as { amphoe_code: string; amphoe_th: string }[]) {
    if (!seen.has(r.amphoe_code)) seen.set(r.amphoe_code, r.amphoe_th);
  }
  return [...seen].map(([code, nameTh]) => ({ code, nameTh }));
}

/** Tambons within an amphoe (code = TIS-1099 6-digit tambon_code). */
export async function getTambons(amphoeCode: string): Promise<GeoNode[]> {
  const db = supabaseAdmin();
  const { data } = await db.from("geo_tambon").select("tambon_code,tambon_th")
    .eq("amphoe_code", amphoeCode).order("tambon_th");
  return ((data ?? []) as { tambon_code: string; tambon_th: string }[])
    .map((r) => ({ code: r.tambon_code, nameTh: r.tambon_th }));
}

/** Breadcrumb names + parent codes for one tambon_code. */
export async function getGeoPath(tambonCode: string): Promise<
  { provinceCode: string; provinceTh: string; amphoeCode: string; amphoeTh: string; tambonTh: string } | null
> {
  const db = supabaseAdmin();
  const { data } = await db.from("geo_tambon")
    .select("province_code,province_th,amphoe_code,amphoe_th,tambon_th").eq("tambon_code", tambonCode).maybeSingle();
  if (!data) return null;
  return {
    provinceCode: data.province_code, provinceTh: data.province_th,
    amphoeCode: data.amphoe_code, amphoeTh: data.amphoe_th, tambonTh: data.tambon_th,
  };
}

/** List/search people in a project (names decrypted + every lookup logged, server-side). Pass tambonCode
 *  to scope to a tambon hub; pass query to filter by name. Gate with isProjectContact() upstream. */
export async function searchPersons(
  projectId: string, opts: { query?: string; tambonCode?: string; limit?: number } = {},
): Promise<PersonRow[]> {
  const db = supabaseAdmin();
  const { data } = await db.rpc("search_persons_by_name", {
    p_project_id: projectId, p_query: opts.query ?? "",
    p_tambon_code: opts.tambonCode ?? null, p_limit: opts.limit ?? 50,
  });
  return ((data ?? []) as Record<string, unknown>[]).map(_toPersonRow);
}

/** One person's decrypted name (lookup logged). Gate with isProjectContact() upstream. */
export async function getPersonName(personId: string): Promise<string | null> {
  const db = supabaseAdmin();
  const { data } = await db.rpc("get_person_name", { p_person_id: personId });
  return data == null ? null : String(data);
}

/** List people in a tambon across the given projects, searchable by รหัสผู้เข้าร่วม (person_code) — NO name
 *  decryption (dashboard read-only individual drill). Gate with isProjectContact()/admin upstream. */
export async function getTambonPersons(tambonCode: string, projectIds: string[], query = ""): Promise<PersonRow[]> {
  if (!projectIds.length) return [];
  const db = supabaseAdmin();
  let q = db.from("persons").select("id,person_code,tambon_code,sex,age_band")
    .eq("tambon_code", tambonCode).in("project_id", projectIds).order("person_code").limit(100);
  if (query.trim()) q = q.ilike("person_code", `%${query.trim()}%`);
  const { data: people } = await q;
  const rows = (people ?? []) as Record<string, unknown>[];
  if (!rows.length) return [];
  const ids = rows.map((r) => String(r.id));
  const [{ data: pts }, { data: geo }] = await Promise.all([
    db.from("person_assessment_points").select("person_id,year_month,aai_overall,has_clinical_flag").in("person_id", ids).eq("is_latest", true),
    db.from("geo_tambon").select("tambon_th").eq("tambon_code", tambonCode).maybeSingle(),
  ]);
  const latest = new Map<string, { overall: number | null; month: string | null; flag: boolean }>();
  for (const p of (pts ?? []) as Record<string, unknown>[]) {
    latest.set(String(p.person_id), { overall: _num(p.aai_overall), month: p.year_month == null ? null : String(p.year_month), flag: p.has_clinical_flag === true });
  }
  const tambonTh = geo?.tambon_th ? String(geo.tambon_th) : "";
  return rows.map((r) => {
    const l = latest.get(String(r.id));
    return {
      personId: String(r.id), personCode: String(r.person_code ?? ""), fullName: null,
      tambonCode: String(r.tambon_code ?? tambonCode), tambonTh,
      sex: r.sex == null ? null : String(r.sex), ageBand: r.age_band == null ? null : String(r.age_band),
      latestMonth: l?.month ?? null, latestOverall: l?.overall ?? null, hasClinicalFlag: l?.flag ?? false,
    };
  });
}

export type TambonPersonDetail = {
  personId: string; personCode: string; projectId: string; tambonTh: string | null; sex: string | null; ageBand: string | null;
  assessments: PersonAssessmentPoint[];
};
/** One person's read-only AAI timeline for the dashboard drill — NO name decryption. Gate upstream. */
export async function getTambonPersonDetail(personId: string): Promise<TambonPersonDetail | null> {
  const db = supabaseAdmin();
  const { data: p } = await db.from("persons").select("id,person_code,project_id,tambon_code,sex,age_band").eq("id", personId).maybeSingle();
  if (!p) return null;
  const [{ data: pts }, { data: geo }] = await Promise.all([
    db.from("person_assessment_points").select("year_month,aai_d1,aai_d2,aai_d3,aai_d4,aai_overall,is_baseline,is_latest").eq("person_id", personId).order("year_month"),
    db.from("geo_tambon").select("tambon_th").eq("tambon_code", String(p.tambon_code ?? "")).maybeSingle(),
  ]);
  const assessments: PersonAssessmentPoint[] = ((pts ?? []) as Record<string, unknown>[]).map((a) => ({
    yearMonth: String(a.year_month ?? ""), d1: _num(a.aai_d1), d2: _num(a.aai_d2), d3: _num(a.aai_d3), d4: _num(a.aai_d4),
    overall: _num(a.aai_overall), isBaseline: a.is_baseline === true, isLatest: a.is_latest === true,
  }));
  return {
    personId: String(p.id), personCode: String(p.person_code ?? ""), projectId: String(p.project_id ?? ""),
    tambonTh: geo?.tambon_th ? String(geo.tambon_th) : null,
    sex: p.sex == null ? null : String(p.sex), ageBand: p.age_band == null ? null : String(p.age_band),
    assessments,
  };
}

/** Permanently delete a person + all their AAI (person_assessments + encrypted name CASCADE). IRREVERSIBLE.
 *  Gate with isProjectContact() upstream. Logs who/what into person_purge_audit before the delete (RPC). */
export async function purgePerson(personId: string, projectId: string): Promise<{ ok: boolean; error?: string }> {
  const db = supabaseAdmin();
  const me = await meId();
  const { data, error } = await db.rpc("purge_person", {
    p_person_id: personId, p_project_id: projectId, p_actor: me,
  });
  if (error) return { ok: false, error: error.message };
  return data === true ? { ok: true } : { ok: false, error: "not_found" };
}

/** Enroll a new elderly person under a project. The code is auto-assigned server-side (tambon-scoped
 *  running number "<tambon6>-###") when personCode is omitted; an explicit code is still accepted.
 *  Name encrypted server-side. Returns the assigned personCode so the caller can show it. */
export async function enrollPerson(input: {
  projectId: string; personCode?: string; fullName?: string; tambonCode: string;
  sex?: string; ageBand?: string; education?: number; occupation?: number; consentVersion?: string;
}): Promise<{ ok: boolean; personId?: string; personCode?: string; error?: string }> {
  const db = supabaseAdmin();
  const me = await meId();
  if (!me) return { ok: false, error: "no_account" };
  if (!(await isProjectContact(input.projectId))) return { ok: false, error: "not_contact" };
  const { data, error } = await db.rpc("enroll_person", {
    p_project_id: input.projectId, p_person_code: input.personCode?.trim() || null,
    p_full_name: input.fullName ?? null,
    p_tambon_code: input.tambonCode, p_sex: input.sex ?? null, p_age_band: input.ageBand ?? null,
    p_education: input.education ?? null, p_occupation: input.occupation ?? null,
    p_consent_version: input.consentVersion ?? null,
    p_actor: me, // service-role client → auth.uid() is null; attribute the enroller explicitly
  });
  if (error) return { ok: false, error: error.message };
  const personId = data as string;
  // fetch the assigned code (the RPC returns only the uuid, to keep its signature/grants stable)
  const { data: prow } = await db.from("persons").select("person_code").eq("id", personId).maybeSingle();
  return { ok: true, personId, personCode: prow?.person_code ? String(prow.person_code) : undefined };
}

/** Submit one person's 4-domain AAI for a month; Overall auto-computed server-side (manual mode). */
export async function submitPersonAssessment(input: {
  personId: string; projectId: string; yearMonth?: string;
  d1?: number | null; d2?: number | null; d3?: number | null; d4?: number | null; status?: string;
}): Promise<{ ok: boolean; overall?: number | null; error?: string }> {
  const db = supabaseAdmin();
  const me = await meId();
  if (!me) return { ok: false, error: "no_account" };
  // Authorize against the PERSON's real project, not the caller-supplied projectId (IDOR guard):
  // assess_person_manual keys on person_id only, so trusting input.projectId would let a contact of
  // project A overwrite a person enrolled in project B. See AUDIT.md → IDOR-assess.
  const { data: prow } = await db.from("persons").select("project_id").eq("id", input.personId).maybeSingle();
  if (!prow) return { ok: false, error: "not_found" };
  if (!(await isProjectContact(String(prow.project_id)))) return { ok: false, error: "not_contact" };
  // AAI domains are pre-normalized 0–100; reject out-of-range before the RPC (null/undefined = not scored).
  const inRange = (v: number | null | undefined) =>
    v === null || v === undefined || (Number.isFinite(v) && v >= 0 && v <= 100);
  if (![input.d1, input.d2, input.d3, input.d4].every(inRange)) return { ok: false, error: "out_of_range" };
  const { data, error } = await db.rpc("assess_person_manual", {
    p_person_id: input.personId, p_year_month: input.yearMonth ?? CURRENT_MONTH,
    p_d1: input.d1 ?? null, p_d2: input.d2 ?? null, p_d3: input.d3 ?? null, p_d4: input.d4 ?? null,
    p_status: input.status ?? "submitted",
    p_actor: me, // attribute the assessor (auth.uid() is null under the service-role client)
  });
  if (error) return { ok: false, error: error.message };
  const overall = _num((data as Record<string, unknown> | null)?.aai_overall);
  return { ok: true, overall };
}

/** One validated person row from a bulk-intake upload, ready to enroll + assess (derived scoring). */
export type BulkPersonRow = {
  tambonCode: string;
  personCode: string | null;   // null → enroll a new person; set → assess an existing person of this project
  fullName: string | null;
  sex: string | null;
  ageBand: string | null;
  education: number | null;
  occupation: number | null;
  consentVersion: string | null;
  round: string;               // 'pre' | 'post'
  yearMonth: string;
  rawAnswers: Record<string, string>;  // the questionnaire answers the DB scorer derives the AAI from
};

/**
 * Bulk enroll + derived-AAI assess for many people (the หัวหน้าโครงการ intake). Gated once by
 * isProjectContact + isIntegrationEnabled. Each row either enrolls a new person (blank code) or resolves
 * an existing person by person_code, then writes a derived assessment. Per-row failures are collected
 * (the batch never throws); the derived scoring trigger computes all 22 indicators + D1–D4 + flags.
 */
export async function bulkEnrollAssess(input: {
  projectId: string; rows: BulkPersonRow[];
}): Promise<{ ok: boolean; enrolled: number; assessed: number; failed: { index: number; error: string }[]; error?: string }> {
  const db = supabaseAdmin();
  const me = await meId();
  if (!me) return { ok: false, enrolled: 0, assessed: 0, failed: [], error: "no_account" };
  if (!(await isProjectContact(input.projectId))) return { ok: false, enrolled: 0, assessed: 0, failed: [], error: "not_contact" };
  if (!(await isIntegrationEnabled(input.projectId))) return { ok: false, enrolled: 0, assessed: 0, failed: [], error: "not_enabled" };

  let enrolled = 0, assessed = 0;
  const failed: { index: number; error: string }[] = [];
  for (let i = 0; i < input.rows.length; i++) {
    const r = input.rows[i];
    try {
      let personId: string;
      if (r.personCode) {
        // assess an existing person of THIS project (scoped by person_code)
        const { data: prow } = await db.from("persons").select("id")
          .eq("project_id", input.projectId).eq("person_code", r.personCode).maybeSingle();
        if (!prow?.id) { failed.push({ index: i, error: `ไม่พบรหัสผู้เข้าร่วม ${r.personCode}` }); continue; }
        personId = String(prow.id);
      } else {
        const { data: newId, error: eErr } = await db.rpc("enroll_person", {
          p_project_id: input.projectId, p_person_code: null, p_full_name: r.fullName ?? null,
          p_tambon_code: r.tambonCode, p_sex: r.sex ?? null, p_age_band: r.ageBand ?? null,
          p_education: r.education ?? null, p_occupation: r.occupation ?? null,
          p_consent_version: r.consentVersion ?? null, p_actor: me,
        });
        if (eErr || !newId) { failed.push({ index: i, error: eErr?.message ?? "enroll failed" }); continue; }
        personId = String(newId);
        enrolled++;
      }
      const { error: aErr } = await db.rpc("assess_person", {
        p_person_id: personId, p_round: r.round || "pre", p_year_month: r.yearMonth,
        p_raw_answers: r.rawAnswers, p_status: "submitted", p_actor: me,
      });
      if (aErr) { failed.push({ index: i, error: aErr.message }); continue; }
      assessed++;
    } catch (e) {
      failed.push({ index: i, error: e instanceof Error ? e.message : String(e) });
    }
  }
  return { ok: failed.length === 0, enrolled, assessed, failed };
}

/** Upsert the manual อสม. (trained village-health-volunteer) count for a tambon×month. */
export async function upsertOsmCount(input: {
  projectId: string; tambonCode: string; yearMonth?: string; osmBefore?: number | null; osmAfter?: number | null;
}): Promise<{ ok: boolean; error?: string }> {
  const db = supabaseAdmin();
  const me = await meId();
  if (!me) return { ok: false, error: "no_account" };
  if (!(await isProjectContact(input.projectId))) return { ok: false, error: "not_contact" };
  const { error } = await db.rpc("upsert_osm_count", {
    p_project_id: input.projectId, p_tambon_code: input.tambonCode, p_year_month: input.yearMonth ?? CURRENT_MONTH,
    p_osm_before: input.osmBefore ?? null, p_osm_after: input.osmAfter ?? null,
    p_actor: me, // attribute the entry/revision (auth.uid() is null under the service-role client)
  });
  return { ok: !error, error: error?.message };
}

export async function getOsmCount(
  projectId: string, tambonCode: string, yearMonth = CURRENT_MONTH,
): Promise<{ osmBefore: number | null; osmAfter: number | null } | null> {
  const db = supabaseAdmin();
  const { data } = await db.from("tambon_osm_counts")
    .select("osm_before,osm_after")
    .eq("project_id", projectId).eq("tambon_code", tambonCode).eq("year_month", yearMonth).maybeSingle();
  if (!data) return null;
  return { osmBefore: _num(data.osm_before), osmAfter: _num(data.osm_after) };
}

export type AaiLevel = "province" | "amphoe" | "tambon";
type Triple = { base: number | null; prev: number | null; latest: number | null };
export type AaiSnapshotRow = {
  geoCode: string; provinceTh: string; amphoeTh: string; tambonTh: string;
  nElderly: number; nUp10: number; osmBefore: number; osmAfter: number;
  overall: Triple; d1: Triple; d2: Triple; d3: Triple; d4: Triple; suppressed: boolean;
};

/** Multi-level dashboard rollup: per geo level, the three time-points (เริ่มต้น/เดือนที่แล้ว/ล่าสุด) for
 *  Overall + D1–D4, plus #elderly, #AAI≥+10%, #อสม. Scores blanked when a cell has < 5 people. Pass a
 *  single projectId in projectIds for a per-project view; multiple ids aggregate them together.
 *  `parent` (a geoCode prefix, e.g. a province code "50" or amphoe code "5001") keeps only the child geos
 *  under that folder — geoCodes are prefix-hierarchical (province 2 → amphoe 4 → tambon 6 digits), so the
 *  folder drill-down needs no parent-aware RPC. */
export async function getAaiSnapshotSummary(input: {
  level: AaiLevel; latestMonth?: string; prevMonth?: string; projectIds?: string[]; parent?: string;
}): Promise<AaiSnapshotRow[]> {
  const db = supabaseAdmin();
  const latest = input.latestMonth ?? CURRENT_MONTH;
  const prev = input.prevMonth ?? prevMonth(latest);
  // Bundle ids ("special:smart") expand to their member project uuids before the rollup RPC.
  const pids = input.projectIds && input.projectIds.length ? expandProjectIds(input.projectIds) : null;
  const { data } = await db.rpc("aai_rollup_snapshots", {
    p_level: input.level, p_latest_month: latest, p_prev_month: prev,
    p_project_ids: pids,
  });
  const rows = ((data ?? []) as Record<string, unknown>[]).map((r) => {
    const sup = r.suppressed === true;
    const t = (b: string, p: string, l: string): Triple => ({
      base: sup ? null : _num(r[b]), prev: sup ? null : _num(r[p]), latest: sup ? null : _num(r[l]),
    });
    return {
      geoCode: String(r.geo_code ?? ""), provinceTh: String(r.province_th ?? ""),
      amphoeTh: String(r.amphoe_th ?? ""), tambonTh: String(r.tambon_th ?? ""),
      nElderly: _num(r.n_elderly) ?? 0, nUp10: _num(r.n_up10) ?? 0,
      osmBefore: _num(r.osm_before) ?? 0, osmAfter: _num(r.osm_after) ?? 0,
      overall: t("base_overall", "prev_overall", "latest_overall"),
      d1: t("base_d1", "prev_d1", "latest_d1"), d2: t("base_d2", "prev_d2", "latest_d2"),
      d3: t("base_d3", "prev_d3", "latest_d3"), d4: t("base_d4", "prev_d4", "latest_d4"),
      suppressed: sup,
    };
  });
  const parent = input.parent;
  return parent ? rows.filter((r) => r.geoCode.startsWith(parent)) : rows;
}

/** A project as shown in the dashboard's picker: id + name + ผู้รับผิดชอบ subtitle. */
export type PickerProject = { id: string; name: string; owner: string };

/** The signed-in staff's registered projects (for the portal's project context). */
export async function getMyPortalProjects(): Promise<PickerProject[]> {
  const db = supabaseAdmin();
  const me = await meId();
  if (!me) return [];
  const { data: regs } = await db.from("project_account_registrations").select("project_id").eq("account_id", me);
  const ids = [...new Set((regs ?? []).map((r) => r.project_id as string))];
  if (!ids.length) return [];
  const { data } = await db.from("projects").select("id,name,researcher,org").in("id", ids).order("name");
  const list = ((data ?? []) as { id: string; name: string; researcher: string | null; org: string | null }[])
    .map((r) => ({ id: r.id, name: r.name, owner: r.researcher || r.org || "" }));
  // Collapse a fully-registered bundle into one picker entry (its member ids expand at the RPC boundary).
  const bundle = bundleForRegs(list.map((p) => p.id));
  if (!bundle) return list;
  const rest = list.filter((p) => !bundle.memberIds.includes(p.id));
  return [{ id: bundleProjectId(bundle.id), name: bundle.name, owner: "SMART" }, ...rest];
}

export type ProvinceProjectProgress = { projectId: string; projectName: string; row: AaiSnapshotRow | null };

/** Distinct projects operating in a province = projects with a mapped `project_locations` row whose
 *  `tambon_code` belongs to that province. (geo_tambon → codes → project_locations → projects.) */
export async function getProjectsInProvince(provinceCode: string): Promise<{ id: string; name: string }[]> {
  const db = supabaseAdmin();
  const { data: tambons } = await db.from("geo_tambon").select("tambon_code").eq("province_code", provinceCode);
  const codes = [...new Set(((tambons ?? []) as { tambon_code: string }[]).map((t) => t.tambon_code))];
  if (!codes.length) return [];
  const { data: locs } = await db.from("project_locations").select("project_id").in("tambon_code", codes);
  const ids = [...new Set(((locs ?? []) as { project_id: string }[]).map((l) => l.project_id))];
  if (!ids.length) return [];
  const { data } = await db.from("projects").select("id,name").in("id", ids).order("name");
  return (data ?? []) as { id: string; name: string }[];
}

/** Admin "by-จังหวัด" view: for every project operating in a province, that project's province-level AAI
 *  rollup row for THIS province (the 3 time-points + #elderly/+10%/อสม.), or null when it has no individual
 *  data yet. Composes the existing `aai_rollup_snapshots` per project (no new RPC; admin = low traffic). */
export async function getProvinceProjectProgress(
  provinceCode: string, opts?: { latestMonth?: string; prevMonth?: string },
): Promise<ProvinceProjectProgress[]> {
  const projects = await getProjectsInProvince(provinceCode);
  return Promise.all(
    projects.map(async (p) => {
      const rows = await getAaiSnapshotSummary({
        level: "province", projectIds: [p.id], latestMonth: opts?.latestMonth, prevMonth: opts?.prevMonth,
      });
      return { projectId: p.id, projectName: p.name, row: rows.find((r) => r.geoCode === provinceCode) ?? null };
    }),
  );
}

export type PersonAssessmentPoint = {
  yearMonth: string; d1: number | null; d2: number | null; d3: number | null; d4: number | null;
  overall: number | null; isBaseline: boolean; isLatest: boolean;
};
export type PersonDetail = {
  personId: string; personCode: string; projectId: string;
  tambonCode: string | null; tambonTh: string | null;
  fullName: string | null; sex: string | null; ageBand: string | null;
  assessments: PersonAssessmentPoint[];
};

/** The project a person belongs to, WITHOUT decrypting/logging the name — for authorizing before any
 *  name-decrypting read (see MED-3 in AUDIT.md: person-detail must gate before getPersonName runs). */
export async function getPersonProjectId(personId: string): Promise<string | null> {
  const db = supabaseAdmin();
  const { data } = await db.from("persons").select("project_id").eq("id", personId).maybeSingle();
  return data?.project_id ? String(data.project_id) : null;
}

/** Full detail for one person: identity (name decrypted + logged), tambon, and their assessment timeline. */
export async function getPersonDetail(personId: string): Promise<PersonDetail | null> {
  const db = supabaseAdmin();
  const { data: p } = await db.from("persons")
    .select("id,person_code,project_id,tambon_code,sex,age_band").eq("id", personId).maybeSingle();
  if (!p) return null;
  const [gtRes, name, ptsRes] = await Promise.all([
    p.tambon_code
      ? db.from("geo_tambon").select("tambon_th").eq("tambon_code", p.tambon_code).maybeSingle()
      : Promise.resolve({ data: null as { tambon_th: string } | null }),
    getPersonName(personId),
    db.from("person_assessment_points")
      .select("year_month,aai_d1,aai_d2,aai_d3,aai_d4,aai_overall,is_baseline,is_latest")
      .eq("person_id", personId).order("year_month", { ascending: true }),
  ]);
  return {
    personId: p.id, personCode: p.person_code, projectId: p.project_id,
    tambonCode: p.tambon_code ?? null, tambonTh: gtRes.data?.tambon_th ?? null,
    fullName: name, sex: p.sex ?? null, ageBand: p.age_band ?? null,
    assessments: ((ptsRes.data ?? []) as Record<string, unknown>[]).map((r) => ({
      yearMonth: String(r.year_month ?? ""), d1: _num(r.aai_d1), d2: _num(r.aai_d2),
      d3: _num(r.aai_d3), d4: _num(r.aai_d4), overall: _num(r.aai_overall),
      isBaseline: r.is_baseline === true, isLatest: r.is_latest === true,
    })),
  };
}

// ── Project-scoped จังหวัด→อำเภอ→ตำบล folder tree with completion status ──────
export type AreaStatus = "not_started" | "in_progress" | "complete";
export type ProjectAreaNode = {
  code: string;            // province_code / amphoe_code / tambon_code
  nameTh: string;
  level: "province" | "amphoe" | "tambon";
  status: AreaStatus;      // not_started=white · in_progress=yellow · complete=green
  nEnrolled: number;
  nComplete: number;
  children?: ProjectAreaNode[];
};
export type ProjectAreaTree = { provinces: ProjectAreaNode[]; unmappedLocations: number };

type GeoRow = { tambon_code: string; province_code: string; amphoe_code: string; province_th: string; amphoe_th: string; tambon_th: string };

/** The project's own จังหวัด→อำเภอ→ตำบล tree — strictly the project's mapped `project_locations` (so a stray
 *  person in a non-project tambon never spawns a folder) — each node carrying completion status rolled up
 *  from individual assessments. Drives the ส่งข้อมูล→รายบุคคล folders. */
export async function getProjectAreaTree(projectId: string): Promise<ProjectAreaTree> {
  const db = supabaseAdmin();
  const codes = new Set<string>();
  let unmapped = 0;

  const { data: locs } = await db.from("project_locations").select("tambon_code").eq("project_id", projectId);
  for (const l of (locs ?? []) as { tambon_code: string | null }[]) {
    if (l.tambon_code) codes.add(l.tambon_code); else unmapped++;
  }

  // status counts come from persons enrolled in the project's tambons (folders are project_locations-only)
  const { data: statusRows } = await db.rpc("get_project_tambon_status", { p_project_id: projectId });
  const statusMap = new Map<string, { nEnrolled: number; nComplete: number }>();
  for (const r of (statusRows ?? []) as { tambon_code: string; n_enrolled: number; n_complete: number }[]) {
    statusMap.set(r.tambon_code, { nEnrolled: Number(r.n_enrolled), nComplete: Number(r.n_complete) });
  }

  if (!codes.size) return { provinces: [], unmappedLocations: unmapped };

  const { data: geos } = await db.from("geo_tambon")
    .select("tambon_code,province_code,amphoe_code,province_th,amphoe_th,tambon_th").in("tambon_code", [...codes]);
  const geoMap = new Map<string, GeoRow>();
  for (const g of (geos ?? []) as GeoRow[]) geoMap.set(g.tambon_code, g);

  const tambonStatus = (c: { nEnrolled: number; nComplete: number }): AreaStatus =>
    c.nEnrolled === 0 ? "not_started" : c.nComplete >= c.nEnrolled ? "complete" : "in_progress";
  const rollUp = (ss: AreaStatus[]): AreaStatus =>
    ss.every((s) => s === "complete") ? "complete" : ss.every((s) => s === "not_started") ? "not_started" : "in_progress";
  const byTh = (a: ProjectAreaNode, b: ProjectAreaNode) => a.nameTh.localeCompare(b.nameTh, "th");

  // province_code -> amphoe_code -> tambon leaves
  const tree = new Map<string, Map<string, ProjectAreaNode[]>>();
  for (const code of codes) {
    const g = geoMap.get(code);
    if (!g) continue; // unknown tambon_code (shouldn't happen) — skip
    const cnt = statusMap.get(code) ?? { nEnrolled: 0, nComplete: 0 };
    const leaf: ProjectAreaNode = {
      code, nameTh: g.tambon_th, level: "tambon", status: tambonStatus(cnt),
      nEnrolled: cnt.nEnrolled, nComplete: cnt.nComplete,
    };
    if (!tree.has(g.province_code)) tree.set(g.province_code, new Map());
    const amphMap = tree.get(g.province_code)!;
    if (!amphMap.has(g.amphoe_code)) amphMap.set(g.amphoe_code, []);
    amphMap.get(g.amphoe_code)!.push(leaf);
  }

  const provinces: ProjectAreaNode[] = [];
  for (const [provCode, amphMap] of tree) {
    const amphoes: ProjectAreaNode[] = [];
    for (const [amphCode, leaves] of amphMap) {
      const g = geoMap.get(leaves[0].code)!;
      amphoes.push({
        code: amphCode, nameTh: g.amphoe_th, level: "amphoe", status: rollUp(leaves.map((x) => x.status)),
        nEnrolled: leaves.reduce((s, x) => s + x.nEnrolled, 0),
        nComplete: leaves.reduce((s, x) => s + x.nComplete, 0),
        children: leaves.sort(byTh),
      });
    }
    const g = geoMap.get(amphoes[0].children![0].code)!;
    provinces.push({
      code: provCode, nameTh: g.province_th, level: "province", status: rollUp(amphoes.map((x) => x.status)),
      nEnrolled: amphoes.reduce((s, x) => s + x.nEnrolled, 0),
      nComplete: amphoes.reduce((s, x) => s + x.nComplete, 0),
      children: amphoes.sort(byTh),
    });
  }
  provinces.sort(byTh);
  return { provinces, unmappedLocations: unmapped };
}
