"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Card } from "@/components/ui/Card";
import { StatCard } from "@/components/dashboard/StatCard";
import { BarTriple } from "./BarTriple";
import { ProjectMultiSelect } from "./ProjectMultiSelect";
import { AaiComparePanel } from "./AaiComparePanel";
import { DOMAINS } from "./aaiDomains";
import { TambonIndividuals } from "./TambonIndividuals";
import { AreaCard } from "./AreaCard";
import { cn } from "@/lib/utils";
import {
  IconUsers, IconTrendingUp, IconHeart, IconChartBar, IconSparkles,
  IconChevronRight, IconFolder, IconFolderOpen, IconArrowsDiff,
} from "@tabler/icons-react";
import type { AaiLevel, AaiSnapshotRow, PickerProject } from "@/lib/data";

export { DOMAINS };
const MAX_COMPARE = 5;

type Triple = { base: number | null; prev: number | null; latest: number | null };

function wavgTriple(rows: AaiSnapshotRow[], pick: (r: AaiSnapshotRow) => Triple): Triple {
  const one = (sel: (t: Triple) => number | null) => {
    let w = 0, acc = 0;
    for (const r of rows) {
      const v = sel(pick(r));
      if (v != null && r.nElderly > 0) { w += r.nElderly; acc += v * r.nElderly; }
    }
    return w > 0 ? Math.round((acc / w) * 10) / 10 : null;
  };
  return { base: one((t) => t.base), prev: one((t) => t.prev), latest: one((t) => t.latest) };
}

// ── level helpers ────────────────────────────────────────────────────────────
// "individual" is a client-local 4th drill level (the ตำบล leaf → รายบุคคล); the exported AaiLevel + the
// aai-summary API stay province/amphoe/tambon only.
type DrillLevel = AaiLevel | "individual";
const LEVEL_OF = (depth: number): DrillLevel => (depth === 0 ? "province" : depth === 1 ? "amphoe" : depth === 2 ? "tambon" : "individual");
const LEVEL_LABEL: Record<DrillLevel, string> = { province: "จังหวัด", amphoe: "อำเภอ", tambon: "ตำบล", individual: "บุคคล" };
const CHILD_LABEL: Record<DrillLevel, string | null> = { province: "รายอำเภอ", amphoe: "รายตำบล", tambon: "รายบุคคล", individual: null };

