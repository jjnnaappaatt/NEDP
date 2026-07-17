/**
 * Per-project questionnaire data layer — reads the assigned schema, writes clinical assessments (per-item
 * answers + per-tool scores via assess_person_clinical, which also feeds the AAI trigger), bulk intake,
 * and the per-person results reads. Scoring itself runs in the API routes (lib/questionnaire/scoring.ts);
 * this layer is the gated DB bridge. Imports shared internals from ./_core only.
 */
import "server-only";
import { supabaseAdmin } from "@/lib/supabase/server";
import { CURRENT_MONTH } from "@/lib/format";
import { meId, isProjectContact, isIntegrationEnabled, _num } from "./_core";
import { surveyScoreLabels } from "@/lib/questionnaire/surveyScoring";
import { TOOL_LABEL, MODULE_LABEL, MODULE_ORDER } from "@/lib/questionnaire/toolLabels";
import type { QuestionnaireSchema } from "@/lib/questionnaire/schema";

export type AssignedQuestionnaire = {
  questionnaireId: string; code: string; kind: string; modules: string[]; schema: QuestionnaireSchema;
} | null;

/** The questionnaire (schema + selected modules) assigned to a project, or null if none. */
export async function getAssignedQuestionnaire(projectId: string): Promise<AssignedQuestionnaire> {
  const db = supabaseAdmin();
  const { data: pq } = await db.from("project_questionnaires")
    .select("questionnaire_id,modules").eq("project_id", projectId).maybeSingle();
  if (!pq) return null;
  const { data: q } = await db.from("questionnaires")
    .select("id,code,kind,schema_json").eq("id", pq.questionnaire_id).maybeSingle();
  if (!q) return null;
  return {
    questionnaireId: String(q.id), code: String(q.code), kind: String(q.kind),
    modules: Array.isArray(pq.modules) ? (pq.modules as string[]) : [],
    schema: q.schema_json as QuestionnaireSchema,
  };
}

/** Lightweight check for the submit-page entry label: the assigned questionnaire's title only (no schema). */
export async function getAssignedQuestionnaireInfo(projectId: string): Promise<{ title: string } | null> {
  const db = supabaseAdmin();
  const { data: pq } = await db.from("project_questionnaires")
    .select("questionnaire_id").eq("project_id", projectId).maybeSingle();
  if (!pq) return null;
  const { data: q } = await db.from("questionnaires")
    .select("title").eq("id", pq.questionnaire_id).maybeSingle();
  return q ? { title: String(q.title) } : null;
}

export type ClinicalToolScoreIn = {
  tool_code: string; project_module: string; raw_score: number | null; score_label: string; risk_level: string; flag: boolean;
};

/** Write one person's clinical questionnaire (per-item answers + tool scores + derived AAI). Gated. */
export async function submitClinicalAssessment(input: {
  projectId: string; personId: string; round?: string; yearMonth?: string;
  questionnaireId: string; qAnswers: Record<string, unknown>;
  rawAnswers: Record<string, string>; toolScores: ClinicalToolScoreIn[]; status?: string;
}): Promise<{ ok: boolean; assessmentId?: string; overall?: number | null; hasFlag?: boolean; error?: string }> {
  const db = supabaseAdmin();
  const me = await meId();
  if (!me) return { ok: false, error: "no_account" };
  if (!(await isProjectContact(input.projectId))) return { ok: false, error: "not_contact" };
  const { data, error } = await db.rpc("assess_person_clinical", {
    p_person_id: input.personId, p_round: input.round || "pre", p_year_month: input.yearMonth ?? CURRENT_MONTH,
    p_questionnaire_id: input.questionnaireId, p_q_answers: input.qAnswers,
    p_raw_answers: input.rawAnswers, p_tool_scores: input.toolScores,
    p_status: input.status ?? "submitted", p_actor: me,
  });
  if (error) return { ok: false, error: error.message };
  const d = data as Record<string, unknown> | null;
  return {
    ok: true, assessmentId: d?.assessment_id ? String(d.assessment_id) : undefined,
    overall: d?.aai_overall == null ? null : Number(d.aai_overall), hasFlag: d?.has_clinical_flag === true,
  };
}

