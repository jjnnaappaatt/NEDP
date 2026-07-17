"use client";

import { useEffect, useState } from "react";

type Phase = "loading" | "ok" | "error" | "login";

/**
 * LIFF account-claim page. Opened from an admin-issued link
 * `https://liff.line.me/<LIFF_ID>/claim?token=<signed>` — the researcher logs in with LINE and their
 * verified identity is bound to the project's placeholder account (name/org/phone + registration).
 * Works inside LINE and in a normal browser (LINE Login web flow).
 */
export default function ClaimPage() {
  const [phase, setPhase] = useState<Phase>("loading");
  const [name, setName] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [inClient, setInClient] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const token = params.get("token") ?? "";
        if (!token) {
          setPhase("error");
          setError("ลิงก์ไม่ถูกต้อง — ไม่พบรหัสเชื่อมบัญชี");
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

        const res = await fetch("/api/claim", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ accessToken, token }),
        });
        const data = (await res.json().catch(() => ({}))) as { ok?: boolean; name?: string; error?: string };
        if (cancelled) return;
        if (res.ok && data.ok) {
          setName(data.name ?? "");
          setPhase("ok");
        } else {
          setError(data.error ?? "เชื่อมบัญชีไม่สำเร็จ ลองใหม่อีกครั้ง");
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
              {phase === "login" ? "กำลังเข้าสู่ระบบ LINE…" : "กำลังเชื่อมบัญชีโครงการ…"}
            </p>
          </>
        ) : phase === "ok" ? (
          <>
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-success-bg text-3xl text-success-fg">
              ✓
            </div>
            <h1 className="text-xl font-bold text-ink">เชื่อมบัญชีสำเร็จ</h1>
            {name ? (
              <p className="mt-2 text-sm text-ink-soft">
                บัญชี <span className="font-semibold text-ink">{name}</span> เชื่อมกับ LINE ของคุณแล้ว
              </p>
            ) : null}
            <p className="mt-3 text-xs text-ink-soft">
              ต่อไปเมื่อเข้าใช้งานผ่าน LINE คุณจะเข้าสู่บัญชีโครงการนี้โดยอัตโนมัติ ✅
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
            <h1 className="text-lg font-bold text-ink">เชื่อมบัญชีไม่สำเร็จ</h1>
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
