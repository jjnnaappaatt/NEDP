import { IconClipboardList, IconAlertTriangle, IconStack2, IconChartBar, IconEyeOff } from "@tabler/icons-react";
import { Card } from "@/components/ui/Card";
import { StatCard } from "@/components/dashboard/StatCard";
import { DistributionBar } from "./DistributionBar";
import { ScoreGauge } from "./ScoreGauge";
import type { ProjectSurveyDashboard } from "@/lib/data";

/** Distinct accent (warm orange) so the project's own questionnaire dashboard reads differently from the
 *  mint/violet standard AAI dashboard. */
const ACCENT = "#ea580c";

/**
 * A project's OWN questionnaire results, aggregated across its people — separate from the standard AAI.
 * Clinical tools render a risk-band distribution; survey specific-scores render a mean/max gauge. Data is
 * aggregated server-side (counts only); k-anonymity suppression is handled upstream.
 */
export function SurveyDashboard({ projectName, data }: { projectName: string; data: ProjectSurveyDashboard }) {
  const totalTools = data.modules.reduce((s, m) => s + m.tools.length, 0);
  const flagPct = data.nAssessed > 0 ? Math.round((data.nFlaggedPersons / data.nAssessed) * 100) : 0;

  return (
    <div className="space-y-5">
      <header className="space-y-1 border-l-4 pl-3" style={{ borderColor: ACCENT }}>
        <h2 className="font-display text-lg font-semibold text-ink">แบบสอบถามเฉพาะโครงการ</h2>
        <p className="text-sm text-ink-soft">{projectName} · สรุปผลแบบสอบถามของโครงการ (แยกจากคะแนน AAI มาตรฐาน)</p>
      </header>

      {data.suppressed ? (
        <Card className="flex items-center gap-2 p-8 text-center text-ink-soft">
          <IconEyeOff size={18} className="shrink-0" />
          <span>ข้อมูลน้อยเกินไป (ผู้ตอบต่ำกว่า 5 คน) — งดแสดงผลเพื่อคุ้มครองความเป็นส่วนตัว</span>
        </Card>
      ) : data.nAssessed > 0 && totalTools === 0 && data.nSuppressedTools > 0 ? (
        <Card className="flex items-center gap-2 p-8 text-center text-ink-soft">
          <IconEyeOff size={18} className="shrink-0" />
          <span>ปกปิดผลทั้งหมด — แต่ละเครื่องมือมีผู้ประเมินน้อยกว่า 5 คน เพื่อคุ้มครองความเป็นส่วนตัว</span>
        </Card>
      ) : data.nAssessed === 0 || totalTools === 0 ? (
        <Card className="p-8 text-center text-ink-soft">ยังไม่มีผลแบบสอบถามของโครงการนี้</Card>
      ) : (
        <>
          <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <StatCard icon={IconClipboardList} color={ACCENT} value={data.nAssessed.toLocaleString("th-TH")} label="ผู้เข้ารับการประเมิน" />
            <StatCard icon={IconAlertTriangle} color="#d45656" value={data.nFlaggedPersons.toLocaleString("th-TH")} label="มีธงเตือน" sub={`${flagPct}% ของผู้ประเมิน`} />
            <StatCard icon={IconStack2} color="#6d28d9" value={data.modules.length} label="หมวดที่ประเมิน" />
            <StatCard icon={IconChartBar} color="#1a56db" value={totalTools} label="เครื่องมือทั้งหมด" />
          </section>

          {data.nSuppressedTools > 0 && (
            <p className="rounded-card bg-surface-soft px-3 py-2 text-xs text-ink-muted">
              ปกปิด {data.nSuppressedTools} เครื่องมือที่มีผู้ประเมินน้อยกว่า 5 คน เพื่อคุ้มครองความเป็นส่วนตัว
            </p>
          )}
          <div className="grid gap-4 lg:grid-cols-2">
            {data.modules.map((m) => (
              <Card key={m.module} className="space-y-4">
                <h3 className="border-l-4 pl-2 font-display text-base font-semibold text-ink" style={{ borderColor: ACCENT }}>
                  {m.label}
                </h3>
                <div className="space-y-4">
                  {m.tools.map((t) => (t.kind === "survey" ? <ScoreGauge key={t.toolCode} t={t} /> : <DistributionBar key={t.toolCode} t={t} />))}
                </div>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