export type BulkClinicalRow = {
  tambonCode: string; personCode: string | null; fullName: string | null;
  sex: string | null; ageBand: string | null; education: number | null; occupation: number | null;
  consentVersion: string | null; round: string; yearMonth: string;
  questionnaireId: string; qAnswers: Record<string, unknown>;
  rawAnswers: Record<string, string>; toolScores: ClinicalToolScoreIn[];
};

/** Bulk enroll + clinical assess (per-project Excel intake). Gated once by contact + integration-enabled. */
export async function bulkEnrollAssessClinical(input: {
  projectId: string; rows: BulkClinicalRow[];
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
      const { error: aErr } = await db.rpc("assess_person_clinical", {
        p_person_id: personId, p_round: r.round || "pre", p_year_month: r.yearMonth,
        p_questionnaire_id: r.questionnaireId, p_q_answers: r.qAnswers,
        p_raw_answers: r.rawAnswers, p_tool_scores: r.toolScores, p_status: "submitted", p_actor: me,
      });
      if (aErr) { failed.push({ index: i, error: aErr.message }); continue; }
      assessed++;
    } catch (e) {
      failed.push({ index: i, error: e instanceof Error ? e.message : String(e) });
    }
  }
  return { ok: failed.length === 0, enrolled, assessed, failed };
}

/** Prefill fields for the questionnaire form (from the person row). */
export async function getPersonPrefill(personId: string): Promise<{ personCode: string; sex: string | null; education: number | null; occupation: number | null; tambonCode: string | null } | null> {
  const db = supabaseAdmin();
  const { data } = await db.from("persons").select("person_code,sex,education_level,occupation_code,tambon_code").eq("id", personId).maybeSingle();
  if (!data) return null;
  return {
    personCode: String(data.person_code ?? ""), sex: data.sex == null ? null : String(data.sex),
    education: _num(data.education_level) == null ? null : Number(data.education_level),
    occupation: _num(data.occupation_code) == null ? null : Number(data.occupation_code),
    tambonCode: data.tambon_code == null ? null : String(data.tambon_code),
  };
}

/** The person's latest submitted/approved Pre questionnaire answers (for D3 cross-visit + height prefill). */
export async function getPersonPreAnswers(personId: string): Promise<Record<string, unknown> | null> {
  const db = supabaseAdmin();
  const { data } = await db.from("person_assessments").select("q_answers")
    .eq("person_id", personId).eq("round", "pre").in("status", ["submitted", "approved"])
    .order("created_at", { ascending: false }).limit(1).maybeSingle();
  return (data?.q_answers as Record<string, unknown>) ?? null;
}

export type PersonToolScore = {
  toolCode: string; projectModule: string; rawScore: number | null; scoreLabel: string; riskLevel: string; flag: boolean;
};
/** Per-tool clinical scores for one assessment row (results display). */
export async function getPersonToolScores(personAssessmentId: string): Promise<PersonToolScore[]> {
  const db = supabaseAdmin();
  const { data } = await db.from("person_tool_scores")
    .select("tool_code,project_module,raw_score,score_label,risk_level,flag")
    .eq("person_assessment_id", personAssessmentId);
  return ((data ?? []) as Record<string, unknown>[]).map((r) => ({
    toolCode: String(r.tool_code), projectModule: String(r.project_module),
    rawScore: _num(r.raw_score), scoreLabel: r.score_label == null ? "" : String(r.score_label),
    riskLevel: String(r.risk_level ?? "normal"), flag: r.flag === true,
  }));
}

export type QuestionnaireSummaryRow = { label: string; mean: number | null; n: number; flagged: number };
export type ProjectQuestionnaireSummary = { rows: QuestionnaireSummaryRow[]; nPersons: number };

