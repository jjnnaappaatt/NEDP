"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { IconSearch } from "@tabler/icons-react";
import { Sheet } from "@/components/ui/Sheet";
import { fieldCls } from "@/components/portal/fieldStyles";

type Proj = { id: string; name: string; org: string };

/** Top-bar search: find a project by name → jump to its ส่งข้อมูล. Project list is fetched once on open. */
export function GlobalSearch() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [projects, setProjects] = useState<Proj[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [q, setQ] = useState("");

  useEffect(() => {
    if (!open || loaded) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/search/projects");
        const j = await res.json();
        if (!cancelled) { setProjects(j.projects ?? []); setLoaded(true); }
      } catch {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => { cancelled = true; };
  }, [open, loaded]);

  const s = q.trim();
  const matches = s ? projects.filter((p) => p.name.includes(s) || p.org.includes(s)) : projects;
  const go = (id: string) => { setOpen(false); setQ(""); router.push(`/submit/${id}`); };

  return (
    <>
      <button aria-label="ค้นหาโครงการ" onClick={() => setOpen(true)}
        className="grid h-11 w-11 place-items-center rounded-full text-ink-soft hover:bg-surface-soft">
        <IconSearch size={20} />
      </button>
      <Sheet open={open} onClose={() => setOpen(false)} title="ค้นหาโครงการ">
        <div className="space-y-3">
          <div className="relative">
            <IconSearch size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
            <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} className={`${fieldCls} pl-9`}
              placeholder="พิมพ์ชื่อโครงการ…" />
          </div>
          {!loaded ? (
            <p className="py-4 text-center text-sm text-ink-muted">กำลังโหลด…</p>
          ) : !matches.length ? (
            <p className="card p-6 text-center text-sm text-ink-soft">ไม่พบโครงการ</p>
          ) : (
            <div className="max-h-[55vh] space-y-1.5 overflow-auto">
              {matches.slice(0, 50).map((p) => (
                <button key={p.id} onClick={() => go(p.id)}
                  className="card flex w-full items-center gap-2 p-3 text-left transition hover:border-border-accent hover:bg-accent-soft/30">
                  <div className="min-w-0">
                    <div className="line-clamp-2 text-sm font-medium text-ink">{p.name}</div>
                    {p.org && <div className="truncate text-xs text-ink-muted">{p.org}</div>}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </Sheet>
    </>
  );
}
