/**
 * Single API layer. Screens import ONLY from here.
 * Today it talks to an in-browser mock (localStorage). When the Django API is
 * ready, replace the bodies of these functions with fetch() calls that follow
 * the API contract; no screen needs to change.
 */
import { CATEGORIES, ORGS } from "../types";
import type { CategoryId, NewReportInput, Organization, PublicIssue, PublicIssuesData, PublicReportView, Report, StaffAction, StaffSession, StaffUser, Status } from "../types";

const KEY = "civicshield.mock.reports.v1";
const wait = (ms = 350) => new Promise((r) => setTimeout(r, ms));

const PUBLIC_LABEL: Record<Status, string> = {
  submitted: "Received",
  under_review: "Under review",
  incomplete: "More information needed",
  duplicate: "Merged with an existing report",
  assigned: "Assigned to a service provider",
  in_progress: "Work in progress",
  resolution_submitted: "Work in progress", // resolution is not public until approved
  returned: "Work in progress",
  closed: "Resolved",
};

const FLOW: Status[] = ["submitted", "under_review", "assigned", "in_progress", "resolution_submitted", "closed"];

function seed(): Report[] {
  const now = Date.now();
  const d = (days: number) => new Date(now - days * 86400000).toISOString();
  return [
    {
      id: "CS-2026-0001",
      trackingCode: "DEMO-1234",
      category: "water",
      description: "Water pipe burst near the market junction; water has been running onto the road since morning.",
      area: "Dilla, near the main market",
      status: "in_progress",
      history: [
        { status: "submitted", at: d(3) },
        { status: "under_review", at: d(2.5) },
        { status: "assigned", at: d(2) },
        { status: "in_progress", at: d(1) },
      ],
      createdAt: d(3),
    },
  ];
}

function load(): Report[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw) as Report[];
  } catch {
    /* fall through to seed */
  }
  const s = seed();
  save(s);
  return s;
}

function save(reports: Report[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(reports));
  } catch {
    /* storage unavailable: mock state is not persisted */
  }
}

function makeTrackingCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no look-alike characters
  const pick = () => Array.from({ length: 4 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join("");
  return `${pick()}-${pick()}`;
}

function toPublic(r: Report): PublicReportView {
  const timeline: { label: string; at: string }[] = [];
  for (const e of r.history) {
    const label = PUBLIC_LABEL[e.status];
    if (timeline[timeline.length - 1]?.label !== label) timeline.push({ label, at: e.at });
  }
  return {
    id: r.id,
    category: r.category,
    description: r.description,
    area: r.area,
    submittedAt: r.createdAt,
    statusLabel: PUBLIC_LABEL[r.status],
    isResolved: r.status === "closed",
    timeline,
    resolution: r.status === "closed" ? r.resolution?.summary : undefined,
    categoryChanged: Boolean(r.originalCategory) && r.originalCategory !== r.category,
    feedbackGiven: Boolean(r.feedback),
  };
}

function find(reports: Report[], id: string, code: string): Report | undefined {
  return reports.find(
    (r) => r.id.toLowerCase() === id.trim().toLowerCase() && r.trackingCode === code.trim().toUpperCase()
  );
}

export async function submitReport(input: NewReportInput): Promise<{ reportId: string; trackingCode: string }> {
  await wait(600);
  const reports = load();
  const id = `CS-${new Date().getFullYear()}-${String(reports.length + 1).padStart(4, "0")}`;
  const now = new Date().toISOString();
  const report: Report = {
    ...input,
    originalCategory: input.category,
    id,
    trackingCode: makeTrackingCode(),
    status: "submitted",
    history: [{ status: "submitted", at: now }],
    createdAt: now,
  };
  save([...reports, report]);
  return { reportId: report.id, trackingCode: report.trackingCode };
}

export async function trackReport(id: string, code: string): Promise<PublicReportView | null> {
  await wait();
  const r = find(load(), id, code);
  return r ? toPublic(r) : null;
}

export async function submitFeedback(id: string, code: string, rating: number, comment?: string): Promise<boolean> {
  await wait();
  const reports = load();
  const r = find(reports, id, code);
  if (!r || r.status !== "closed" || r.feedback) return false;
  r.feedback = { rating, comment: comment?.trim() || undefined, at: new Date().toISOString() };
  save(reports);
  return true;
}

/** Development helper only: moves a report to its next step so the timeline can be demonstrated. */
export async function devAdvanceReport(id: string, code: string): Promise<void> {
  const reports = load();
  const r = find(reports, id, code);
  if (!r) return;
  const next = FLOW[FLOW.indexOf(r.status === "returned" ? "in_progress" : r.status) + 1];
  if (!next) return;
  r.status = next;
  r.history.push({ status: next, at: new Date().toISOString() });
  save(reports);
}

/* ---------------- Staff side (mock) ---------------- */

const SESSION_KEY = "civicshield.mock.session.v1";

export function getSession(): StaffSession | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as StaffSession) : null;
  } catch {
    return null;
  }
}
export function setSession(s: StaffSession | null) {
  try {
    if (s) sessionStorage.setItem(SESSION_KEY, JSON.stringify(s));
    else sessionStorage.removeItem(SESSION_KEY);
  } catch {
    /* ignore */
  }
}

