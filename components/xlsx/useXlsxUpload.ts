"use client";

import { useState } from "react";

/**
 * Shared upload machinery for the "download template → fill offline → upload" Excel cards. Handles the
 * FormData POST, the `res.json().catch(() => ({}))` parse, and the busy flag; the caller formats its own
 * success message from the returned `data`. Extracted from the two near-identical simple XlsxCards
 * (MonthlyXlsxCard / LocationXlsxCard). See AUDIT.md.
 */
export function useXlsxUpload(opts: { endpoint: string; projectId: string; meName?: string }) {
  const [busy, setBusy] = useState(false);

  /** POST the file; resolves `{ ok, data }` where ok = HTTP-ok AND data.ok === true. */
  const upload = async (file: File): Promise<{ ok: boolean; data: Record<string, unknown> }> => {
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("projectId", opts.projectId);
      if (opts.meName != null) fd.append("editedBy", opts.meName);
      const res = await fetch(opts.endpoint, { method: "POST", body: fd });
      const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
      return { ok: res.ok && data.ok === true, data };
    } finally {
      setBusy(false);
    }
  };

  return { busy, upload };
}
