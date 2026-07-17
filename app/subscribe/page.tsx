"use client";

import { useEffect, useState } from "react";

type Phase = "loading" | "ok" | "error" | "login";

/**
 * LIFF one-tap subscribe. Opened from the bot register page via
 * `https://liff.line.me/<LIFF_ID>/subscribe?pid=<project>&code=<code>`. Inside LINE it captures the
 * verified LINE userId and subscribes server-side — no manual "send", works on mobile + desktop.
 */
export default function SubscribePage() {
  const [phase, setPhase] = useState<Phase>("loading");
  const [project, setProject] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [inClient, setInClient] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const pid = Number(params.get("pid"));
        const code = params.get("code") ?? "";
        if (!pid) {
          setPhase("error");
          setError("ลิงก์ไม่ถูกต้อง — ไม่พบรหัสโครงการ");
          return;
        }
        const liffId = process.env.NEXT_PUBLIC_LIFF_ID;
        if (!liffId) {
          setPhase("error");
          setError("ระบบ LINE ยังไม่พร้อมใช้งาน");
          return;
        }

        const liff = (await import("@line/liff")).default;
        await liff.init({ liffId });
        setInClient(liff.isInClient());
        if (!liff.isLoggedIn()) {
          setPhase("login");
          liff.login();
          return;
        }
        const accessToken = liff.getAccessToken();
        if (!accessToken) {
          setPhase("error");
          setError("ไม่สามารถยืนยันตัวตน LINE ได้");
          return;
        }

        const res = await fetch("/api/line/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ accessToken, pid, code }),
        });
        const data = (await res.json().catch(() => ({}))) as {
          ok?: boolean;
          project?: string;
          error?: string;
        };
        if (cancelled) return;
        if (res.ok && data.ok) {
          setProject(data.project ?? "");
          setPhase("ok");
        } else {
          setError(data.error ?? "สมัครไม่สำเร็จ ลองใหม่อีกครั้ง");
          setPhase("error");
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "เกิดข้อผิดพลาด");
          setPhase("error");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const closeWindow = async () => {
    try {
      const liff = (await import("@line/liff")).default;
      if (liff.isInClient()) liff.closeWindow();
    } catch {
      /* no-op */
    }
  };

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4">
      <div className="card w-full max-w-sm p-8 text-center">
        {phase === "loading" || phase === "login" ? (
          <>
            <div className="mx-auto mb-5 h-12 w-12 animate-spin rounded-full border-[3px] border-ink-soft/20 border-t-[var(--hero-border)]" />
            <p className="text-ink-soft">
              {phase === "login" ? "กำลังเข้าสู่ระบบ LINE…" : "กำลังสมัครรับการแจ้งเตือน…"}
            </p>
          </>
        ) : phase === "ok" ? (
          <>
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-success-bg text-3xl text-success-fg">
              ✓
            </div>
            <h1 className="text-xl font-bold text-ink">สมัครรับการแจ้งเตือนสำเร็จ</h1>
            {project ? (
              <p className="mt-2 text-sm text-ink-soft">
                โครงการ <span className="font-semibold text-ink">{project}</span>
              </p>
            ) : null}
            <p className="mt-3 text-xs text-ink-soft">
              ระบบจะแจ้งเตือนกำหนดส่งข้อมูลรายเดือนของโครงการนี้ทาง LINE ให้คุณโดยอัตโนมัติ ✅
            </p>
            <div className="mt-6 flex flex-col gap-2">
              <a
                href="/status"
                className="rounded-xl bg-hero py-2.5 text-sm font-semibold text-[var(--on-primary)]"
              >
                📊 ดูสถานะโครงการ
              </a>
              {inClient ? (
                <button onClick={closeWindow} className="py-2 text-sm text-ink-soft">
                  ปิดหน้าต่าง
                </button>
              ) : null}
            </div>
          </>
        ) : (
          <>
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 text-3xl text-red-500">
              !
            </div>
            <h1 className="text-lg font-bold text-ink">สมัครไม่สำเร็จ</h1>
            <p className="mt-2 text-sm text-ink-soft">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-6 w-full rounded-xl bg-hero py-2.5 text-sm font-semibold text-[var(--on-primary)]"
            >
              ลองอีกครั้ง
            </button>
          </>
        )}
      </div>
    </div>
  );
}