/** Providers only ever see reports assigned to their own organization. */
function visible(s: StaffSession, r: Report) {
  return s.role === "admin" || r.orgId === s.orgId;
}

export async function listStaffReports(s: StaffSession): Promise<Report[]> {
  await wait(200);
  return load().filter((r) => visible(s, r)).reverse();
}

export async function getStaffReport(s: StaffSession, id: string): Promise<Report | null> {
  await wait(150);
  const r = load().find((x) => x.id === id);
  return r && visible(s, r) ? r : null;
}

const RULES: Record<StaffAction["type"], { role: "admin" | "provider" | "both"; from: Status[]; to?: Status }> = {
  start_review: { role: "admin", from: ["submitted"], to: "under_review" },
  mark_incomplete: { role: "admin", from: ["under_review"], to: "incomplete" },
  mark_duplicate: { role: "admin", from: ["under_review"], to: "duplicate" },
  assign: { role: "admin", from: ["under_review"], to: "assigned" },
  start_work: { role: "provider", from: ["assigned"], to: "in_progress" },
  submit_resolution: { role: "provider", from: ["in_progress", "returned"], to: "resolution_submitted" },
  approve: { role: "admin", from: ["resolution_submitted"], to: "closed" },
  return: { role: "admin", from: ["resolution_submitted"], to: "returned" },
  set_visibility: { role: "admin", from: ["submitted", "under_review", "incomplete", "duplicate", "assigned", "in_progress", "resolution_submitted", "returned", "closed"] },
  change_category: { role: "admin", from: ["submitted", "under_review", "assigned", "in_progress", "resolution_submitted", "returned"] },
  reassign: { role: "admin", from: ["assigned", "in_progress", "returned"], to: "assigned" },
  note: { role: "both", from: ["submitted", "under_review", "incomplete", "duplicate", "assigned", "in_progress", "resolution_submitted", "returned", "closed"] },
};

/** Returns the updated report, or an error message. The real backend must enforce the same rules. */
export async function staffAction(s: StaffSession, id: string, a: StaffAction): Promise<Report | string> {
  await wait(250);
  const reports = load();
  const r = reports.find((x) => x.id === id);
  if (!r || !visible(s, r)) return "Report not found.";
  const rule = RULES[a.type];
  if (rule.role !== "both" && rule.role !== s.role) return "Your role cannot do this.";
  if (!rule.from.includes(r.status)) return "This action is not available at the report's current step.";
  const now = new Date().toISOString();
  r.notes = r.notes ?? [];
  if (a.type === "note") {
    if (!a.text.trim()) return "Write a note first.";
    r.notes.push({ by: s.name, text: a.text.trim(), at: now });
  } else if (a.type === "change_category") {
    const next = CATEGORIES.find((c) => c.id === a.category);
    if (!next) return "Choose a category.";
    if (a.category === r.category) return "The report already has this category.";
    const why = a.reason.trim();
    if (why.length < 5) return "Give a short reason for the change (at least 5 characters).";
    const was = CATEGORIES.find((c) => c.id === r.category)?.label ?? r.category;
    if (!r.originalCategory) r.originalCategory = r.category; // reports saved before this feature keep the earliest known choice
    r.category = a.category;
    r.notes.push({ by: s.name, text: `Category changed from ${was} to ${next.label}. Reason: ${why}${/[.!?]$/.test(why) ? "" : "."}`, at: now });
  } else if (a.type === "set_visibility") {
    r.hidePhoto = a.hidePhoto;
    r.hideLocation = a.hideLocation;
    if (a.hideEvidence !== undefined) r.hideEvidence = a.hideEvidence;
    r.notes.push({
      by: s.name,
      text: `Public visibility changed: photo ${a.hidePhoto ? "hidden" : "shown"}, location ${a.hideLocation ? "hidden" : "shown"}${a.hideEvidence === undefined ? "" : `, repair photo ${a.hideEvidence ? "hidden" : "shown"}`}.`,
      at: now,
    });
  } else {
    if (a.type === "assign") {
      if (!a.orgId) return "Choose an organization.";
      r.orgId = a.orgId;
    }
    if (a.type === "reassign") {
      const all = loadOrgs();
      const target = all.find((o) => o.id === a.orgId);
      if (!target) return "Choose an organization.";
      if (target.id === r.orgId) return "The report is already assigned to this organization.";
      const from = all.find((o) => o.id === r.orgId)?.name ?? "no organization";
      r.orgId = target.id;
      r.notes.push({ by: s.name, text: `Reassigned from ${from} to ${target.name}.`, at: now });
    }
    if (a.type === "submit_resolution") {
      if (a.summary.trim().length < 10) return "Describe the action taken (at least 10 characters).";
      r.resolution = { summary: a.summary.trim(), evidenceName: a.evidenceName, evidenceData: a.evidenceData, at: now };
    }
    if (a.type === "return") {
      if (!a.reason.trim()) return "Say what must be corrected.";
      r.notes.push({ by: s.name, text: `Returned for correction: ${a.reason.trim()}`, at: now });
    }
    r.status = rule.to!;
    r.history.push({ status: r.status, at: now });
  }
  save(reports);
  return r;
}

