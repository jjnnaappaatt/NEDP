/**
 * Data-access layer — server-only (uses the Supabase service-role key). Client components must NOT
 * import this; server components/routes reach it via `lib/data/index.ts`.
 *
 * PURE BARREL: the implementation was split into cohesive domain modules under `./sb/*` behind a
 * shared `./sb/_core` (one-way: domain → _core, acyclic). This file re-exports the identical value +
 * type surface it exposed before the split, so `lib/data/index.ts` (the only importer) is untouched.
 */
import "server-only";

export * from "./sb/accounts";
export * from "./sb/locations";
export * from "./sb/aai";
export * from "./sb/questionnaire";
export * from "./sb/admin";
export * from "./sb/dashboard";
export * from "./sb/reminders";
export * from "./sb/export";
export * from "./sb/activity";

// Members that live in the shared _core (not re-exported via `export *` above): the one function that
// was public before the split, plus the exported types whose _core helpers depend on them.
export { isProjectContact, isIntegrationEnabled } from "./sb/_core";
export type { PersonRow, ReminderType, MonitorSettings } from "./sb/_core";
