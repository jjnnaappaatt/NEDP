/**
 * Locations & monthly submissions domain — templates, project-location lists, per-location monthly
 * report writes/reads, location-list verification + audit. Imports shared internals from ./_core only.
 */
import "server-only";
import { supabaseAdmin } from "@/lib/supabase/server";
import { CURRENT_MONTH } from "@/lib/format";
import { completionPct } from "@/lib/forms/monthlyReport";
import type {
  LocationAuditEntry, LocationStatus, LocationVerification, ProjectLocation, ProjectTemplate,
} from "@/types";
import { meId, isProjectContact, _isLocked, withStatus } from "./_core";

export async function getTemplate(projectId: string): Promise<ProjectTemplate> {
  const db = supabaseAdmin();
  const { data } = await db.from("project_templates").select("sections,fields").eq("project_id", projectId).limit(1).single();
  return { projectId, sections: data?.sections ?? [], fields: data?.fields ?? [] };
}

// NOT cache()-wrapped: the upload/template routes read this right around mutations, so always fresh.
export async function getLocations(projectId: string): Promise<ProjectLocation[]> {
  const db = supabaseAdmin();
  const { data } = await db.from("project_locations").select("id,project_id,province,amphoe,tambon,tambon_code,seq").eq("project_id", projectId).order("seq");
  return (data ?? []).map((l) => ({ id: l.id, projectId: l.project_id, province: l.province, amphoe: l.amphoe, tambon: l.tambon, tambonCode: l.tambon_code ?? null }));
}

export async function getLocationStatuses(projectId: string, month = CURRENT_MONTH): Promise<LocationStatus[]> {
  const db = supabaseAdmin();
  const locs = await getLocations(projectId);
  // Project-level status (NEDP reality): a location counts as submitted if ANY account submitted it.
  const { data: subs } = await db.from("location_submissions")
    .select("location_id,submitted_at,status").eq("project_id", projectId).eq("year_month", month).eq("status", "submitted");
  const done = new Map((subs ?? []).map((s) => [s.location_id, s.submitted_at]));
  return locs.map((location) => ({ location, submitted: done.has(location.id), submittedAt: done.get(location.id) ?? undefined }));
}

/** Latest submitted metric JSON per location (for prefilling the monthly-report template so a contact
 *  can continue editing rather than re-enter). Keyed by location_id; newest submission wins. */
export async function getLatestSubmissionData(projectId: string, month = CURRENT_MONTH): Promise<Map<string, Record<string, string>>> {
  const db = supabaseAdmin();
  const { data } = await db.from("location_submissions")
    .select("location_id,data,submitted_at")
    .eq("project_id", projectId).eq("year_month", month).eq("status", "submitted")
    .order("submitted_at", { ascending: false });
  const out = new Map<string, Record<string, string>>();
  for (const r of data ?? []) {
    if (!out.has(r.location_id)) out.set(r.location_id, (r.data ?? {}) as Record<string, string>);
  }
  return out;
}

/** The signed-in user's PAST monthly submissions for a project (excludes the current month), newest
 *  first — drives the grid's "ประวัติการส่งของฉัน" panel. `total` is the project's current location count. */
export async function getMyMonthlyHistory(
  projectId: string,
): Promise<{ yearMonth: string; submitted: number; total: number; lastSubmittedAt?: string }[]> {
  const db = supabaseAdmin();
  const me = await meId();
  if (!me) return [];
  const total = (await getLocations(projectId)).length;
  const { data } = await db.from("location_submissions")
    .select("year_month,submitted_at")
    .eq("project_id", projectId).eq("account_id", me).eq("status", "submitted")
    .neq("year_month", CURRENT_MONTH)
    .order("submitted_at", { ascending: false });
  const byMonth = new Map<string, { submitted: number; last?: string }>();
  for (const r of data ?? []) {
    const m = byMonth.get(r.year_month) ?? { submitted: 0 };
    m.submitted += 1;
    if (r.submitted_at && (!m.last || r.submitted_at > m.last)) m.last = r.submitted_at;
    byMonth.set(r.year_month, m);
  }
  return [...byMonth.entries()]
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .map(([yearMonth, v]) => ({ yearMonth, submitted: v.submitted, total, lastSubmittedAt: v.last }));
}

/** My current submission state per location for a month (prefill + lock/edit-request flags). */
export async function getMyLocationSubmissions(
  projectId: string, month = CURRENT_MONTH,
): Promise<Map<string, { id: string; status: string; data: Record<string, string>; locked: boolean; editRequested: boolean }>> {
  const db = supabaseAdmin();
  const me = await meId();
  const out = new Map<string, { id: string; status: string; data: Record<string, string>; locked: boolean; editRequested: boolean }>();
  if (!me) return out;
  const { data } = await db.from("location_submissions")
    .select("id,location_id,status,data,edit_requested_at,edit_approved_at")
    .eq("project_id", projectId).eq("account_id", me).eq("year_month", month);
  for (const r of data ?? []) {
    out.set(r.location_id, {
      id: r.id, status: r.status, data: (r.data ?? {}) as Record<string, string>,
      locked: r.status === "submitted" || r.status === "approved",
      editRequested: !!r.edit_requested_at && !r.edit_approved_at,
    });
  }
  return out;
}

