/**
 * Audit-log writer (spec §0 traceability / §5.3). Mock no-op now — Phase 2 writes to the
 * Supabase submission_audit_log table (before/after JSON, changed_by, ip, user_agent).
 */
export interface AuditEntry {
  action: "create" | "update" | "submit" | "approve" | "reject";
  submissionId?: string;
  before?: unknown;
  after?: unknown;
  changedBy: string;
  changedAt: string;
}

const log: AuditEntry[] = [];

export function recordAudit(e: Omit<AuditEntry, "changedAt"> & { changedAt?: string }): AuditEntry {
  const entry: AuditEntry = { ...e, changedAt: e.changedAt ?? "" };
  log.push(entry);
  return entry;
}

export function getAuditLog(): readonly AuditEntry[] {
  return log;
}
