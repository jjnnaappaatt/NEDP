"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { BarTriple } from "@/components/portal/BarTriple";
import { DOMAINS } from "@/components/portal/aaiDomains";
import { cn } from "@/lib/utils";
import { IconTrendingUp, IconEyeOff, IconChevronDown } from "@tabler/icons-react";
import type { GeoNode, ProvinceProjectProgress } from "@/lib/data";

/** One project's AAI progress within the chosen province (mirrors AaiDashboard's AreaCard, keyed by project). */
function ProjectCard({ p }: { p: ProvinceProjectProgress }) {
  const [open, setOpen] = useState(false);
  const r = p.row;
  const pct = r && r.nElderly > 0 ? Math.round((r.nUp10 / r.nElderly) * 100) : 0;
  return (
    <Card className="space-y-2.5">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 font-medium text-ink">{p.projectName}</div>
        {r && !r.suppressed && (
          <div className="shrink-0 text-sm font-semibold text-ink">{r.nElderly.toLocaleString("th-TH")} คน</div>
        )}
      </div>

      {!r ? (
        <div className="rounded-card bg-surface-soft px-2.5 py-2 text-xs text-ink-muted">
          ยังไม่มีข้อมูลรายบุคคลในจังหวัดนี้
        </div>
      ) : r.suppressed ? (
        <div className="flex items-center gap-1.5 rounded-card bg-surface-soft px-2.5 py-2 text-xs text-ink-muted">
          <IconEyeOff size={14} /> ปกปิดคะแนน (ผู้สูงอายุน้อยกว่า 5 คน)
        </div>
      ) : (
        <>
          {r.nUp10 > 0 && (
            <div className="flex items-start gap-1.5 rounded-card bg-success-bg px-2.5 py-1.5 text-xs text-success-fg">
              <IconTrendingUp size={14} className="mt-0.5 shrink-0" />
              <span>
                ผู้สูงอายุ <span className="font-semibold">{r.nUp10.toLocaleString("th-TH")}</span> จาก{" "}
                {r.nElderly.toLocaleString("th-TH")} คน ({pct}%) มี AAI ดีขึ้น ≥10% จากครั้งแรก
              </span>
            </div>
          )}
          <BarTriple label="AAI รวม" base={r.overall.base} prev={r.overall.prev} latest={r.overall.latest} />
          <button
            onClick={() => setOpen((o) => !o)}
            className="flex min-h-[40px] w-full items-center justify-center gap-1 rounded-card border border-border text-xs font-medium text-ink-soft transition hover:bg-surface-soft"
          >
            {open ? "ซ่อนรายมิติ" : "ดูรายมิติ 4 ด้าน"}
            <IconChevronDown size={14} className={cn("transition", open && "rotate-180")} />
          </button>
          {open && (
            <div className="space-y-3 border-t border-border pt-3">
              {DOMAINS.map((d) => (
                <BarTriple key={d.key} label={d.label} base={r[d.key].base} prev={r[d.key].prev} latest={r[d.key].latest} />
              ))}
            </div>
          )}
        </>
      )}
    </Card>
  );
}

/** "รายจังหวัด" admin view: pick a province → every project operating there, each with its AAI progress. */
export function ProvinceProjectsPanel({ provinces }: { provinces: GeoNode[] }) {
  const [province, setProvince] = useState("");
  const [rows, setRows] = useState<ProvinceProjectProgress[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!province) { setRows([]); return; }
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/admin/province-projects?province=${encodeURIComponent(province)}`);
        const j = await res.json();
        if (!cancelled) setRows(j.rows ?? []);
      } catch {
        /* keep previous */
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [province]);

  const withData = rows.filter((r) => r.row && !r.row.suppressed).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <label htmlFor="prov" className="text-sm font-medium text-ink-soft">จังหวัด</label>
        <select
          id="prov"
          value={province}
          onChange={(e) => setProvince(e.target.value)}
          className="min-h-[40px] rounded-card border border-border bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-accent"
        >
          <option value="">— เลือกจังหวัด —</option>
          {provinces.map((p) => (
            <option key={p.code} value={p.code}>{p.nameTh}</option>
          ))}
        </select>
        {loading && <span className="text-xs text-ink-muted">กำลังโหลด…</span>}
      </div>

      {!province ? (
        <Card className="p-8 text-center text-ink-soft">เลือกจังหวัดเพื่อดูความก้าวหน้าของทุกโครงการในจังหวัดนั้น</Card>
      ) : !rows.length ? (
        <Card className="p-8 text-center text-ink-soft">{loading ? "กำลังโหลด…" : "ไม่มีโครงการที่ลงพื้นที่ในจังหวัดนี้"}</Card>
      ) : (
        <>
          <p className="text-xs text-ink-muted">
            {rows.length} โครงการในจังหวัดนี้ · มีข้อมูลรายบุคคล {withData} โครงการ · แตะ “ดูรายมิติ” เพื่อดูคะแนนราย 4 มิติ
          </p>
          <div className="grid grid-cols-1 gap-2 lg:grid-cols-2">
            {rows.map((r) => (
              <ProjectCard key={r.projectId} p={r} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