/** Guard: every submitted locationId must belong to the gated project. The FK location_id→project_locations
 *  only checks existence, not project match, so without this a contact of P could mint a submission row
 *  carrying a location from project Q. See AUDIT.md → LOC-membership. */
async function _locsInProject(
  db: ReturnType<typeof supabaseAdmin>, projectId: string, locationIds: string[],
): Promise<boolean> {
  const ids = [...new Set(locationIds.filter(Boolean))];
  if (ids.length === 0) return true;
  const { data } = await db.from("project_locations").select("id").eq("project_id", projectId).in("id", ids);
  return (data ?? []).length === ids.length;
}

/** Draft-save: persist partial monthly data (status 'draft', editable). Rejected if locked. */
export async function saveDraftLocation(
  input: { projectId: string; locationId: string; values: Record<string, string> },
): Promise<{ ok: boolean; error?: string }> {
  const db = supabaseAdmin();
  const me = await meId();
  if (!me) return { ok: false, error: "no_account" };
  if (!(await isProjectContact(input.projectId))) return { ok: false, error: "not_contact" };
  if (!(await _locsInProject(db, input.projectId, [input.locationId]))) return { ok: false, error: "not_in_project" };
  if (await _isLocked(db, input.projectId, input.locationId, me, CURRENT_MONTH)) return { ok: false, error: "locked" };
  const now = new Date().toISOString();
  const { error } = await db.from("location_submissions").upsert(
    {
      project_id: input.projectId, location_id: input.locationId, account_id: me,
      year_month: CURRENT_MONTH, status: "draft", data: withStatus(input.values),
      completion_pct: completionPct(input.values ?? {}), updated_at: now,
    },
    { onConflict: "location_id,account_id,year_month" },
  );
  return { ok: !error, error: error?.message };
}

/** Write-path: a web user submits one location's monthly data (status 'submitted' → locks it).
 *  Requires being a project contact; the DB trigger projects the row to the bot's monitor_submissions.
 *  Rejected if already locked (must go through the ขอแก้ไข → admin-approve flow first). */
export async function submitLocation(
  input: { projectId: string; locationId: string; values: Record<string, string> },
): Promise<{ ok: boolean; error?: string }> {
  const db = supabaseAdmin();
  const me = await meId();
  if (!me) return { ok: false, error: "no_account" };
  if (!(await isProjectContact(input.projectId))) return { ok: false, error: "not_contact" };
  if (!(await _locsInProject(db, input.projectId, [input.locationId]))) return { ok: false, error: "not_in_project" };
  if (await _isLocked(db, input.projectId, input.locationId, me, CURRENT_MONTH)) return { ok: false, error: "locked" };
  const now = new Date().toISOString();
  const { error } = await db.from("location_submissions").upsert(
    {
      project_id: input.projectId, location_id: input.locationId, account_id: me,
      year_month: CURRENT_MONTH, status: "submitted", data: withStatus(input.values),
      completion_pct: 100, submitted_at: now, updated_at: now,
      edit_requested_at: null, edit_approved_at: null,
    },
    { onConflict: "location_id,account_id,year_month" },
  );
  return { ok: !error, error: error?.message };
}

/** A web user requests to edit a locked submission → flags it for admin approval (web_request_edit). */
export async function requestEditLocation(
  input: { projectId: string; locationId: string },
): Promise<{ ok: boolean; error?: string }> {
  const db = supabaseAdmin();
  const me = await meId();
  if (!me) return { ok: false, error: "no_account" };
  if (!(await isProjectContact(input.projectId))) return { ok: false, error: "not_contact" };
  const { data: acct } = await db.from("accounts").select("name").eq("id", me).maybeSingle();
  const { data, error } = await db.rpc("web_request_edit", {
    p_project: input.projectId, p_location: input.locationId, p_month: CURRENT_MONTH, p_by: acct?.name ?? "",
  });
  if (error) return { ok: false, error: error.message };
  return { ok: data === true, error: data === true ? undefined : "no_submission" };
}

