"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { LiffProvider } from "@/components/line/LiffProvider";
import { TopBar } from "./TopBar";
import { SideNav } from "./SideNav";
import { BottomTabBar } from "./BottomTabBar";
import { RouteProgress } from "./RouteProgress";
import type { Account } from "@/types";

/**
 * Chooses the page chrome by route. Under `/admin*` we render the children bare — the admin area owns its
 * own shell (AdminShell) and must NOT show the LINE-user TopBar/SideNav/ส่งข้อมูล nav. `/manual` is the
 * public guide website: full-bleed, its own sticky nav, no LINE login — so it renders bare too. Everywhere
 * else we render the normal user shell. (A pathname switch here avoids moving every route into a route group.)
 */
export function AppChrome({ me, children }: { me: Account; children: ReactNode }) {
  const path = usePathname();
  if (path === "/admin" || path?.startsWith("/admin/")) return <>{children}</>;
  if (path === "/manual" || path?.startsWith("/manual/")) return <>{children}</>;

  return (
    <LiffProvider>
      <RouteProgress />
      <div className="min-h-screen">
        <TopBar me={me} />
        <div className="mx-auto flex w-full max-w-[1100px] gap-6 sm:px-4">
          <SideNav />
          <main className="min-w-0 flex-1 px-4 pb-28 pt-4 sm:px-0 sm:pb-12">
            <div className="mx-auto w-full max-w-content">{children}</div>
          </main>
        </div>
        <BottomTabBar />
      </div>
    </LiffProvider>
  );
}
