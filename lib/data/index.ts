/**
 * Data-access layer — server-only (uses the Supabase service-role key). Client components must
 * NOT import this; they receive data as props from server components and format via @/lib/format.
 * Picks the mock or Supabase implementation by NEXT_PUBLIC_DATA_SOURCE.
 */
import "server-only";
import * as mock from "./mock";
import * as sb from "./supabase";
import { USE_SUPABASE } from "@/lib/supabase/server";
import type {
  Account, DashboardSummary, IssueReport, LocationAuditEntry, LocationStatus, LocationVerification,
  MyProjectStatus, Project, ProjectLocation, ProjectTeam, ProjectTemplate, Standing,
} from "@/types";

export type { MyProjectStatus, LocationStatus, DashboardSummary } from "@/types";
import type { OrgProjectStatus, OrgSummary, DimensionStat } from "./supabase";
export type { OrgProjectStatus, OrgSummary, DimensionStat } from "./supabase";

export async function getMe(): Promise<Account> {
  return USE_SUPABASE ? sb.getMe() : mock.getMe();
}
export async function getAccounts(): Promise<Account[]> {
  return USE_SUPABASE ? sb.getAccounts() : mock.getAccounts();
}
export async function getProjects(): Promise<Project[]> {
  return USE_SUPABASE ? sb.getProjects() : mock.getProjects();
}
export async function getProject(id: string): Promise<Project | undefined> {
  return USE_SUPABASE ? sb.getProject(id) : mock.getProject(id);
}
export async function getFollowingIds(): Promise<Set<string>> {
  return USE_SUPABASE ? sb.getFollowingIds() : mock.getFollowingIds();
}
export async function getTemplate(projectId: string): Promise<ProjectTemplate> {
  return USE_SUPABASE ? sb.getTemplate(projectId) : mock.getTemplate(projectId);
}
export async function getLocations(projectId: string): Promise<ProjectLocation[]> {
  return USE_SUPABASE ? sb.getLocations(projectId) : mock.getLocations(projectId);
}
export async function getLocationStatuses(projectId: string, month?: string): Promise<LocationStatus[]> {
  return USE_SUPABASE ? sb.getLocationStatuses(projectId, month) : mock.getLocationStatuses(projectId, month);
}
export async function getLatestSubmissionData(projectId: string, month?: string): Promise<Map<string, Record<string, string>>> {
  return USE_SUPABASE ? sb.getLatestSubmissionData(projectId, month) : new Map();
}
export async function getLocationVerification(projectId: string): Promise<LocationVerification | null> {
  return USE_SUPABASE ? sb.getLocationVerification(projectId) : mock.getLocationVerification(projectId);
}
export async function getMyProjects(month?: string): Promise<MyProjectStatus[]> {
  return USE_SUPABASE ? sb.getMyProjects(month) : mock.getMyProjects(month);
}
export async function getLeaderboard(month?: string): Promise<Standing[]> {
  return USE_SUPABASE ? sb.getLeaderboard(month) : mock.getLeaderboard(month);
}
export async function getSpeedLeaderboard(month?: string): Promise<Standing[]> {
  return USE_SUPABASE ? sb.getSpeedLeaderboard(month) : mock.getSpeedLeaderboard(month);
}
export async function getHistoryMonths(): Promise<string[]> {
  return USE_SUPABASE ? sb.getHistoryMonths() : mock.getHistoryMonths();
}
export async function getMonthlyHistory(month: string): Promise<Standing[]> {
  return USE_SUPABASE ? sb.getMonthlyHistory(month) : mock.getMonthlyHistory(month);
}
export async function getDashboardSummary(month?: string): Promise<DashboardSummary> {
  return USE_SUPABASE ? sb.getDashboardSummary(month) : mock.getDashboardSummary(month);
}
export async function submitIssue(input: { type: string; description: string; email?: string; screenshotPath?: string }): Promise<IssueReport> {
  return USE_SUPABASE ? sb.submitIssue(input) : mock.submitIssue(input);
}
export async function submitLocation(
  input: { projectId: string; locationId: string; values: Record<string, string> },
): Promise<{ ok: boolean; error?: string }> {
  return USE_SUPABASE ? sb.submitLocation(input) : mock.submitLocation(input);
}
export async function bulkSubmitLocations(
  input: { projectId: string; rows: { locationId: string; values: Record<string, string> }[] },
): Promise<{ ok: boolean; saved: number; error?: string }> {
  return USE_SUPABASE ? sb.bulkSubmitLocations(input) : mock.bulkSubmitLocations(input);
}
export async function isProjectContact(projectId: string): Promise<boolean> {
  return USE_SUPABASE ? sb.isProjectContact(projectId) : mock.isProjectContact(projectId);
}
export async function isIntegrationEnabled(projectId: string): Promise<boolean> {
  return USE_SUPABASE ? sb.isIntegrationEnabled(projectId) : false;
}
export async function getMyContact(): Promise<{ name: string; phone: string; org: string; email: string; hasContact: boolean; lineLinked: boolean }> {
  if (USE_SUPABASE) return sb.getMyContact();
  const m = await mock.getMyContact();
  return { ...m, org: "", email: "", lineLinked: false };
}
export async function setMyContact(input: { name: string; phone: string; org?: string; email?: string }): Promise<{ ok: boolean }> {
  return USE_SUPABASE ? sb.setMyContact(input) : mock.setMyContact(input);
}
export async function getRegisteredProjectIds(): Promise<Set<string>> {
  return USE_SUPABASE ? sb.getRegisteredProjectIds() : mock.getRegisteredProjectIds();
}
export async function registerForProject(projectId: string): Promise<{ ok: boolean; error?: string }> {
  return USE_SUPABASE ? sb.registerForProject(projectId) : mock.registerForProject(projectId);
}
export async function getProjectTeam(projectId: string): Promise<ProjectTeam> {
  return USE_SUPABASE ? sb.getProjectTeam(projectId) : { head: null, members: [], myStatus: "not_member", iAmHead: false };
}
export async function requestToBeHead(projectId: string): Promise<{ ok: boolean; error?: string }> {
  return USE_SUPABASE ? sb.requestToBeHead(projectId) : { ok: true };
}
export async function requestIntegration(projectId: string, note?: string): Promise<{ ok: boolean; error?: string }> {
  return USE_SUPABASE ? sb.requestIntegration(projectId, note) : { ok: true };
}
export async function getIntegrationStatus(projectId: string): Promise<{ enabled: boolean; pending: boolean }> {
  return USE_SUPABASE ? sb.getIntegrationStatus(projectId) : { enabled: false, pending: false };
}
export async function verifyLocations(
  input: { projectId: string; verifiedBy: string },
): Promise<{ ok: boolean; error?: string }> {
  return USE_SUPABASE ? sb.verifyLocations(input) : mock.verifyLocations(input);
}
export async function saveLocations(
  input: {
    projectId: string;
    locations: { id: string; province: string; amphoe: string; tambon: string }[];
    editedBy?: string;
  },
): Promise<{ ok: boolean; blocked?: string[]; error?: string }> {
  return USE_SUPABASE ? sb.saveLocations(input) : mock.saveLocations(input);
}
export async function getLocationAudit(projectId: string): Promise<LocationAuditEntry[]> {
  return USE_SUPABASE ? sb.getLocationAudit(projectId) : mock.getLocationAudit(projectId);
}
export async function getMyLocationSubmissions(
  projectId: string, month?: string,
): Promise<Map<string, { id: string; status: string; data: Record<string, string>; locked: boolean; editRequested: boolean }>> {
  return USE_SUPABASE ? sb.getMyLocationSubmissions(projectId, month) : new Map();
}
export async function saveDraftLocation(
  input: { projectId: string; locationId: string; values: Record<string, string> },
): Promise<{ ok: boolean; error?: string }> {
  return USE_SUPABASE ? sb.saveDraftLocation(input) : { ok: true };
}
export async function requestEditLocation(
  input: { projectId: string; locationId: string },
): Promise<{ ok: boolean; error?: string }> {
  return USE_SUPABASE ? sb.requestEditLocation(input) : { ok: true };
}
export async function requestEditLocations(projectId: string): Promise<{ ok: boolean; error?: string }> {
  return USE_SUPABASE ? sb.requestEditLocations(projectId) : { ok: true };
}
export async function getEditRequests(): Promise<sb.EditRequest[]> {
  return USE_SUPABASE ? sb.getEditRequests() : [];
}
export async function approveEditRequest(kind: "monthly" | "location", id: string) {
  return USE_SUPABASE ? sb.approveEditRequest(kind, id) : { ok: false, error: "mock" };
}
export async function rejectEditRequest(kind: "monthly" | "location", id: string) {
  return USE_SUPABASE ? sb.rejectEditRequest(kind, id) : { ok: false, error: "mock" };
}
export async function unregisterForProject(projectId: string): Promise<{ ok: boolean; error?: string }> {
  return USE_SUPABASE ? sb.unregisterForProject(projectId) : { ok: true };
}
export async function getOrgDashboardSummary(month?: string): Promise<OrgSummary> {
  return USE_SUPABASE ? sb.getOrgDashboardSummary(month)
    : { projectCount: 0, submittedProjects: 0, totalAccounts: 0, submittedLocations: 0, avgCompletionPct: 0 };
}
export async function getAllProjectStatuses(month?: string): Promise<OrgProjectStatus[]> {
  return USE_SUPABASE ? sb.getAllProjectStatuses(month) : [];
}
export type { AdminProjectSummary } from "./supabase";
export async function getAdminProjectSummaries(month?: string): Promise<sb.AdminProjectSummary[]> {
  return USE_SUPABASE ? sb.getAdminProjectSummaries(month) : [];
}
export async function getDimensionSummary(month?: string): Promise<DimensionStat[]> {
  return USE_SUPABASE ? sb.getDimensionSummary(month) : [];
}
export type { TambonDimensionRow } from "./supabase";
export async function getTambonDimensionSummary(month?: string, projectId?: string): Promise<sb.TambonDimensionRow[]> {
  return USE_SUPABASE ? sb.getTambonDimensionSummary(month, projectId) : [];
}