/** Project-level summary of the assigned questionnaire's computed scores (for the report): each tool /
 *  declared specific score → mean · N · flagged, over each person's LATEST questionnaire assessment. */
export async function getProjectQuestionnaireSummary(projectId: string): Promise<ProjectQuestionnaireSummary> {
  const db = supabaseAdmin();
  const assigned = await getAssignedQuestionnaire(projectId);
  if (!assigned) return { rows: [], nPersons: 0 };
  const labelMap: Record<string, string> = { ...TOOL_LABEL, ...surveyScoreLabels(assigned.schema) };

  // Latest questionnaire assessment per person (newest month; post preferred within a month).
  // Paged — a clinical project can exceed PostgREST's 1000-row cap; id tiebreak keeps paging stable.
  const paRows: Record<string, unknown>[] = [];
  for (let from = 0; ; from += 1000) {
    const { data } = await db.from("person_assessments")
      .select("id,person_id,year_month,round").eq("project_id", projectId).not("questionnaire_id", "is", null)
      .order("year_month", { ascending: false }).order("round", { ascending: true }).order("id", { ascending: true })
      .range(from, from + 999);
    const rows = (data ?? []) as Record<string, unknown>[];
    paRows.push(...rows);
    if (rows.length < 1000) break;
  }
  const latestByPerson = new Map<string, string>();
  for (const r of paRows) {
    const pid = String(r.person_id);
    if (!latestByPerson.has(pid)) latestByPerson.set(pid, String(r.id));
  }
  const aids = [...latestByPerson.values()];
  if (aids.length === 0) return { rows: [], nPersons: 0 };

  // Tool scores for those assessments — chunk the id list AND page within each chunk (a clinical
  // assessment yields ~24 tool rows, so 200 ids × 24 > 1000 without paging).
  const scoreRows: Record<string, unknown>[] = [];
  for (let i = 0; i < aids.length; i += 200) {
    const chunk = aids.slice(i, i + 200);
    for (let from = 0; ; from += 1000) {
      const { data } = await db.from("person_tool_scores")
        .select("tool_code,raw_score,flag").in("person_assessment_id", chunk).order("id", { ascending: true }).range(from, from + 999);
      const rows = (data ?? []) as Record<string, unknown>[];
      scoreRows.push(...rows);
      if (rows.length < 1000) break;
    }
  }

  const agg = new Map<string, { sum: number; n: number; flagged: number }>();
  const order: string[] = [];
  for (const t of scoreRows) {
    const code = String(t.tool_code);
    if (!agg.has(code)) { agg.set(code, { sum: 0, n: 0, flagged: 0 }); order.push(code); }
    const a = agg.get(code)!;
    const raw = _num(t.raw_score);
    if (raw != null) { a.sum += raw; a.n += 1; }
    if (t.flag === true) a.flagged += 1;
  }
  const rows: QuestionnaireSummaryRow[] = order.map((code) => {
    const a = agg.get(code)!;
    return { label: labelMap[code] ?? code, mean: a.n ? Math.round((a.sum / a.n) * 10) / 10 : null, n: a.n, flagged: a.flagged };
  });
  return { rows, nPersons: latestByPerson.size };
}

// ── Project-level survey/clinical questionnaire dashboard (aggregate across the project's people) ──
export type SurveyToolAgg = {
  toolCode: string; label: string; projectModule: string; kind: "clinical" | "survey";
  n: number; mean: number | null; min: number | null; max: number | null;
  scoreScale: number | null;                                  // survey gauge scale (agg-aware; null = unknown → no scale)
  risk: { high: number; medium: number; normal: number };     // per-band person counts (clinical)
  flagged: number;
};
export type SurveyModuleAgg = { module: string; label: string; tools: SurveyToolAgg[] };
export type ProjectSurveyDashboard = {
  nAssessed: number; nFlaggedPersons: number; suppressed: boolean; nSuppressedTools: number; modules: SurveyModuleAgg[];
};