export async function listAllReportsForDashboard(s: StaffSession): Promise<Report[]> {
  await wait(200);
  return s.role === "admin" ? load() : [];
}

/** Development helper only: adds sample reports so the dashboard and map have something to show. */
export async function devSeedDemoReports(): Promise<void> {
  const reports = load();
  const cats = ["electricity", "water", "telecom", "infrastructure"] as const;
  const weighted: Status[] = ["submitted", "under_review", "assigned", "in_progress", "in_progress", "resolution_submitted", "closed", "closed", "closed", "closed"];
  const places = ["Main market area", "Near the hospital", "Kebele 02 road", "University road", "Bus station", "Church street"];
  let seed = 7;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const now = Date.now();
  for (let i = 0; i < 24; i++) {
    const category = cats[i % 4];
    const status = weighted[Math.floor(rnd() * weighted.length)];
    const target = FLOW.indexOf(status);
    const ageMs = (1 + rnd() * 40) * 86400000;
    const created = now - ageMs;
    const history = FLOW.slice(0, target + 1).map((st, k) => ({
      status: st,
      at: new Date(created + (ageMs * k) / (target + 1) * 0.9).toISOString(),
    }));
    const allOrgs = loadOrgs();
    const org = allOrgs.find((o) => o.category === category) ?? allOrgs[0];
    const r: Report = {
      id: `CS-${new Date().getFullYear()}-${String(reports.length + 1).padStart(4, "0")}`,
      trackingCode: makeTrackingCode(),
      category,
      originalCategory: category,
      description: `Sample report ${i + 1}: a ${category} problem that needs attention.`,
      area: places[Math.floor(rnd() * places.length)],
      lat: 6.4089 + (rnd() - 0.5) * 0.05,
      lng: 38.31 + (rnd() - 0.5) * 0.05,
      status,
      history,
      createdAt: new Date(created).toISOString(),
      orgId: target >= 2 ? org.id : undefined,
      resolution: target >= 4 ? { summary: "Sample repair completed.", at: history[4].at } : undefined,
      feedback: status === "closed" && rnd() > 0.4 ? { rating: 3 + Math.floor(rnd() * 3), at: history[5].at } : undefined,
    };
    reports.push(r);
  }
  save(reports);
}

/* ---------------- Organizations and staff accounts (mock) ---------------- */

const ORG_KEY = "civicshield.mock.orgs.v1";
const USER_KEY = "civicshield.mock.users.v1";
type StoredUser = StaffUser & { password: string }; // mock only: the real backend stores password hashes

function loadOrgs(): Organization[] {
  try {
    const raw = localStorage.getItem(ORG_KEY);
    if (raw) return JSON.parse(raw) as Organization[];
  } catch {
    /* use defaults */
  }
  localStorage.setItem(ORG_KEY, JSON.stringify(ORGS));
  return [...ORGS];
}

function loadUsers(): StoredUser[] {
  try {
    const raw = localStorage.getItem(USER_KEY);
    if (raw) return JSON.parse(raw) as StoredUser[];
  } catch {
    /* use defaults */
  }
  const seedUsers: StoredUser[] = [
    { id: "u-admin", name: "City administrator", username: "admin", role: "admin", password: "admin12345" },
    ...ORGS.map((o) => ({ id: `u-${o.id}`, name: o.name, username: `provider_${o.id}`, role: "provider" as const, orgId: o.id, password: "provider12345" })),
  ];
  localStorage.setItem(USER_KEY, JSON.stringify(seedUsers));
  return seedUsers;
}

