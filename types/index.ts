/**
 * Canonical types — mirror the Supabase schema (see supabase/schema.sql). The app can run
 * mock-backed or Supabase-backed behind these same types (NEXT_PUBLIC_DATA_SOURCE). ids are
 * strings; year_month is Gregorian 'YYYY-MM' (Thai labels at render time).
 */

export type Role = "owner" | "submitter" | "viewer";
export type SubmissionStatus = "draft" | "submitted" | "approved" | "rejected";
export type PointEventType = "early" | "ontime" | "complete" | "late" | "edit_penalty";

export interface Account {
  id: string;
  name: string;
  org?: string;
  /** tailwind-friendly hex for the avatar ring/initials chip */
  avatarColor: string;
  isMe?: boolean;
  /** stable 1..N ordinal for the pseudo 'project' accounts → a unique, stable emoji per project */
  sourceProjectId?: number;
  /** LINE profile picture URL — rendered by Avatar in place of the emoji disc when present */
  pictureUrl?: string;
}

export interface Project {
  id: string;
  name: string;
  org: string;
  researcher: string;
  /** deadline day-of-month for monthly submission */
  deadlineDay: number;
  /** accent hex used on the project hero + cards */
  accent: string;
  /** admin-chosen registered contact whose LINE picture represents this project on the leaderboard */
  avatarAccountId?: string;
  /** the project's หัวหน้าโครงการ (approved by admin); also drives the leaderboard avatar */
  headAccountId?: string;
}

/** One member of a project + their recent activity — shown to the หัวหน้าโครงการ (head). */
export interface MemberBehavior {
  account: Account;
  /** distinct locations this member submitted in the current month */
  submitted: number;
  /** the project's current location count */
  total: number;
  /** ISO timestamp of their most recent submit/draft this month, if any */
  lastActiveAt?: string;
}

/** The team view for a project: who the head is, the member roster + behavior, and my own
 *  eligibility to request to become head (drives the request button's state). */
export interface ProjectTeam {
  head: Account | null;
  members: MemberBehavior[];
  myStatus: "can_request" | "pending" | "has_head" | "not_member" | "not_linked";
  iAmHead: boolean;
}

/** A field-deployment area (พื้นที่ลงพื้นที่) the project must report on, per month. */
export interface ProjectLocation {
  id: string;
  projectId: string;
  province: string;
  amphoe: string;
  tambon: string;
  /** TIS-1099 6-digit tambon code (null when the free-text location isn't mapped yet). */
  tambonCode?: string | null;
}

/** Per-location monthly submission. A project is "done" only when ALL its locations are submitted. */
export interface LocationSubmission {
  projectId: string;
  accountId: string;
  locationId: string;
  yearMonth: string;
  status: "submitted" | "draft" | "not_started";
  submittedAt?: string;
}

/** Audited verification of a project's location list (who + when); editable / re-verifiable. */
export interface LocationVerification {
  projectId: string;
  verifiedBy: string;
  verifiedAt: string;
  /** verified AND no approved edit-window open → editing the list needs admin approval (ขอแก้ไขพื้นที่). */
  editLocked?: boolean;
  /** an edit request is pending admin approval. */
  editRequested?: boolean;
}

/** One entry in a project's location-edit audit trail (rename/add/delete/verify). */
export interface LocationAuditEntry {
  action: "rename" | "add" | "delete" | "verify" | string;
  before: { province?: string; amphoe?: string; tambon?: string } | null;
  after: { province?: string; amphoe?: string; tambon?: string } | null;
  changedBy: string | null;
  changedAt: string;
}

export interface ProjectAccountRegistration {
  id: string;
  projectId: string;
  accountId: string;
  role: Role;
  registeredAt: string; // ISO
}

export interface Submission {
  id: string;
  projectId: string;
  accountId: string;
  yearMonth: string; // 'YYYY-MM'
  status: SubmissionStatus;
  /** day-of-month the round opened on day 1; used by the point engine */
  submittedDay?: number;
  submittedAt?: string; // ISO
  completionPct: number; // 0..100
  edits?: number; // edits after submit (penalty)
}

export interface PointEvent {
  id: string;
  accountId: string;
  projectId: string;
  yearMonth: string;
  type: PointEventType;
  points: number;
  createdAt: string;
}

export interface MonthlyRanking {
  yearMonth: string;
  rank: number; // 1..3
  accountId: string;
  projectId: string;
  totalPoints: number;
  submittedAt?: string;
}

export interface AccountFollow {
  followerId: string;
  followingId: string;
}

export interface IssueReport {
  id: string;
  type: string;
  description: string;
  email?: string;
  status: "open" | "in_progress" | "resolved";
  ticket: string;
  createdAt: string;
}

export type TemplateFieldType = "text" | "number" | "date" | "select" | "textarea" | "file";

export interface TemplateField {
  id: string;
  sectionId: string;
  label: string;
  type: TemplateFieldType;
  required?: boolean;
  options?: string[];
  placeholder?: string;
  help?: string;
  unit?: string;
}

export interface TemplateSection {
  id: string;
  title: string;
}

export interface ProjectTemplate {
  projectId: string;
  sections: TemplateSection[];
  fields: TemplateField[];
}

/** Derived view types (shared by the data layer + screens). */
export interface MyProjectStatus {
  project: Project;
  submission?: Submission;
  status: SubmissionStatus | "not_started";
  points?: number;
  locationsDone: number;
  locationsTotal: number;
}

export interface LocationStatus {
  location: ProjectLocation;
  submitted: boolean;
  submittedAt?: string;
}

export interface FeedItem {
  account: Account;
  project: Project;
  points: number;
  submittedAt?: string;
}

export interface DashboardSummary {
  projectCount: number;
  submittedThisMonth: number;
  totalAccounts: number;
  myRank?: number;
  myPoints: number;
  nextDeadlineDays: number;
  nextDeadlineProject?: Project;
  feed: FeedItem[];
}

/** Derived: one ranked row (per account×project for the month). */
export interface Standing {
  rank: number;
  account: Account;
  project: Project;
  totalPoints: number;
  submittedAt?: string;
  submittedDay?: number;
  isMe: boolean;
  isFollowed: boolean;
}
