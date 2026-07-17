"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { IconShieldLock, IconLock } from "@tabler/icons-react";

/** Shared-password admin login (LINE-independent). Dark "landing" aesthetic — a teal top-glow over near-black,
 *  a gradient icon tile, the NEDP pill, and a white pill button. On success the API sets the signed admin
 *  cookie and we navigate to /admin; middleware then lets the request through. Renders bare (no app shell). */
export default function AdminLoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        router.replace("/admin");
        router.refresh();
      } else {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        setError(j.error ?? "เข้าสู่ระบบไม่สำเร็จ");
      }
    } catch {
      setError("เกิดข้อผิดพลาด ลองใหม่อีกครั้ง");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative grid min-h-screen place-items-center overflow-hidden bg-[#0a0e0d] px-4 py-10">
      {/* teal aurora glow at the top, fading to near-black */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[50vh]"
        style={{ background: "radial-gradient(75% 100% at 50% 0%, rgba(26,166,115,0.42), rgba(10,14,13,0) 70%)" }}
      />
      <form
        onSubmit={submit}
        className="relative z-10 w-full max-w-sm space-y-6 rounded-[28px] border border-white/10 bg-[#14181a]/95 p-7 shadow-2xl backdrop-blur sm:p-8"
      >
        <div className="flex flex-col items-center gap-3 text-center">
          <span className="grid h-16 w-16 place-items-center rounded-[20px] bg-gradient-to-br from-[#34d399] to-[#1ba673] shadow-lg shadow-[#1ba673]/30">
            <IconShieldLock size={30} stroke={1.8} className="text-[#08160f]" />
          </span>
          <span className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-1 text-[11px] font-semibold tracking-[0.18em] text-white/70">
            NEDP ADMIN
          </span>
          <div className="space-y-1">
            <h1 className="font-display text-[22px] font-bold leading-tight text-white">พอร์ทัลผู้ดูแลระบบ</h1>
            <p className="text-sm leading-relaxed text-white/55">
              ภาพรวมและการจัดการทุกโครงการ
              <br />
              22 โครงการมุ่งเป้าสูงวัย ปี 68
            </p>
          </div>
        </div>

        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-white/70">รหัสผ่านผู้ดูแลระบบ</span>
          <input
            type="password"
            value={password}
            autoFocus
            autoComplete="current-password"
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-[15px] text-white placeholder-white/25 outline-none transition focus:border-[#34d399] focus:ring-2 focus:ring-[#34d399]/30"
          />
        </label>

        {error && <p className="text-sm font-medium text-[#fb7185]">{error}</p>}

        <button
          type="submit"
          disabled={loading || !password}
          className="w-full rounded-full bg-white py-3 text-[15px] font-bold text-[#0a0e0d] transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "กำลังตรวจสอบ…" : "เข้าสู่ระบบ →"}
        </button>

        <p className="flex items-center justify-center gap-1.5 text-center text-xs text-white/40">
          <IconLock size={13} /> เข้าถึงเฉพาะผู้ได้รับอนุญาต
        </p>
      </form>
    </div>
  );
}
