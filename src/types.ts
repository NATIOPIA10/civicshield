export type CategoryId = "electricity" | "water" | "telecom" | "infrastructure";

export const CATEGORIES: { id: CategoryId; label: string; hint: string }[] = [
  { id: "electricity", label: "Electricity", hint: "Power cuts, fallen lines, faulty transformers" },
  { id: "water", label: "Water supply", hint: "No water, leaks, burst pipes" },
  { id: "telecom", label: "Network and telecommunications", hint: "No signal, internet or phone line faults" },
  { id: "infrastructure", label: "Construction and public infrastructure", hint: "Damaged roads, drainage, public structures" },
];

/** Internal workflow states. Working assumption until requirements are confirmed. */
export type Status =
  | "submitted"
  | "under_review"
  | "incomplete"
  | "duplicate"
  | "assigned"
  | "in_progress"
  | "resolution_submitted"
  | "returned"
  | "closed";

export interface StatusEvent {
  status: Status;
  at: string; // ISO date
}

/** Full record. Only staff-facing code may use this shape. */
export interface Report {
  id: string;
  trackingCode: string;
  category: CategoryId;
  description: string;
  area: string;
  lat?: number;
  lng?: number;
  photoName?: string;
  photoData?: string;
  hidePhoto?: boolean; // administrator hides the photo from the public page
  hideLocation?: boolean; // administrator hides the location link from the public page
  hideEvidence?: boolean; // administrator hides the provider's repair photo from the public page
  status: Status;
  history: StatusEvent[];
  orgId?: string;
  notes?: { by: string; text: string; at: string }[];
  resolution?: { summary: string; evidenceName?: string; evidenceData?: string; at: string };
  feedback?: { rating: number; comment?: string; at: string };
  createdAt: string;
}

export interface NewReportInput {
  category: CategoryId;
  description: string;
  area: string;
  lat?: number;
  lng?: number;
  photoName?: string;
  photoData?: string;
}

/** What a citizen may see. No internal notes, no staff or institution details. */
export interface PublicReportView {
  id: string;
  category: CategoryId;
  description: string;
  area: string;
  submittedAt: string;
  statusLabel: string;
  isResolved: boolean;
  timeline: { label: string; at: string }[];
  resolution?: string;
  feedbackGiven: boolean;
}

export type IssueGroup = "under_review" | "being_fixed" | "solved";

/** One entry on the public issues page. Shows the citizen photo and location; never notes, institutions or contact details. */
export interface PublicIssue {
  id: string;
  category: CategoryId;
  description: string;
  area: string;
  submittedAt: string;
  statusLabel: string;
  group: IssueGroup;
  resolvedAt?: string;
  resolution?: string;
  photo?: string;
  evidencePhoto?: string; // photo of the finished repair, solved issues only
  lat?: number;
  lng?: number;
}

export interface PublicIssuesData {
  stats: { reported: number; underReview: number; beingFixed: number; solved: number };
  issues: PublicIssue[];
}

export const STATUS_LABEL: Record<Status, string> = {
  submitted: "Submitted",
  under_review: "Under review",
  incomplete: "Incomplete",
  duplicate: "Duplicate",
  assigned: "Assigned",
  in_progress: "In progress",
  resolution_submitted: "Resolution submitted",
  returned: "Returned for correction",
  closed: "Closed",
};

export interface Organization {
  id: string;
  name: string;
  category: CategoryId;
}

export interface StaffUser {
  id: string;
  name: string;
  username: string;
  role: "admin" | "provider";
  orgId?: string;
}

/** Starting organizations for the mock. Replace with real institutions after requirements gathering. */
export const ORGS: Organization[] = [
  { id: "electric", name: "Electric utility (sample)", category: "electricity" },
  { id: "water", name: "Water utility (sample)", category: "water" },
  { id: "telecom", name: "Telecom provider (sample)", category: "telecom" },
  { id: "roads", name: "Roads and construction office (sample)", category: "infrastructure" },
];

export interface StaffSession {
  role: "admin" | "provider";
  orgId?: string;
  name: string;
}

export type StaffAction =
  | { type: "start_review" }
  | { type: "mark_incomplete" }
  | { type: "mark_duplicate" }
  | { type: "assign"; orgId: string }
  | { type: "start_work" }
  | { type: "submit_resolution"; summary: string; evidenceName?: string; evidenceData?: string }
  | { type: "approve" }
  | { type: "return"; reason: string }
  | { type: "note"; text: string }
  | { type: "set_visibility"; hidePhoto: boolean; hideLocation: boolean; hideEvidence?: boolean };
