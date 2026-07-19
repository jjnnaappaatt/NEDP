/**
 * "Special projects" = a PER-USER presentation bundle over ≥2 real projects. A user who is registered to
 * ALL member projects sees them collapsed into one special project on their OWN console (submit / dashboard
 * / status / reports); admin, other users, and single-registrants see the member projects normally. Data
 * stays in each member project's own tables (separate DBs) — the bundle is view-only + a convenience
 * "enter once, write to both" entry. Config-only (no DB): edit the constant below to add a bundle.
 */
export interface SpecialProject {
  /** raw bundle id (no prefix), e.g. "smart" */
  id: string;
  name: string;
  /** projects.id uuids of the members */
  memberIds: string[];
  /** source_project_id ints (for LINE web_line_subscribe auto-register) — parallel to memberIds */
  memberSourceIds: number[];
  /** the secret LINE-bot command that auto-registers the sender to all members */
  secretCode: string;
  /** questionnaire modules the merged entry collects (the full screening) */
  modules: string[];
}

/** SMART = Fall (source 10) + BMD/Nutrition (source 9) — the same elderly screening branched into two projects. */
export const SPECIAL_PROJECTS: SpecialProject[] = [
  {
    id: "smart",
    name: "โครงการสูงวัย SMART (หกล้ม · กระดูก · โภชนาการ)",
    memberIds: ["68a3a304-dd4d-49eb-a1a9-56851343af12", "ca891baf-3863-447f-84e9-14933c0f098e"],
    memberSourceIds: [10, 9],
    secretCode: "smart",
    modules: ["fall", "bmd", "nutrition"],
  },
];

const BUNDLE_PREFIX = "special:";

/** The synthetic project id a bundle presents as (e.g. "special:smart"). */
export function bundleProjectId(rawId: string): string {
  return `${BUNDLE_PREFIX}${rawId}`;
}

export function isBundleId(id: string): boolean {
  return typeof id === "string" && id.startsWith(BUNDLE_PREFIX);
}

/** Resolve a bundle from either its raw id ("smart") or its synthetic project id ("special:smart"). */
export function bundleById(id: string): SpecialProject | null {
  const raw = isBundleId(id) ? id.slice(BUNDLE_PREFIX.length) : id;
  return SPECIAL_PROJECTS.find((b) => b.id === raw) ?? null;
}

/** The bundle that a set of registered project ids FULLY covers (all members present), or null. */
export function bundleForRegs(regProjectIds: readonly string[]): SpecialProject | null {
  const set = new Set(regProjectIds);
  return SPECIAL_PROJECTS.find((b) => b.memberIds.every((m) => set.has(m))) ?? null;
}

/** The bundle whose secret code matches (case-insensitive), or null. */
export function bundleForSecret(code: string): SpecialProject | null {
  const c = code.trim().toLowerCase();
  return SPECIAL_PROJECTS.find((b) => b.secretCode.toLowerCase() === c) ?? null;
}

/** For routes/exports that need ONE real project id, resolve a bundle id to its primary member; pass real
 *  ids through. (The primary member holds the full-copy data for merged-entered persons.) */
export function resolveToRealProject(id: string): string {
  const b = bundleById(id);
  return b ? b.memberIds[0] : id;
}

/** Map bundle ids in a list to their PRIMARY member (deduped); pass real project ids through. Use before a
 *  call that hits a real-project RPC/table (e.g. aai_rollup_snapshots p_project_ids). Resolving to the
 *  primary (not aggregating both members) avoids double-counting merged persons written to both projects. */
export function expandProjectIds(ids: readonly string[]): string[] {
  return [...new Set(ids.map((id) => resolveToRealProject(id)))];
}