// ── Example/demo dataset (client-side only; never written to the DB) ─────────
const tri = (base: number, prev: number, latest: number): Triple => ({ base, prev, latest });
const dRow = (
  geoCode: string, provinceTh: string, amphoeTh: string, tambonTh: string,
  nElderly: number, nUp10: number, osm: [number, number],
  ov: [number, number, number], d1: [number, number, number],
  d2: [number, number, number], d3: [number, number, number], d4: [number, number, number],
): AaiSnapshotRow => ({
  geoCode, provinceTh, amphoeTh, tambonTh, nElderly, nUp10, osmBefore: osm[0], osmAfter: osm[1],
  overall: tri(...ov), d1: tri(...d1), d2: tri(...d2), d3: tri(...d3), d4: tri(...d4), suppressed: false,
});
const NULL3: Triple = { base: null, prev: null, latest: null };
const DEMO: Record<AaiLevel, AaiSnapshotRow[]> = {
  province: [
    dRow("50", "เชียงใหม่", "", "", 142, 51, [24, 38], [51, 57, 63], [44, 49, 54], [50, 55, 60], [40, 45, 52], [56, 60, 66]),
    dRow("61", "อุทัยธานี", "", "", 88, 29, [12, 20], [48, 53, 59], [41, 46, 51], [47, 52, 57], [38, 43, 49], [53, 57, 62]),
    dRow("14", "พระนครศรีอยุธยา", "", "", 76, 22, [15, 23], [50, 54, 58], [43, 47, 50], [49, 53, 56], [41, 44, 48], [55, 58, 61]),
  ],
  amphoe: [
    dRow("5001", "เชียงใหม่", "เมืองเชียงใหม่", "", 64, 26, [10, 16], [52, 58, 64], [45, 50, 55], [51, 56, 61], [41, 46, 53], [57, 61, 67]),
    dRow("5007", "เชียงใหม่", "สันทราย", "", 48, 17, [8, 13], [50, 55, 61], [43, 48, 53], [49, 54, 58], [39, 44, 50], [55, 59, 64]),
    dRow("6106", "อุทัยธานี", "บ้านไร่", "", 31, 11, [5, 9], [47, 52, 58], [40, 45, 50], [46, 51, 56], [37, 42, 48], [52, 56, 61]),
    dRow("6107", "อุทัยธานี", "ลานสัก", "", 24, 8, [4, 7], [49, 53, 59], [42, 46, 51], [48, 52, 57], [39, 43, 49], [54, 57, 62]),
  ],
  tambon: [
    dRow("500101", "เชียงใหม่", "เมืองเชียงใหม่", "ศรีภูมิ", 28, 12, [4, 7], [53, 59, 65], [46, 51, 56], [52, 57, 62], [42, 47, 54], [58, 62, 68]),
    dRow("500103", "เชียงใหม่", "เมืองเชียงใหม่", "ช้างเผือก", 22, 9, [3, 6], [51, 56, 62], [44, 49, 54], [50, 55, 60], [40, 45, 51], [56, 60, 65]),
    dRow("610601", "อุทัยธานี", "บ้านไร่", "บ้านไร่", 18, 7, [2, 5], [48, 53, 58], [41, 46, 50], [47, 52, 56], [38, 43, 48], [53, 57, 61]),
    // a < 5-person tambon to demonstrate k-anonymity suppression
    { geoCode: "610602", provinceTh: "อุทัยธานี", amphoeTh: "บ้านไร่", tambonTh: "ทัพหลวง", nElderly: 3, nUp10: 0, osmBefore: 1, osmAfter: 2,
      overall: NULL3, d1: NULL3, d2: NULL3, d3: NULL3, d4: NULL3, suppressed: true },
  ],
};

