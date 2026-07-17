/**
 * Raw-data export — everything a project (or the admin) can pull as a spreadsheet: individual AAI
 * assessment rows, อสม. counts, monthly per-location reports, and the participant roster. CODES
 * ONLY by design: person_code stands in for identity; decrypted names are never exported (an xlsx
 * file can travel outside the system — keep it pseudonymous per the TIS-1099 privacy design).
 * Gate upstream with getAdminSession() or isProjectContact(). Imports ./_core only.
 */
import "server-only";
import { supabaseAdmin } from "@/lib/supabase/server";
import { schemaToColumns } from "@/lib/questionnaire/columns";
import { surveyScoreLabels } from "@/lib/questionnaire/surveyScoring";
import { TOOL_LABEL } from "@/lib/questionnaire/toolLabels";
import type { QuestionnaireSchema } from "@/lib/questionnaire/schema";
import { _num } from "./_core";

const PAGE = 1000; // PostgREST silently caps result sets — page every unbounded query

/** Drain a query in PAGE-sized chunks (builder factory because a supabase builder is single-use). */
async function fetchAll<T>(
  build: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await build(from, from + PAGE - 1);
    if (error) throw new Error(error.message);
    const rows = data ?? [];
    out.push(...rows);
    if (rows.length < PAGE) break;
  }
  return out;
}

type Rec2 = Record<string, unknown>;
/** person_tool_scores for a set of assessment ids, chunked (a large `in(...)` list is capped) + paged. */
async function fetchToolScoresByAssessments(
  db: ReturnType<typeof supabaseAdmin>, ids: string[],
): Promise<Rec2[]> {
  const out: Rec2[] = [];
  for (let i = 0; i < ids.length; i += 200) {
    const chunk = ids.slice(i, i + 200);
    const rows = await fetchAll<Rec2>((a, b) =>
      db.from("person_tool_scores")
        .select("person_assessment_id,tool_code,project_module,raw_score")
        .in("person_assessment_id", chunk)
        .order("person_assessment_id", { ascending: true }).order("tool_code", { ascending: true }).range(a, b));
    out.push(...rows);
  }
  return out;
}

export type ExportScope = { projectIds: string[]; month?: string }; // month omitted = ALL history

export type RawAssessmentRow = {
  projectName: string; personCode: string; tambonTh: string; yearMonth: string;
  d1: number | null; d2: number | null; d3: number | null; d4: number | null; overall: number | null;
  isBaseline: boolean; isLatest: boolean; status: string;
};
export type RawOsmRow = {
  projectName: string; tambonTh: string; yearMonth: string;
  osmBefore: number | null; osmAfter: number | null;
};
export type RawSubmissionRow = {
  projectName: string; province: string; amphoe: string; tambon: string; yearMonth: string;
  submittedAt: string | null; values: Record<string, string>;
};
export type RosterRow = {
  projectName: string; personCode: string; tambonTh: string;
  sex: string | null; ageBand: string | null; enrolledAt: string;
};
/** One person×month questionnaire response (custom answers keyed by question id) / computed scores. */
export type QAnswerRow = {
  projectName: string; personCode: string; tambonTh: string; yearMonth: string; round: string;
  answers: Record<string, string>;
};
export type QScoreRow = {
  projectName: string; personCode: string; tambonTh: string; yearMonth: string; round: string;
  scores: Record<string, number | null>;
};
export type ColLabel = { key: string; th: string };
export type RawExport = {
  projectLabel: string; monthLabel: string;
  assessments: RawAssessmentRow[]; osm: RawOsmRow[]; submissions: RawSubmissionRow[]; roster: RosterRow[];
  /** Questionnaire captures + computed scores (Part F). Empty when no project has an assigned questionnaire. */
  qAnswers: QAnswerRow[]; qAnswerCols: ColLabel[]; qScores: QScoreRow[]; qScoreCols: ColLabel[];
};

type Rec = Record<string, unknown>;
const S = (v: unknown) => (v == null ? "" : String(v));

