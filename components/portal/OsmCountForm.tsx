"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { fieldCls, portalErr } from "./fieldStyles";

/** Manual อสม. (trained village-health-volunteer) count for this tambon — ก่อน/หลัง. Self-loads current
 *  values on mount. */
export function OsmCountForm({ projectId, tambonCode }: { projectId: string; tambonCode: string }) {
  const [before, setBefore] = useState("");
  const [after, setAfter] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/portal/osm-count?projectId=${projectId}&tambonCode=${tambonCode}`);
        const j = await res.json();
        if (!cancelled && j.osm) {
          setBefore(j.osm.osmBefore?.toString() ?? "");
          setAfter(j.osm.osmAfter?.toString() ?? "");
        }
      } catch {
        /* leave blank */
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [projectId, tambonCode]);

  const save = async () => {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/portal/osm-count", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          projectId, tambonCode,
          osmBefore: before === "" ? null : Number(before),
          osmAfter: after === "" ? null : Number(after),
        }),
      });
      const j = await res.json();
      setMsg(j.ok ? { ok: true, text: "บันทึกแล้ว" } : { ok: false, text: portalErr(j.error) });
    } catch {
      setMsg({ ok: false, text: "เกิดข้อผิดพลาด" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-ink-soft">จำนวน อสม. ที่ได้รับการอบรม (กรอกเอง) ของตำบลนี้</p>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-xs text-ink-muted">ก่อน</label>
          <input type="number" min={0} inputMode="numeric" value={before}
            onChange={(e) => setBefore(e.target.value)} className={fieldCls} disabled={busy || loading} />
        </div>
        <div>
          <label className="mb-1 block text-xs text-ink-muted">หลัง</label>
          <input type="number" min={0} inputMode="numeric" value={after}
            onChange={(e) => setAfter(e.target.value)} className={fieldCls} disabled={busy || loading} />
        </div>
      </div>
      {msg && <p className={`text-sm ${msg.ok ? "text-success-fg" : "text-danger"}`}>{msg.text}</p>}
      <Button variant="accent" className="w-full" disabled={busy || loading} onClick={save}>
        {busy ? "กำลังบันทึก…" : "บันทึกจำนวน อสม."}
      </Button>
    </div>
  );
}