/**
 * The project's OWN questionnaire results aggregated across all its assessed people (each person's LATEST
 * questionnaire assessment) — per tool: mean/min/max, risk-band distribution, flagged count; grouped by
 * module. Distinct from the standard AAI (this is the project's custom instrument). k-anonymity: the whole
 * project is suppressed when < 5 people are assessed; never emits per-person data. Schema-driven — modules
 * and tools follow whatever the assigned questionnaire produced. Gate with isProjectContact()/admin upstream.
 */
export async function getProjectSurveyDashboard(projectId: string): Promise<ProjectSurveyDashboard> {
  const db = supabaseAdmin();
  const assigned = await getAssignedQuestionnaire(projectId);
  if (!assigned) return { nAssessed: 0, nFlaggedPersons: 0, suppressed: false, nSuppressedTools: 0, modules: [] };
  const labelMap: Record<string, string> = { ...TOOL_LABEL, ...surveyScoreLabels(assigned.schema) };
  // Agg-aware gauge scale: a "sum" score's max is per-question, so the score scale is max × #questions;
  // a "mean" score's scale is just max. Unknown (no declared max) → null (gauge shows no scale, never the
  // observed max, which would expose the top scorer's exact value).
  const scoreScaleByKey = new Map<string, number | null>();
  for (const s of assigned.schema.scores ?? []) {
    const scale = s.agg === "sum" ? (s.max != null ? s.max * (s.questions?.length ?? 0) : null) : (s.max ?? null);
    scoreScaleByKey.set(s.key, scale != null && scale > 0 ? scale : null);
  }

  // Latest questionnaire assessment per person (+ has_clinical_flag for the flagged-person count). Paged.
  const paRows: Record<string, unknown>[] = [];
  for (let from = 0; ; from += 1000) {
    const { data } = await db.from("person_assessments")
      .select("id,person_id,year_month,round,has_clinical_flag").eq("project_id", projectId).not("questionnaire_id", "is", null)
      .order("year_month", { ascending: false }).order("round", { ascending: true }).order("id", { ascending: true })
      .range(from, from + 999);
    const rows = (data ?? []) as Record<string, unknown>[];
    paRows.push(...rows);
    if (rows.length < 1000) break;
  }
  const latestByPerson = new Map<string, { id: string; flag: boolean }>();
  for (const r of paRows) {
    const pid = String(r.person_id);
    if (!latestByPerson.has(pid)) latestByPerson.set(pid, { id: String(r.id), flag: r.has_clinical_flag === true });
  }
  const K = 5;                                                  // k-anonymity threshold (matches the AAI rollups)
  const nAssessed = latestByPerson.size;
  if (nAssessed === 0) return { nAssessed: 0, nFlaggedPersons: 0, suppressed: false, nSuppressedTools: 0, modules: [] };
  if (nAssessed < K) return { nAssessed, nFlaggedPersons: 0, suppressed: true, nSuppressedTools: 0, modules: [] };
  const nFlaggedPersons = [...latestByPerson.values()].filter((v) => v.flag).length;

  // Tool scores for those assessments — chunk the id list AND page within each chunk (~24 rows/person).
  const aids = [...latestByPerson.values()].map((v) => v.id);
  const scoreRows: Record<string, unknown>[] = [];
  for (let i = 0; i < aids.length; i += 200) {
    const chunk = aids.slice(i, i + 200);
    for (let from = 0; ; from += 1000) {
      const { data } = await db.from("person_tool_scores")
        .select("tool_code,project_module,raw_score,risk_level,flag")
        .in("person_assessment_id", chunk).order("id", { ascending: true }).range(from, from + 999);
      const rows = (data ?? []) as Record<string, unknown>[];
      scoreRows.push(...rows);
      if (rows.length < 1000) break;
    }
  }

  type Acc = {
    module: string; n: number; sum: number; min: number | null; max: number | null;
    risk: { high: number; medium: number; normal: number }; flagged: number;
  };
  const agg = new Map<string, Acc>();
  const order: string[] = [];
  for (const t of scoreRows) {
    const code = String(t.tool_code);
    if (!agg.has(code)) {
      agg.set(code, { module: String(t.project_module || "general"), n: 0, sum: 0, min: null, max: null, risk: { high: 0, medium: 0, normal: 0 }, flagged: 0 });
      order.push(code);
    }
    const a = agg.get(code)!;
    const raw = _num(t.raw_score);
    if (raw != null) {
      a.sum += raw; a.n += 1;
      a.min = a.min == null ? raw : Math.min(a.min, raw);
      a.max = a.max == null ? raw : Math.max(a.max, raw);
    }
    const rl = String(t.risk_level ?? "normal");
    if (rl === "high") a.risk.high += 1; else if (rl === "medium") a.risk.medium += 1; else a.risk.normal += 1;
    if (t.flag === true) a.flagged += 1;
  }

  const tools: SurveyToolAgg[] = order.map((code) => {
    const a = agg.get(code)!;
    return {
      toolCode: code, label: labelMap[code] ?? code, projectModule: a.module,
      kind: a.module === "survey" ? "survey" : "clinical",
      n: a.n, mean: a.n ? Math.round((a.sum / a.n) * 10) / 10 : null, min: a.min, max: a.max,
      scoreScale: scoreScaleByKey.get(code) ?? null, risk: a.risk, flagged: a.flagged,
    };
  });

  // Per-tool k-anonymity: a conditionally-scored tool can cover < K people even when the project has ≥ K
  // assessed — suppress those cells so a single individual's exact score/risk/flag never surfaces.
  let nSuppressedTools = 0;
  const visibleTools = tools.filter((t) => {
    const cellN = t.risk.high + t.risk.medium + t.risk.normal;   // people who have this tool (one row each)
    if (cellN < K) { nSuppressedTools += 1; return false; }
    return true;
  });

  const byModule = new Map<string, SurveyToolAgg[]>();
  for (const t of visibleTools) {
    if (!byModule.has(t.projectModule)) byModule.set(t.projectModule, []);
    byModule.get(t.projectModule)!.push(t);
  }
  const modules: SurveyModuleAgg[] = [...byModule.entries()]
    .sort((a, b) => MODULE_ORDER.indexOf(a[0]) - MODULE_ORDER.indexOf(b[0]))
    .map(([module, toolsIn]) => ({ module, label: MODULE_LABEL[module] ?? module, tools: toolsIn }));

  return { nAssessed, nFlaggedPersons, suppressed: false, nSuppressedTools, modules };
}

export type PersonClinicalAssessment = {
  id: string; round: string; yearMonth: string; questionnaireId: string | null;
  aaiOverall: number | null; hasClinicalFlag: boolean; toolScores: PersonToolScore[];
};
/** A person's clinical assessments (Pre/Post) with their tool scores, newest first. */
export async function getPersonClinicalAssessments(personId: string): Promise<PersonClinicalAssessment[]> {
  const db = supabaseAdmin();
  const { data: rows } = await db.from("person_assessments")
    .select("id,round,year_month,questionnaire_id,aai_overall,has_clinical_flag")
    .eq("person_id", personId).not("questionnaire_id", "is", null)
    .order("year_month", { ascending: false });
  const list = (rows ?? []) as Record<string, unknown>[];
  return Promise.all(list.map(async (r) => ({
    id: String(r.id), round: String(r.round ?? "pre"), yearMonth: String(r.year_month ?? ""),
    questionnaireId: r.questionnaire_id == null ? null : String(r.questionnaire_id),
    aaiOverall: _num(r.aai_overall), hasClinicalFlag: r.has_clinical_flag === true,
    toolScores: await getPersonToolScores(String(r.id)),
  })));
}