export function AaiDashboard({
  projects, initialRows,
}: { projects: PickerProject[]; initialRows: AaiSnapshotRow[] }) {
  const [selected, setSelected] = useState<Set<string>>(new Set(projects.map((p) => p.id)));
  const [path, setPath] = useState<{ code: string; name: string }[]>([]); // drilled folders (breadcrumb)
  const [rows, setRows] = useState<AaiSnapshotRow[]>(initialRows);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [demo, setDemo] = useState(false);
  const [compareMode, setCompareMode] = useState(false);
  const [picks, setPicks] = useState<Map<string, AaiSnapshotRow>>(new Map());
  const skipFirst = useRef(true);

  const depth = path.length;
  const level = LEVEL_OF(depth);
  const parent = depth ? path[depth - 1].code : undefined;
  const selectedKey = useMemo(() => [...selected].sort().join(","), [selected]);

  useEffect(() => {
    if (demo) return; // demo mode renders static sample rows — no fetch
    if (level === "individual") return; // person list is fetched by <TambonIndividuals/>, not aai-summary
    if (skipFirst.current) { skipFirst.current = false; return; }
    if (selected.size === 0) { setRows([]); return; }
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(false);
      try {
        const params = new URLSearchParams({ level });
        params.set("projects", [...selected].join(","));
        if (parent) params.set("parent", parent);
        const res = await fetch(`/api/portal/aai-summary?${params.toString()}`);
        const j = await res.json();
        if (!cancelled) setRows(j.rows ?? []);
      } catch {
        if (!cancelled) setError(true); // surface the failure; keep previous rows visible underneath
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [level, parent, selectedKey, selected.size, demo]);

  const effRows = level === "individual" ? []
    : demo ? DEMO[level as AaiLevel].filter((r) => (parent ? r.geoCode.startsWith(parent) : true)) : rows;

  const totals = useMemo(() => ({
    nElderly: effRows.reduce((s, r) => s + r.nElderly, 0),
    nUp10: effRows.reduce((s, r) => s + r.nUp10, 0),
    osmBefore: effRows.reduce((s, r) => s + r.osmBefore, 0),
    osmAfter: effRows.reduce((s, r) => s + r.osmAfter, 0),
    overall: wavgTriple(effRows, (r) => r.overall),
    d1: wavgTriple(effRows, (r) => r.d1), d2: wavgTriple(effRows, (r) => r.d2),
    d3: wavgTriple(effRows, (r) => r.d3), d4: wavgTriple(effRows, (r) => r.d4),
  }), [effRows]);

  const toggleProject = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  const setAll = (ids: string[] | null) => setSelected(new Set(ids ?? []));

  const geoName = (r: AaiSnapshotRow) =>
    level === "province" ? r.provinceTh : level === "amphoe" ? r.amphoeTh : r.tambonTh;
  const geoSub = (r: AaiSnapshotRow) =>
    level === "province" ? null : level === "amphoe" ? r.provinceTh : `${r.amphoeTh} · ${r.provinceTh}`;

  const drill = (r: AaiSnapshotRow) => { setPath((p) => [...p, { code: r.geoCode, name: geoName(r) }]); };
  const gotoDepth = (d: number) => setPath((p) => p.slice(0, d));

  const togglePick = (r: AaiSnapshotRow) =>
    setPicks((prev) => {
      const next = new Map(prev);
      if (next.has(r.geoCode)) next.delete(r.geoCode);
      else if (next.size < MAX_COMPARE) next.set(r.geoCode, r);
      return next;
    });
  const pickList = [...picks.values()];
  const nameForPick = (r: AaiSnapshotRow) =>
    r.tambonTh ? r.tambonTh : r.amphoeTh ? r.amphoeTh : r.provinceTh;

  return (
    <div className="space-y-5">
      {/* Controls */}
      <div className="space-y-3">
        <div className="flex items-center justify-end">
          <button onClick={() => { setDemo((d) => !d); setPath([]); setPicks(new Map()); setCompareMode(false); }}
            className={cn("inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition",
              demo ? "border-accent bg-accent-soft text-ink" : "border-border text-ink-soft hover:bg-surface-soft")}>
            <IconSparkles size={14} /> {demo ? "ออกจากตัวอย่าง" : "ดูตัวอย่าง (Demo)"}
          </button>
        </div>
        {demo && (
          <div className="rounded-card border border-accent/40 bg-accent-soft/40 px-3 py-2 text-xs text-ink-soft">
            กำลังแสดง <span className="font-medium text-ink">ข้อมูลตัวอย่าง</span> เพื่อดูหน้าตาแดชบอร์ด — ไม่ใช่ข้อมูลจริง แตะโฟลเดอร์จังหวัดเพื่อเจาะดูอำเภอ/ตำบล
          </div>
        )}
        {!demo && projects.length > 1 && (
          <ProjectMultiSelect projects={projects} selected={selected} onToggle={toggleProject} onSetAll={setAll} />
        )}
      </div>

      {level !== "individual" && (
      <>
      {/* KPIs (scope = current folder) */}
      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard icon={IconUsers} color="#1a56db" value={totals.nElderly.toLocaleString("th-TH")} label="จำนวนผู้สูงอายุ" />
        <StatCard icon={IconChartBar} color="#6d28d9" value={totals.overall.latest ?? "—"} label="AAI รวม (ล่าสุด)"
          sub={totals.overall.base != null ? `เริ่มต้น ${totals.overall.base}` : undefined} />
        <StatCard icon={IconTrendingUp} color="#16a34a" value={totals.nUp10.toLocaleString("th-TH")} label="AAI เพิ่มขึ้น ≥ 10%" />
        <StatCard icon={IconHeart} color="#d97706" value={totals.osmAfter.toLocaleString("th-TH")} label="อสม. (หลัง)"
          sub={`ก่อน ${totals.osmBefore.toLocaleString("th-TH")}`} />
      </section>

      {/* 3-time-point charts (scope = current folder) */}
      <Card className="space-y-4">
        <h2 className="border-l-4 border-accent pl-2 font-display text-base font-semibold text-ink">
          คะแนน AAI 3 ช่วงเวลา {loading && <span className="ml-1 text-xs font-normal text-ink-muted">· กำลังโหลด…</span>}
        </h2>
        <p className="-mt-1 text-xs text-ink-muted">ถ่วงน้ำหนักตามจำนวนผู้สูงอายุในแต่ละพื้นที่</p>
        {error && (
          <p className="rounded-card bg-surface-soft px-2.5 py-1.5 text-xs text-ink-muted">
            โหลดข้อมูลไม่สำเร็จ ลองใหม่อีกครั้ง (กำลังแสดงข้อมูลเดิม)
          </p>
        )}
        <div className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <BarTriple label="AAI รวม (ภาพรวม)" base={totals.overall.base} prev={totals.overall.prev} latest={totals.overall.latest} />
          </div>
          {DOMAINS.map((d) => (
            <BarTriple key={d.key} label={d.label} base={totals[d.key].base} prev={totals[d.key].prev} latest={totals[d.key].latest} />
          ))}
        </div>
      </Card>
      </>
      )}

      {/* Folder drill-down */}
      <section className="space-y-3">
        {/* breadcrumb (client-state, not routes) */}
        <nav className="flex flex-wrap items-center gap-1 text-sm text-ink-muted">
          <button onClick={() => gotoDepth(0)} className={cn("inline-flex items-center gap-1", depth ? "hover:text-accent hover:underline" : "font-medium text-ink")}>
            {depth ? <IconFolder size={15} /> : <IconFolderOpen size={15} />} รายจังหวัด
          </button>
          {path.map((c, i) => (
            <span key={c.code} className="inline-flex items-center gap-1">
              <IconChevronRight size={14} />
              <button onClick={() => gotoDepth(i + 1)} className={i + 1 < depth ? "hover:text-accent hover:underline" : "font-medium text-ink"}>{c.name}</button>
            </span>
          ))}
        </nav>

        {level === "individual" ? (
          <TambonIndividuals tambonCode={parent ?? ""} tambonName={path[depth - 1]?.name} projectIds={[...selected]} demo={demo} />
        ) : (
        <>
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-display text-lg font-semibold text-ink">
            รายพื้นที่ ({LEVEL_LABEL[level]})
          </h2>
          <button onClick={() => { setCompareMode((m) => !m); if (compareMode) setPicks(new Map()); }}
            className={cn("inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
              compareMode ? "border-accent bg-accent-soft text-ink" : "border-border text-ink-soft hover:bg-surface-soft")}>
            <IconArrowsDiff size={14} /> {compareMode ? "เสร็จสิ้น" : "เปรียบเทียบพื้นที่"}
          </button>
        </div>
        {compareMode && (
          <p className="text-xs text-ink-muted">เลือกได้สูงสุด {MAX_COMPARE} พื้นที่ ({picks.size}/{MAX_COMPARE})</p>
        )}

        {compareMode && pickList.length > 0 && (
          <AaiComparePanel rows={pickList} nameOf={nameForPick}
            onRemove={(code) => setPicks((prev) => { const n = new Map(prev); n.delete(code); return n; })}
            onClear={() => setPicks(new Map())} />
        )}

        {!effRows.length ? (
          <Card className="p-8 text-center text-ink-soft">
            {selected.size === 0 ? "เลือกอย่างน้อยหนึ่งโครงการ" : "ยังไม่มีข้อมูลรายบุคคลในช่วงนี้"}
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {effRows.map((r) => (
              <AreaCard key={r.geoCode} r={r} name={geoName(r)} sub={geoSub(r)}
                drillLabel={r.suppressed ? null : CHILD_LABEL[level]}
                onDrill={CHILD_LABEL[level] ? () => drill(r) : null}
                compareMode={compareMode} picked={picks.has(r.geoCode)}
                onTogglePick={() => togglePick(r)} pickDisabled={picks.size >= MAX_COMPARE} />
            ))}
          </div>
        )}
        </>
        )}
      </section>
    </div>
  );
}
