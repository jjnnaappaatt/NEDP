"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Avatar } from "@/components/ui/Avatar";
import { ConnectLineButton } from "@/components/line/ConnectLineButton";
import type { ProjectTeam } from "@/types";

/** Relative "last active" label (client-side; not the server module-load clock). */
function lastActiveLabel(iso?: string): string {
  if (!iso) return "ยังไม่ส่งเดือนนี้";
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days <= 0) return "ส่งวันนี้";
  if (days === 1) return "เมื่อวาน";
  return `${days} วันก่อน`;
}

const ERR_TH: Record<string, string> = {
  has_head: "โครงการนี้มีหัวหน้าแล้ว",
  not_member: "ต้องลงทะเบียนโครงการนี้ก่อน",
  no_line: "ต้องเชื่อมต่อ LINE ก่อน",
  no_project: "ไม่พบโครงการ",
};

/** "ทีม / หัวหน้าโครงการ" — shows the project head (or the request flow when there is none) and the
 *  member roster. The head additionally sees each member's submission behavior this month. */
export function TeamSection({ projectId, team }: { projectId: string; team: ProjectTeam }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const request = async () => {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/request-head", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId }),
      });
      if (res.ok) {
        setMsg("ส่งคำขอแล้ว · รอแอดมินอนุมัติ ✓");
        router.refresh();
      } else {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        setMsg(ERR_TH[j.error ?? ""] ?? "ส่งคำขอไม่สำเร็จ ลองใหม่อีกครั้ง");
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="card space-y-3 p-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-display text-base font-semibold text-ink">ทีม / หัวหน้าโครงการ</h2>
        <span className="text-xs text-ink-muted">สมาชิก {team.members.length}</span>
      </div>

      {team.head ? (
        <div className="flex items-center gap-3 rounded-card border border-border bg-surface px-3 py-2.5">
          <Avatar account={team.head} size={44} />
          <div className="min-w-0 flex-1">
            <div className="truncate font-medium text-ink">{team.head.name}</div>
            <span className="inline-flex items-center gap-1 text-xs font-medium text-success-fg">
              <span className="grid h-3.5 w-3.5 place-items-center rounded-full bg-[#06C755] text-[8px] text-white">★</span>
              หัวหน้าโครงการ
            </span>
          </div>
        </div>
      ) : (
        <div className="rounded-card border border-dashed border-border bg-surface px-3 py-3">
          <p className="text-sm text-ink-soft">ยังไม่มีหัวหน้าโครงการ</p>
          <div className="mt-2">
            {team.myStatus === "can_request" && (
              <button
                onClick={request}
                disabled={busy}
                className="inline-flex min-h-[40px] items-center justify-center rounded-xl bg-hero px-4 text-sm font-semibold text-[var(--on-primary)] disabled:opacity-50"
              >
                {busy ? "กำลังส่ง…" : "🙋 ขอเป็นหัวหน้าโครงการ"}
              </button>
            )}
            {team.myStatus === "pending" && (
              <span className="inline-flex min-h-[40px] items-center rounded-xl border border-border px-4 text-sm text-ink-soft">
                ⏳ รอแอดมินอนุมัติ
              </span>
            )}
            {team.myStatus === "not_linked" && (
              <ConnectLineButton label="เชื่อมต่อ LINE เพื่อขอเป็นหัวหน้า" />
            )}
            {team.myStatus === "not_member" && (
              <p className="text-xs text-ink-muted">ลงทะเบียนโครงการนี้ก่อน จึงจะขอเป็นหัวหน้าโครงการได้</p>
            )}
          </div>
        </div>
      )}

      {msg && <p className="text-sm text-ink-soft">{msg}</p>}

      {team.members.length > 0 && (
        <ul className="space-y-1.5 border-t border-border pt-3">
          {team.members.map((m) => (
            <li key={m.account.id} className="flex items-center gap-2.5">
              <Avatar account={m.account} size={32} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="truncate text-sm text-ink">{m.account.name}</span>
                  {team.head?.id === m.account.id && (
                    <span className="shrink-0 rounded-full border border-[#06C755]/40 px-1.5 py-0.5 text-xs font-medium text-success-fg">
                      หัวหน้า
                    </span>
                  )}
                </div>
                {team.iAmHead && (
                  <div className="text-xs text-ink-muted">
                    ส่ง {m.submitted}/{m.total} · {lastActiveLabel(m.lastActiveAt)}
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
