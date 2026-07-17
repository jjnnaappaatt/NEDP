import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { getTambonDimensionSummary } from "@/lib/data";
import { getCurrentMonth, monthLabelThai } from "@/lib/format";

export const dynamic = "force-dynamic";

/**
 * Per-tambon AAI (รายตำบล) — the individual-level rollup. Each tambon's D1–D4 + Overall are the
 * MEAN of its people's per-person AAI scores (public.tambon_aai_monthly_pivot), ก่อน → หลัง. Scores
 * are suppressed by the view for any cell with < 5 people (k-anonymity). Sub-page of /exec.
 */
const DOMAINS = [
  { before: "aai_d1_before", after: "aai_d1_after", label: "การมีงานทำ/รายได้" },
  { before: "aai_d2_before", after: "aai_d2_after", label: "การมีส่วนร่วม" },
  { before: "aai_d3_before", after: "aai_d3_after", label: "สุขภาพ/ความมั่นคง" },
  { before: "aai_d4_before", after: "aai_d4_after", label: "สภาพแวดล้อม" },
] as const;

function Delta({ before, after }: { before: number | null; after: number | null }) {
  if (before == null || after == null) return null;
  const d = Math.round((after - before) * 10) / 10;
  return (
    <span className={`text-xs font-semibold ${d >= 0 ? "text-success-fg" : "text-danger-fg"}`}>
      {d >= 0 ? `+${d}` : d}
    </span>
  );
}

export default async function ExecTambonPage() {
  const month = getCurrentMonth();
  const rows = await getTambonDimensionSummary(month);

  return (
    <div className="space-y-6">
      <header>
        <Link href="/exec" className="text-xs text-ink-muted hover:text-ink">← แดชบอร์ดผู้บริหาร</Link>
        <h1 className="hero-heading mt-1">คะแนน AAI รายตำบล</h1>
        <p className="mt-2 text-sm text-ink-soft">
          {monthLabelThai(month)} · คะแนนเฉลี่ยรายบุคคล รวมเป็นรายตำบล (ก่อน → หลัง)
        </p>
      </header>

      {rows.length === 0 ? (
        <Card className="p-8 text-center text-ink-soft">
          ยังไม่มีข้อมูลรายบุคคลในเดือนนี้
          <div className="mt-1 text-xs text-ink-muted">
            เมื่อเจ้าหน้าที่บันทึกแบบประเมินรายบุคคล คะแนนจะรวมขึ้นมาที่นี่โดยอัตโนมัติ
          </div>
        </Card>
      ) : (
        <div className="space-y-2">
          {rows.map((t) => {
            const suppressed = t.overall_before == null && t.overall_after == null;
            return (
              <Card key={t.tambon_code} className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-medium text-ink">ต.{t.tambon_th}</div>
                    <div className="mt-0.5 truncate text-xs text-ink-muted">{t.province_th} · {t.amphoe_th}</div>
                  </div>
                  <div className="whitespace-nowrap text-right text-xs text-ink-muted">
                    {suppressed ? (
                      // < 5 people: show only a coarse count, never the exact head/flag counts — a
                      // suppressed tambon with n=3, flag=3 would otherwise disclose all three are
                      // clinically flagged on this PUBLIC page. See AUDIT.md → MED-2.
                      <div>&lt; 5 คน</div>
                    ) : (
                      <>
                        <div>{t.n_pre}{t.n_post != null ? ` → ${t.n_post}` : ""} คน</div>
                        {t.n_flag_pre != null && t.n_flag_pre > 0 && (
                          <div className="mt-0.5 font-medium text-danger-fg">⚠ ต้องส่งต่อ {t.n_flag_pre}</div>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {suppressed ? (
                  <div className="rounded-card bg-surface-soft px-3 py-2 text-xs text-ink-muted">
                    ข้อมูลน้อยเกินไป (น้อยกว่า 5 คน) — ปกปิดคะแนนเพื่อความเป็นส่วนตัว
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                    {DOMAINS.map((dm) => {
                      const b = t[dm.before];
                      const a = t[dm.after];
                      return (
                        <div key={dm.before} className="rounded-card border border-border p-2">
                          <div className="text-xs font-medium text-ink">{dm.label}</div>
                          <div className="mt-1 flex items-baseline gap-1">
                            <span className="text-sm text-ink-soft">{b ?? "—"}</span>
                            <span className="text-ink-muted">→</span>
                            <span className="font-display text-base font-bold text-ink">{a ?? "—"}</span>
                          </div>
                          <Delta before={b} after={a} />
                        </div>
                      );
                    })}
                    <div className="rounded-card border border-accent/40 bg-accent/5 p-2">
                      <div className="text-xs font-semibold text-ink">รวม (Overall)</div>
                      <div className="mt-1 flex items-baseline gap-1">
                        <span className="text-sm text-ink-soft">{t.overall_before ?? "—"}</span>
                        <span className="text-ink-muted">→</span>
                        <span className="font-display text-base font-bold text-ink">{t.overall_after ?? "—"}</span>
                      </div>
                      <Delta before={t.overall_before} after={t.overall_after} />
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