/** Bulk write-path: submit many locations at once (CSV upload). One upsert, gated once. */
export async function bulkSubmitLocations(
  input: { projectId: string; rows: { locationId: string; values: Record<string, string> }[] },
): Promise<{ ok: boolean; saved: number; error?: string }> {
  const me = await meId();
  if (!me) return { ok: false, saved: 0, error: "no_account" };
  if (!(await isProjectContact(input.projectId))) return { ok: false, saved: 0, error: "not_contact" };
  const rows = (input.rows ?? []).filter((r) => r.locationId);
  if (rows.length === 0) return { ok: false, saved: 0, error: "no_rows" };
  const db = supabaseAdmin();
  if (!(await _locsInProject(db, input.projectId, rows.map((r) => r.locationId)))) {
    return { ok: false, saved: 0, error: "not_in_project" };
  }
  const now = new Date().toISOString();
  const records = rows.map((r) => ({
    project_id: input.projectId, location_id: r.locationId, account_id: me,
    year_month: CURRENT_MONTH, status: "submitted", data: withStatus(r.values),
    completion_pct: 100, submitted_at: now, updated_at: now,
  }));
  const { error } = await db.from("location_submissions").upsert(records, {
    onConflict: "location_id,account_id,year_month",
  });
  return { ok: !error, saved: error ? 0 : records.length, error: error?.message };
}

/** Persist a project's location-list verification (who/when) — writes back to the bot's
 *  monitor_projects.location_verified_* so its location reminder stops. */
export async function verifyLocations(
  input: { projectId: string; verifiedBy?: string },
): Promise<{ ok: boolean; error?: string }> {
  if (!(await isProjectContact(input.projectId))) return { ok: false, error: "not_contact" };
  const me = await meId(); // record WHO confirmed → drives the re-confirm cascade on unregister
  const db = supabaseAdmin();
  // Derive the audit display-name server-side from the authenticated account — never trust a
  // client-supplied verifiedBy for the "who" (that name is shown as authoritative). See AUDIT.md → ATTR-spoof.
  const { data: acct } = await db.from("accounts").select("name").eq("id", me).maybeSingle();
  const { error } = await db.rpc("web_verify_locations", {
    p_project: input.projectId, p_by: acct?.name ?? "", p_account: me,
  });
  return { ok: !error };
}

/** Persist an edited location list — reconciles project_locations ↔ the bot's monitor_project_areas
 *  (FK-safe; a location with existing submissions is not deleted, returned in `blocked`). */
export async function saveLocations(
  input: {
    projectId: string;
    locations: { id: string; province: string; amphoe: string; tambon: string }[];
    editedBy?: string;
  },
): Promise<{ ok: boolean; blocked?: string[]; error?: string }> {
  if (!(await isProjectContact(input.projectId))) return { ok: false, error: "not_contact" };
  const db = supabaseAdmin();
  // Derive the audit "who" server-side (ignore client-supplied editedBy). See AUDIT.md → ATTR-spoof.
  const me = await meId();
  const { data: acct } = await db.from("accounts").select("name").eq("id", me).maybeSingle();
  const { data, error } = await db.rpc("web_save_locations", {
    p_project: input.projectId, locs: input.locations, p_by: acct?.name ?? null,
  });
  if (error) return { ok: false };
  const res = (data ?? {}) as { ok?: boolean; blocked?: string[] };
  return { ok: res.ok !== false, blocked: res.blocked };
}

/** Recent location-list edits (rename/add/delete/verify) for the project — the audit trail. */
export async function getLocationAudit(projectId: string): Promise<LocationAuditEntry[]> {
  const db = supabaseAdmin();
  const { data } = await db.rpc("web_location_audit", { p_project: projectId });
  return (data ?? []).map((r: {
    action: string;
    before_data: LocationAuditEntry["before"];
    after_data: LocationAuditEntry["after"];
    changed_by: string | null;
    changed_at: string;
  }) => ({
    action: r.action,
    before: r.before_data ?? null,
    after: r.after_data ?? null,
    changedBy: r.changed_by ?? null,
    changedAt: r.changed_at,
  }));
}

export async function getLocationVerification(projectId: string): Promise<LocationVerification | null> {
  const db = supabaseAdmin();
  const { data } = await db.from("location_verifications")
    .select("verified_by_name,verified_at,edit_requested_at,edit_approved_at")
    .eq("project_id", projectId).limit(1).maybeSingle();
  if (!data) return null;
  const editRequested = !!data.edit_requested_at && !data.edit_approved_at;
  const editLocked = !!data.verified_at && !data.edit_approved_at; // verified & no open edit-window
  return { projectId, verifiedBy: data.verified_by_name ?? "", verifiedAt: data.verified_at, editLocked, editRequested };
}

/** A web user asks to edit a VERIFIED location list → flags it for admin approval (web_request_location_edit). */
export async function requestEditLocations(projectId: string): Promise<{ ok: boolean; error?: string }> {
  const db = supabaseAdmin();
  const me = await meId();
  if (!me) return { ok: false, error: "no_account" };
  if (!(await isProjectContact(projectId))) return { ok: false, error: "not_contact" };
  const { data: acct } = await db.from("accounts").select("name").eq("id", me).maybeSingle();
  const { data, error } = await db.rpc("web_request_location_edit", { p_project: projectId, p_by: acct?.name ?? "" });
  if (error) return { ok: false, error: error.message };
  return { ok: data === true, error: data === true ? undefined : "not_verified" };
}