const publicUser = ({ password: _p, ...u }: StoredUser): StaffUser => u;

export async function staffLogin(username: string, password: string): Promise<StaffSession | null> {
  await wait(300);
  const u = loadUsers().find((x) => x.username.toLowerCase() === username.trim().toLowerCase() && x.password === password);
  return u ? { role: u.role, orgId: u.orgId, name: u.name } : null;
}

export async function listOrganizations(): Promise<Organization[]> {
  await wait(100);
  return loadOrgs();
}

export async function createOrganization(name: string, category: CategoryId): Promise<Organization | string> {
  await wait(200);
  const orgs = loadOrgs();
  const clean = name.trim();
  if (!clean) return "Enter the organization's name.";
  if (orgs.some((o) => o.name.toLowerCase() === clean.toLowerCase())) return "An organization with this name already exists.";
  const base = clean.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "org";
  let id = base;
  for (let n = 2; orgs.some((o) => o.id === id); n++) id = `${base}-${n}`;
  const org: Organization = { id, name: clean, category };
  localStorage.setItem(ORG_KEY, JSON.stringify([...orgs, org]));
  return org;
}

export async function listStaffUsers(): Promise<StaffUser[]> {
  await wait(100);
  return loadUsers().map(publicUser);
}

export async function createStaffUser(input: {
  name: string; username: string; password: string; role: "admin" | "provider"; orgId?: string;
}): Promise<StaffUser | Record<string, string>> {
  await wait(250);
  const users = loadUsers();
  const errors: Record<string, string> = {};
  if (!input.name.trim()) errors.name = "Enter the person's name.";
  if (!input.username.trim()) errors.username = "Enter a username.";
  else if (users.some((u) => u.username.toLowerCase() === input.username.trim().toLowerCase())) errors.username = "This username is already taken.";
  if (input.password.length < 8) errors.password = "Use at least 8 characters.";
  if (input.role === "provider" && !loadOrgs().some((o) => o.id === input.orgId)) errors.orgId = "Choose an organization for a service-provider account.";
  if (Object.keys(errors).length) return errors;
  const user: StoredUser = {
    id: `u-${Date.now()}`, name: input.name.trim(), username: input.username.trim(), role: input.role,
    orgId: input.role === "provider" ? input.orgId : undefined, password: input.password,
  };
  localStorage.setItem(USER_KEY, JSON.stringify([...users, user]));
  return publicUser(user);
}

/* ---------------- Public issues page (mock) ---------------- */

/** A report becomes public once the administration has reviewed it. Unreviewed, incomplete and duplicate reports stay private. */
const PUBLIC_STATUSES: Status[] = ["under_review", "assigned", "in_progress", "resolution_submitted", "returned", "closed"];

function toIssue(r: Report): PublicIssue {
  const closedAt = r.history.find((h) => h.status === "closed")?.at;
  return {
    id: r.id,
    category: r.category,
    description: r.description,
    area: r.area,
    submittedAt: r.createdAt,
    statusLabel: PUBLIC_LABEL[r.status],
    group: r.status === "closed" ? "solved" : r.status === "under_review" ? "under_review" : "being_fixed",
    resolvedAt: closedAt,
    resolution: r.status === "closed" ? r.resolution?.summary : undefined,
    photo: r.hidePhoto ? undefined : r.photoData,
    evidencePhoto: r.status === "closed" && !r.hideEvidence ? r.resolution?.evidenceData : undefined,
    lat: r.hideLocation ? undefined : r.lat,
    lng: r.hideLocation ? undefined : r.lng,
  };
}

export async function listPublicIssues(): Promise<PublicIssuesData> {
  await wait(150);
  const visibleReports = load().filter((r) => PUBLIC_STATUSES.includes(r.status));
  const lastActivity = (r: Report) => +new Date(r.history[r.history.length - 1]?.at ?? r.createdAt);
  const issues = [...visibleReports].sort((a, b) => lastActivity(b) - lastActivity(a)).map(toIssue);
  const count = (g: PublicIssue["group"]) => issues.filter((i) => i.group === g).length;
  return {
    stats: { reported: issues.length, underReview: count("under_review"), beingFixed: count("being_fixed"), solved: count("solved") },
    issues,
  };
}