/** All raw rows for the given projects, optionally narrowed to one YYYY-MM month. */
export async function getRawExport(scope: ExportScope): Promise<RawExport> {
  const db = supabaseAdmin();
  const pids = scope.projectIds;
  const month = scope.month;

  const [{ data: projs }, persons, points, osm, subs, locs] = await Promise.all([
    db.from("projects").select("id,name").in("id", pids),
    fetchAll<Rec>((a, b) =>
      db.from("persons").select("id,project_id,person_code,tambon_code,sex,age_band,enrolled_at")
        .in("project_id", pids).order("person_code").range(a, b)),
    fetchAll<Rec>((a, b) => {
      let q = db.from("person_assessment_points")
        .select("person_id,project_id,tambon_code,year_month,aai_d1,aai_d2,aai_d3,aai_d4,aai_overall,is_baseline,is_latest,status")
        .in("project_id", pids);
      if (month) q = q.eq("year_month", month);
      return q.order("year_month").range(a, b);
    }),
    fetchAll<Rec>((a, b) => {
      let q = db.from("tambon_osm_counts")
        .select("project_id,tambon_code,year_month,osm_before,osm_after").in("project_id", pids);
      if (month) q = q.eq("year_month", month);
      return q.order("year_month").range(a, b);
    }),
    fetchAll<Rec>((a, b) => {
      let q = db.from("location_submissions")
        .select("project_id,location_id,year_month,data,submitted_at")
        .in("project_id", pids).eq("status", "submitted");
      if (month) q = q.eq("year_month", month);
      return q.order("submitted_at", { ascending: false }).range(a, b);
    }),
    fetchAll<Rec>((a, b) =>
      db.from("project_locations").select("id,project_id,province,amphoe,tambon")
        .in("project_id", pids).range(a, b)),
  ]);

  const projName = new Map((projs ?? []).map((p) => [String(p.id), String(p.name ?? "")]));
  const pName = (id: unknown) => projName.get(S(id)) ?? "";

  // tambon_code -> Thai name (one lookup across every source that carries a code)
  const codes = new Set<string>();
  for (const r of [...persons, ...points, ...osm]) if (r.tambon_code) codes.add(S(r.tambon_code));
  const geo = codes.size
    ? await db.from("geo_tambon").select("tambon_code,tambon_th").in("tambon_code", [...codes])
    : { data: [] as Rec[] };
  const tambonTh = new Map(((geo.data ?? []) as Rec[]).map((g) => [S(g.tambon_code), S(g.tambon_th)]));
  const tName = (code: unknown) => tambonTh.get(S(code)) || S(code);

  const personByCode = new Map(persons.map((p) => [S(p.id), S(p.person_code)]));

  const assessments: RawAssessmentRow[] = points.map((r) => ({
    projectName: pName(r.project_id),
    personCode: personByCode.get(S(r.person_id)) ?? "",
    tambonTh: tName(r.tambon_code), yearMonth: S(r.year_month),
    d1: _num(r.aai_d1), d2: _num(r.aai_d2), d3: _num(r.aai_d3), d4: _num(r.aai_d4),
    overall: _num(r.aai_overall),
    isBaseline: r.is_baseline === true, isLatest: r.is_latest === true, status: S(r.status),
  }));

  const osmRows: RawOsmRow[] = osm.map((r) => ({
    projectName: pName(r.project_id), tambonTh: tName(r.tambon_code), yearMonth: S(r.year_month),
    osmBefore: _num(r.osm_before), osmAfter: _num(r.osm_after),
  }));

  // newest submitted row per location × month (same dedupe as getLatestSubmissionData)
  const locById = new Map(locs.map((l) => [S(l.id), l]));
  const seen = new Set<string>();
  const submissions: RawSubmissionRow[] = [];
  for (const s of subs) {
    const key = `${S(s.location_id)}|${S(s.year_month)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const loc = locById.get(S(s.location_id));
    submissions.push({
      projectName: pName(s.project_id),
      province: S(loc?.province), amphoe: S(loc?.amphoe), tambon: S(loc?.tambon),
      yearMonth: S(s.year_month), submittedAt: s.submitted_at ? S(s.submitted_at) : null,
      values: (s.data ?? {}) as Record<string, string>,
    });
  }
  submissions.sort((a, b) => a.yearMonth.localeCompare(b.yearMonth) || a.tambon.localeCompare(b.tambon));

  const roster: RosterRow[] = persons.map((p) => ({
    projectName: pName(p.project_id), personCode: S(p.person_code), tambonTh: tName(p.tambon_code),
    sex: p.sex == null ? null : S(p.sex), ageBand: p.age_band == null ? null : S(p.age_band),
    enrolledAt: S(p.enrolled_at),
  }));

  // ── Questionnaire captures + computed scores (Part F) ──────────────────────────────────────
  // NOTE: read from the base table, NOT person_assessment_points — that view was created before
  // questionnaire_id/q_answers existed (select pa.* is frozen at creation), so it lacks those columns.
  const qPoints = await fetchAll<Rec>((a, b) => {
    let q = db.from("person_assessments")
      .select("id,person_id,project_id,tambon_code,year_month,round,questionnaire_id,q_answers")
      .in("project_id", pids).not("questionnaire_id", "is", null);
    if (month) q = q.eq("year_month", month);
    return q.order("year_month").range(a, b);
  });

  const { data: pqRows } = await db.from("project_questionnaires").select("project_id,questionnaire_id,modules").in("project_id", pids);
  const qidByProject = new Map<string, string>();
  const modulesByProject = new Map<string, string[]>();
  for (const r of (pqRows ?? []) as Rec[]) {
    qidByProject.set(S(r.project_id), S(r.questionnaire_id));
    modulesByProject.set(S(r.project_id), Array.isArray(r.modules) ? (r.modules as string[]) : []);
  }
  const qids = [...new Set([...qidByProject.values()])].filter(Boolean);
  const { data: qRows } = qids.length
    ? await db.from("questionnaires").select("id,schema_json").in("id", qids)
    : { data: [] as Rec[] };
  const schemaById = new Map<string, QuestionnaireSchema>(((qRows ?? []) as Rec[]).map((q) => [S(q.id), q.schema_json as QuestionnaireSchema]));

  // Column keys are namespaced by questionnaire_id (`${qid}::${col}`) so that in the multi-project "all"
  // export, two projects' distinct questionnaires — whose question ids are both S.q1, S.q2, … — never
  // collide into one column. Projects that share the SAME questionnaire correctly merge into one column.
  const qAnswerColMap = new Map<string, string>();       // "${qid}::${questionKey}" -> label
  const scoreLabelMap: Record<string, string> = {};      // SC.* toolCode -> label (from schemas)
  for (const pid of pids) {
    const qid = qidByProject.get(pid);
    const schema = qid ? schemaById.get(qid) : undefined;
    if (!qid || !schema) continue;
    for (const c of schemaToColumns(schema, modulesByProject.get(pid) ?? [])) {
      if (c.kind === "question") qAnswerColMap.set(`${qid}::${c.key}`, c.th);
    }
    Object.assign(scoreLabelMap, surveyScoreLabels(schema));
  }
  const qAnswerCols: ColLabel[] = [...qAnswerColMap].map(([key, th]) => ({ key, th }));

  // person_tool_scores per assessment id.
  const aids = qPoints.map((p) => S(p.id)).filter(Boolean);
  const toolRows = aids.length ? await fetchToolScoresByAssessments(db, aids) : [];
  const scoresByAid = new Map<string, Record<string, number | null>>();
  for (const t of toolRows) {
    const aid = S(t.person_assessment_id);
    if (!scoresByAid.has(aid)) scoresByAid.set(aid, {});
    scoresByAid.get(aid)![S(t.tool_code)] = _num(t.raw_score);
  }

  const qAnswers: QAnswerRow[] = [];
  const qScores: QScoreRow[] = [];
  const scoreColMap = new Map<string, string>();          // "${qid}::${toolCode}" -> label
  for (const p of qPoints) {
    const qid = S(p.questionnaire_id);
    const ans = (p.q_answers ?? {}) as Record<string, unknown>;
    const hasAns = !!ans && typeof ans === "object" && Object.keys(ans).length > 0;
    const sc = scoresByAid.get(S(p.id));
    if (!hasAns && !sc) continue;
    const base = {
      projectName: pName(p.project_id), personCode: personByCode.get(S(p.person_id)) ?? "",
      tambonTh: tName(p.tambon_code), yearMonth: S(p.year_month), round: S(p.round) || "pre",
    };
    if (hasAns) {
      const answers: Record<string, string> = {};
      for (const [k, v] of Object.entries(ans)) answers[`${qid}::${k}`] = v == null ? "" : String(v);
      qAnswers.push({ ...base, answers });
    }
    if (sc) {
      const scores: Record<string, number | null> = {};
      for (const [code, raw] of Object.entries(sc)) {
        const colKey = `${qid}::${code}`;
        scores[colKey] = raw;
        if (!scoreColMap.has(colKey)) scoreColMap.set(colKey, TOOL_LABEL[code] ?? scoreLabelMap[code] ?? code);
      }
      qScores.push({ ...base, scores });
    }
  }
  const qScoreCols: ColLabel[] = [...scoreColMap].map(([key, th]) => ({ key, th }));

  const projectLabel = pids.length === 1 ? (projName.get(pids[0]) ?? "") : "ทุกโครงการ";
  return {
    projectLabel, monthLabel: month ?? "ทั้งหมด", assessments, osm: osmRows, submissions, roster,
    qAnswers, qAnswerCols, qScores, qScoreCols,
  };
}

/** Distinct year_months this project has data for (assessments ∪ monthly reports), newest first. */
export async function getExportMonths(projectId: string): Promise<string[]> {
  const db = supabaseAdmin();
  const [a, b] = await Promise.all([
    fetchAll<Rec>((x, y) =>
      db.from("person_assessments").select("year_month").eq("project_id", projectId).range(x, y)),
    fetchAll<Rec>((x, y) =>
      db.from("location_submissions").select("year_month").eq("project_id", projectId).range(x, y)),
  ]);
  const months = new Set<string>();
  for (const r of [...a, ...b]) if (r.year_month) months.add(S(r.year_month));
  return [...months].sort().reverse();
}