// ── General individual-entry portal ──────────────────────────────────────────
export type { GeoNode, PersonRow, AaiLevel, AaiSnapshotRow, BulkPersonRow } from "./supabase";
export async function getProvinces(): Promise<sb.GeoNode[]> {
  return USE_SUPABASE ? sb.getProvinces() : [];
}
export async function getAmphoes(provinceCode: string): Promise<sb.GeoNode[]> {
  return USE_SUPABASE ? sb.getAmphoes(provinceCode) : [];
}
export async function getTambons(amphoeCode: string): Promise<sb.GeoNode[]> {
  return USE_SUPABASE ? sb.getTambons(amphoeCode) : [];
}
export async function getGeoPath(tambonCode: string): ReturnType<typeof sb.getGeoPath> {
  return USE_SUPABASE ? sb.getGeoPath(tambonCode) : null;
}
export async function searchPersons(
  projectId: string, opts?: { query?: string; tambonCode?: string; limit?: number },
): Promise<sb.PersonRow[]> {
  return USE_SUPABASE ? sb.searchPersons(projectId, opts) : [];
}
export async function getPersonName(personId: string): Promise<string | null> {
  return USE_SUPABASE ? sb.getPersonName(personId) : null;
}
export type { TambonPersonDetail } from "./supabase";
export async function getTambonPersons(tambonCode: string, projectIds: string[], query?: string): Promise<sb.PersonRow[]> {
  return USE_SUPABASE ? sb.getTambonPersons(tambonCode, projectIds, query) : [];
}
export async function getTambonPersonDetail(personId: string): Promise<sb.TambonPersonDetail | null> {
  return USE_SUPABASE ? sb.getTambonPersonDetail(personId) : null;
}
export async function purgePerson(personId: string, projectId: string): Promise<{ ok: boolean; error?: string }> {
  return USE_SUPABASE ? sb.purgePerson(personId, projectId) : { ok: false, error: "mock" };
}
export async function enrollPerson(
  input: Parameters<typeof sb.enrollPerson>[0],
): Promise<{ ok: boolean; personId?: string; personCode?: string; error?: string }> {
  return USE_SUPABASE ? sb.enrollPerson(input) : { ok: false, error: "mock" };
}
export async function submitPersonAssessment(
  input: Parameters<typeof sb.submitPersonAssessment>[0],
): Promise<{ ok: boolean; overall?: number | null; error?: string }> {
  return USE_SUPABASE ? sb.submitPersonAssessment(input) : { ok: false, error: "mock" };
}
export async function bulkEnrollAssess(
  input: Parameters<typeof sb.bulkEnrollAssess>[0],
): Promise<{ ok: boolean; enrolled: number; assessed: number; failed: { index: number; error: string }[]; error?: string }> {
  return USE_SUPABASE ? sb.bulkEnrollAssess(input) : { ok: false, enrolled: 0, assessed: 0, failed: [], error: "mock" };
}
export async function upsertOsmCount(
  input: Parameters<typeof sb.upsertOsmCount>[0],
): Promise<{ ok: boolean; error?: string }> {
  return USE_SUPABASE ? sb.upsertOsmCount(input) : { ok: false, error: "mock" };
}
export async function getOsmCount(
  projectId: string, tambonCode: string, yearMonth?: string,
): ReturnType<typeof sb.getOsmCount> {
  return USE_SUPABASE ? sb.getOsmCount(projectId, tambonCode, yearMonth) : null;
}
export type { RawExport, ExportScope } from "./supabase";
export async function getRawExport(scope: sb.ExportScope): Promise<sb.RawExport> {
  if (!USE_SUPABASE) return { projectLabel: "", monthLabel: "", assessments: [], osm: [], submissions: [], roster: [], qAnswers: [], qAnswerCols: [], qScores: [], qScoreCols: [] };
  return sb.getRawExport(scope);
}
export async function getExportMonths(projectId: string): Promise<string[]> {
  return USE_SUPABASE ? sb.getExportMonths(projectId) : [];
}
export type { ProjectActivityItem } from "./supabase";
export async function getProjectActivity(
  projectId: string, opts?: { limit?: number },
): Promise<sb.ProjectActivityItem[]> {
  return USE_SUPABASE ? sb.getProjectActivity(projectId, opts) : [];
}
export async function canSeeTeamActivity(projectId: string): Promise<boolean> {
  return USE_SUPABASE ? sb.canSeeTeamActivity(projectId) : false;
}
export async function isProjectHead(projectId: string): Promise<boolean> {
  return USE_SUPABASE ? sb.isProjectHead(projectId) : false;
}
export type { HeadQuestionnaireRequest } from "./supabase";
export async function getHeadQuestionnaireRequests(projectId: string): Promise<sb.HeadQuestionnaireRequest[]> {
  return USE_SUPABASE ? sb.getHeadQuestionnaireRequests(projectId) : [];
}
export async function decideQuestionnaireRequestAsHead(requestId: string, action: "approve" | "reject") {
  return USE_SUPABASE ? sb.decideQuestionnaireRequestAsHead(requestId, action) : MOCK_FAIL;
}
export async function getAaiSnapshotSummary(
  input: Parameters<typeof sb.getAaiSnapshotSummary>[0],
): Promise<sb.AaiSnapshotRow[]> {
  return USE_SUPABASE ? sb.getAaiSnapshotSummary(input) : [];
}
export async function getMyPortalProjects(): Promise<sb.PickerProject[]> {
  return USE_SUPABASE ? sb.getMyPortalProjects() : [];
}
export type { ProvinceProjectProgress, PickerProject } from "./supabase";
export async function getProjectsInProvince(provinceCode: string): Promise<{ id: string; name: string }[]> {
  return USE_SUPABASE ? sb.getProjectsInProvince(provinceCode) : [];
}
export async function getProvinceProjectProgress(
  provinceCode: string, opts?: Parameters<typeof sb.getProvinceProjectProgress>[1],
): Promise<sb.ProvinceProjectProgress[]> {
  return USE_SUPABASE ? sb.getProvinceProjectProgress(provinceCode, opts) : [];
}

