"use client";

import {
  createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode,
} from "react";
import { usePathname, useRouter } from "next/navigation";

export type LineProfile = { userId: string; displayName: string; pictureUrl: string | null };
export type LineAccount = { id: string; name: string; org?: string; avatarColor: string };

type LiffState = {
  ready: boolean;
  inClient: boolean;
  profile: LineProfile | null;
  account: LineAccount | null;
  error: string | null;
};

type LiffApi = LiffState & {
  /** Open an EXTERNAL url — uses liff.openWindow inside LINE (where target=_blank is blocked). */
  openExternal: (url: string) => void;
  /** Imperative LINE login — for flows that genuinely need the LINE userId (link / register /
   *  subscribe). Pass `redirectUri` (e.g. the current page) so a browser login returns here. Never
   *  called on mount (a redirect during hydration made mobile hang). No-op when already logged in. */
  login: (opts?: { redirectUri?: string }) => void;
};

const initial: LiffState = {
  ready: false,
  inClient: false,
  profile: null,
  account: null,
  error: null,
};

const fallbackOpenExternal = (url: string) => {
  if (typeof window !== "undefined") window.open(url, "_blank", "noopener,noreferrer");
};

const LiffContext = createContext<LiffApi>({ ...initial, openExternal: fallbackOpenExternal, login: () => {} });
export const useLiff = () => useContext(LiffContext);

/** Same-origin paths only (open-redirect guard), mirroring app/page.tsx. */
function safeInternalPath(value: string | null): string | null {
  if (!value) return null;
  let p: string;
  try {
    p = decodeURIComponent(value);
  } catch {
    return null;
  }
  if (!p.startsWith("/") || p.startsWith("//")) return null;
  return p;
}

/**
 * Wraps the app with LINE/LIFF awareness — **strictly additive**: in a normal browser (no LIFF id,
 * or not opened inside LINE) it is a silent no-op and the app uses its server-rendered identity.
 * Also (1) honors a `liff.state`/`to` deep-link path if one ever reaches a page client-side (the
 * server root handles the common case), and (2) exposes openExternal for LINE-safe external links.
 */
export function LiffProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<LiffState>(initial);
  const liffRef = useRef<unknown>(null);
  const refreshedRef = useRef(false); // refresh server avatars at most once after the first link
  const router = useRouter();
  const pathname = usePathname();

  // Belt-and-suspenders deep-link router: if a page still carries liff.state/to in its URL, route to
  // it. The server-side root (app/page.tsx) handles the normal endpoint=root case; this covers any
  // other landing page. Idempotent — only replaces when the target path differs from the current one.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const target = safeInternalPath(params.get("liff.state")) ?? safeInternalPath(params.get("to"));
    if (target && target.split("?")[0] !== pathname) router.replace(target);
  }, [pathname, router]);

  useEffect(() => {
    const liffId = process.env.NEXT_PUBLIC_LIFF_ID;
    if (!liffId) return; // LINE not configured → standalone web, no-op.

    let cancelled = false;
    (async () => {
      try {
        const liff = (await import("@line/liff")).default;
        liffRef.current = liff;
        await liff.init({ liffId });
        const inClient = liff.isInClient();

        if (!liff.isLoggedIn()) {
          // Do NOT redirect to LINE login on mount. A navigation here lands mid-hydration and makes
          // the LINE/iOS WebView hold the first paint (blank skeleton until you tap). Inside LINE the
          // user is normally already logged in (LINE grants the session on consent); the rare not-
          // logged-in case browses on the server cookie identity and can call login() on demand.
          if (!cancelled) setState({ ...initial, ready: true, inClient });
          return;
        }

        const accessToken = liff.getAccessToken();
        if (!accessToken) {
          if (!cancelled) setState({ ...initial, ready: true, inClient });
          return;
        }

        const res = await fetch("/api/line/link", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ accessToken }),
        });
        // Surface a failed link instead of swallowing it. A silent `null` here is exactly what turned
        // any link failure — a channel-id 401, a missing-secret 500 — into a mute "not logged in" loop
        // (the button re-opens LINE, comes back, still guest, no reason shown). Now the real status
        // reaches the connect UI and the console so the cause is diagnosable.
        let data: { line?: LineProfile | null; account?: LineAccount | null } | null = null;
        let linkError: string | null = null;
        if (res.ok) {
          data = await res.json();
        } else {
          const body = (await res.json().catch(() => null)) as { error?: string } | null;
          linkError = `เชื่อมต่อ LINE ไม่สำเร็จ (${res.status}): ${body?.error ?? res.statusText}`;
          console.warn("[LIFF] /api/line/link failed", res.status, body);
        }
        if (!cancelled) {
          setState({
            ready: true,
            inClient,
            profile: data?.line ?? null,
            account: data?.account ?? null,
            error: linkError,
          });
          // The picture_url is persisted by /api/line/link AFTER the response, so the page was
          // server-rendered with the old (no-photo) avatar. Re-fetch RSC ONCE so the TopBar/profile
          // avatar updates immediately instead of only on the next manual refresh.
          if (data?.account && !refreshedRef.current) {
            refreshedRef.current = true;
            router.refresh();
          }
        }
      } catch (e) {
        if (!cancelled) {
          setState({ ...initial, ready: true, error: e instanceof Error ? e.message : "liff error" });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const openExternal = useCallback((url: string) => {
    const liff = liffRef.current as
      | { isInClient?: () => boolean; openWindow?: (o: { url: string; external: boolean }) => void }
      | null;
    try {
      if (liff?.isInClient?.() && liff.openWindow) {
        liff.openWindow({ url, external: true });
        return;
      }
    } catch {
      /* fall through to a normal new tab */
    }
    fallbackOpenExternal(url);
  }, []);

  const login = useCallback((opts?: { redirectUri?: string }) => {
    const liff = liffRef.current as
      | { isLoggedIn?: () => boolean; login?: (o?: { redirectUri?: string }) => void }
      | null;
    try {
      if (liff?.login && !liff.isLoggedIn?.()) {
        liff.login(opts?.redirectUri ? { redirectUri: opts.redirectUri } : undefined);
      }
    } catch {
      /* no-op outside LINE */
    }
  }, []);

  return <LiffContext.Provider value={{ ...state, openExternal, login }}>{children}</LiffContext.Provider>;
}