// ── Admin portal — monitor_* management ──────────────────────────────────────
export type { AdminProject, HeadRequest, MonitorSettings, AdminIssue, RegistrationGroup, EditRequest, IntegrationRequest } from "./supabase";
const MOCK_FAIL = { ok: false, error: "mock" } as const;
export async function getAdminProjects(): Promise<sb.AdminProject[]> {
  return USE_SUPABASE ? sb.getAdminProjects() : [];
}
export async function getProjectMembers(projectUuid: string): Promise<{ id: string; name: string }[]> {
  return USE_SUPABASE ? sb.getProjectMembers(projectUuid) : [];
}
export async function createMonitorProject(input: Parameters<typeof sb.createMonitorProject>[0]) {
  return USE_SUPABASE ? sb.createMonitorProject(input) : MOCK_FAIL;
}
export async function updateMonitorProject(pid: number, input: Parameters<typeof sb.updateMonitorProject>[1]) {
  return USE_SUPABASE ? sb.updateMonitorProject(pid, input) : MOCK_FAIL;
}
export async function deleteMonitorProject(pid: number) {
  return USE_SUPABASE ? sb.deleteMonitorProject(pid) : MOCK_FAIL;
}
export async function setProjectAvatar(sourcePid: number, accountId: string | null) {
  return USE_SUPABASE ? sb.setProjectAvatar(sourcePid, accountId) : MOCK_FAIL;
}
export async function setProjectHead(sourcePid: number, accountId: string | null, by?: string) {
  return USE_SUPABASE ? sb.setProjectHead(sourcePid, accountId, by) : MOCK_FAIL;
}
export async function getHeadRequests(): Promise<sb.HeadRequest[]> {
  return USE_SUPABASE ? sb.getHeadRequests() : [];
}
export async function approveHeadRequest(requestId: string, by?: string) {
  return USE_SUPABASE ? sb.approveHeadRequest(requestId, by) : MOCK_FAIL;
}
export async function rejectHeadRequest(requestId: string, by?: string) {
  return USE_SUPABASE ? sb.rejectHeadRequest(requestId, by) : MOCK_FAIL;
}
export async function getIntegrationRequests(): Promise<sb.IntegrationRequest[]> {
  return USE_SUPABASE ? sb.getIntegrationRequests() : [];
}
export async function approveIntegrationRequest(requestId: string, by?: string) {
  return USE_SUPABASE ? sb.approveIntegrationRequest(requestId, by) : MOCK_FAIL;
}
export async function rejectIntegrationRequest(requestId: string, by?: string) {
  return USE_SUPABASE ? sb.rejectIntegrationRequest(requestId, by) : MOCK_FAIL;
}
// ── Per-project questionnaires ──────────────────────────────────────────────────────────────────────
export async function listQuestionnaires(): Promise<sb.QuestionnaireInfo[]> {
  return USE_SUPABASE ? sb.listQuestionnaires() : [];
}
export async function getQuestionnaireSchema(id: string) {
  return USE_SUPABASE ? sb.getQuestionnaireSchema(id) : null;
}
export async function getProjectQuestionnaires(): Promise<sb.ProjectQuestionnaire[]> {
  return USE_SUPABASE ? sb.getProjectQuestionnaires() : [];
}
export async function assignQuestionnaire(projectId: string, questionnaireId: string, modules: string[], by?: string) {
  return USE_SUPABASE ? sb.assignQuestionnaire(projectId, questionnaireId, modules, by) : MOCK_FAIL;
}
export async function unassignQuestionnaire(projectId: string, by?: string) {
  return USE_SUPABASE ? sb.unassignQuestionnaire(projectId, by) : MOCK_FAIL;
}
export async function syncQuestionnaireRegistry() {
  return USE_SUPABASE ? sb.syncQuestionnaireRegistry() : { ok: false, synced: 0, error: "mock" };
}
export async function upsertQuestionnaire(code: string, version: string, title: string, kind: string, schema: unknown, by?: string) {
  return USE_SUPABASE ? sb.upsertQuestionnaire(code, version, title, kind, schema, by) : { ok: false, error: "mock" };
}
// ── Head-submitted questionnaire requests ────────────────────────────────────────────────────────────
export async function requestQuestionnaire(projectId: string, input: { title: string; includeAai: boolean; payload: unknown; note?: string }) {
  return USE_SUPABASE ? sb.requestQuestionnaire(projectId, input) : MOCK_FAIL;
}
export async function getQuestionnaireRequestStatus(projectId: string): Promise<{ pending: boolean }> {
  return USE_SUPABASE ? sb.getQuestionnaireRequestStatus(projectId) : { pending: false };
}
export async function getQuestionnaireRequests(): Promise<sb.QuestionnaireRequest[]> {
  return USE_SUPABASE ? sb.getQuestionnaireRequests() : [];
}
export async function approveQuestionnaireRequest(requestId: string, by?: string) {
  return USE_SUPABASE ? sb.approveQuestionnaireRequest(requestId, by) : MOCK_FAIL;
}
export async function rejectQuestionnaireRequest(requestId: string, by?: string) {
  return USE_SUPABASE ? sb.rejectQuestionnaireRequest(requestId, by) : MOCK_FAIL;
}
export type { QuestionnaireRequest } from "./supabase";
export async function getAssignedQuestionnaire(projectId: string): Promise<sb.AssignedQuestionnaire> {
  return USE_SUPABASE ? sb.getAssignedQuestionnaire(projectId) : null;
}
export async function getAssignedQuestionnaireInfo(projectId: string): Promise<{ title: string } | null> {
  return USE_SUPABASE ? sb.getAssignedQuestionnaireInfo(projectId) : null;
}
export async function getPersonPrefill(personId: string) {
  return USE_SUPABASE ? sb.getPersonPrefill(personId) : null;
}
export async function getPersonPreAnswers(personId: string) {
  return USE_SUPABASE ? sb.getPersonPreAnswers(personId) : null;
}
export async function submitClinicalAssessment(input: Parameters<typeof sb.submitClinicalAssessment>[0]) {
  return USE_SUPABASE ? sb.submitClinicalAssessment(input) : { ok: false as const, error: "mock" };
}
export async function bulkEnrollAssessClinical(input: Parameters<typeof sb.bulkEnrollAssessClinical>[0]) {
  return USE_SUPABASE ? sb.bulkEnrollAssessClinical(input) : { ok: false, enrolled: 0, assessed: 0, failed: [], error: "mock" };
}
export async function getPersonToolScores(assessmentId: string): Promise<sb.PersonToolScore[]> {
  return USE_SUPABASE ? sb.getPersonToolScores(assessmentId) : [];
}
export async function getPersonClinicalAssessments(personId: string): Promise<sb.PersonClinicalAssessment[]> {
  return USE_SUPABASE ? sb.getPersonClinicalAssessments(personId) : [];
}
export async function getProjectQuestionnaireSummary(projectId: string): Promise<sb.ProjectQuestionnaireSummary> {
  return USE_SUPABASE ? sb.getProjectQuestionnaireSummary(projectId) : { rows: [], nPersons: 0 };
}
export async function getProjectSurveyDashboard(projectId: string): Promise<sb.ProjectSurveyDashboard> {
  return USE_SUPABASE ? sb.getProjectSurveyDashboard(projectId) : { nAssessed: 0, nFlaggedPersons: 0, suppressed: false, nSuppressedTools: 0, modules: [] };
}
export type { QuestionnaireInfo, ProjectQuestionnaire } from "./supabase";
export type { AssignedQuestionnaire, BulkClinicalRow, ClinicalToolScoreIn, PersonToolScore, PersonClinicalAssessment, ProjectQuestionnaireSummary, QuestionnaireSummaryRow } from "./supabase";
export type { SurveyToolAgg, SurveyModuleAgg, ProjectSurveyDashboard } from "./supabase";
export async function getMonitorSettings(): Promise<sb.MonitorSettings> {
  return USE_SUPABASE
    ? sb.getMonitorSettings()
    : { notificationsEnabled: true, locationRemindersEnabled: true, deadlineDay: 25, advanceDays: 5, overdueEveryDays: 3, sendHour: 9 };
}
export async function updateMonitorSettings(input: Parameters<typeof sb.updateMonitorSettings>[0]) {
  return USE_SUPABASE ? sb.updateMonitorSettings(input) : MOCK_FAIL;
}
export async function getAdminIssues(): Promise<sb.AdminIssue[]> {
  return USE_SUPABASE ? sb.getAdminIssues() : [];
}
export async function resolveIssue(id: number, status: "open" | "resolved") {
  return USE_SUPABASE ? sb.resolveIssue(id, status) : MOCK_FAIL;
}
export async function getRegistrations(): Promise<sb.RegistrationGroup[]> {
  return USE_SUPABASE ? sb.getRegistrations() : [];
}
export type { ReminderType, ReminderResult, ReminderLogEntry } from "./supabase";
export async function sendProjectReminder(webProjectId: string, type: sb.ReminderType): Promise<sb.ReminderResult> {
  return USE_SUPABASE ? sb.sendProjectReminder(webProjectId, type)
    : { ok: false, projectName: "", sent: 0, failed: 0, skipped: 0, error: "mock" };
}
export async function sendReminderToPending(type: sb.ReminderType) {
  return USE_SUPABASE ? sb.sendReminderToPending(type) : { results: [], sent: 0, failed: 0, skipped: 0 };
}
export async function getReminderLog(limit?: number): Promise<sb.ReminderLogEntry[]> {
  return USE_SUPABASE ? sb.getReminderLog(limit) : [];
}
export type { SiteVisit, VisitRsvp } from "./supabase";
export async function getSiteVisits(): Promise<sb.SiteVisit[]> {
  return USE_SUPABASE ? sb.getSiteVisits() : [];
}
export async function getMonitorProvinces(): Promise<string[]> {
  return USE_SUPABASE ? sb.getMonitorProvinces() : [];
}
export async function getVisitRsvps(visitId: number): Promise<sb.VisitRsvp[]> {
  return USE_SUPABASE ? sb.getVisitRsvps(visitId) : [];
}
export async function createSiteVisit(input: Parameters<typeof sb.createSiteVisit>[0]) {
  return USE_SUPABASE ? sb.createSiteVisit(input) : { ok: false, error: "mock" };
}
export async function cancelSiteVisit(id: number) {
  return USE_SUPABASE ? sb.cancelSiteVisit(id) : { ok: false, error: "mock" };
}
export async function sendSiteVisit(id: number) {
  return USE_SUPABASE ? sb.sendSiteVisit(id) : { ok: false, sent: 0, failed: 0, error: "mock" };
}
export type { PersonDetail, PersonAssessmentPoint } from "./supabase";
export async function getPersonDetail(personId: string): Promise<sb.PersonDetail | null> {
  return USE_SUPABASE ? sb.getPersonDetail(personId) : null;
}
export type { ProjectAreaTree, ProjectAreaNode, AreaStatus } from "./supabase";
export async function getProjectAreaTree(projectId: string): Promise<sb.ProjectAreaTree> {
  return USE_SUPABASE ? sb.getProjectAreaTree(projectId) : { provinces: [], unmappedLocations: 0 };
}
export type { NotificationItem } from "./supabase";
export async function getNotifications(): Promise<sb.NotificationItem[]> {
  return USE_SUPABASE ? sb.getNotifications() : [];
}
export async function getAdminNotifications(): Promise<sb.NotificationItem[]> {
  return USE_SUPABASE ? sb.getAdminNotifications() : [];
}
export async function getMyMonthlyHistory(
  projectId: string,
): Promise<{ yearMonth: string; submitted: number; total: number; lastSubmittedAt?: string }[]> {
  return USE_SUPABASE ? sb.getMyMonthlyHistory(projectId) : [];
}
export type { ActivityItem } from "./supabase";
export async function getMyActivity(): Promise<import("./supabase").ActivityItem[]> {
  return USE_SUPABASE ? sb.getMyActivity() : [];
}
