import type { CategoryId, Report, Status } from "./types";

/** Working assumption: a report still open after this many days counts as overdue. Confirm with stakeholders. */
export const OVERDUE_DAYS = 7;
const DAY = 86400000;
const HOUR = 3600000;

export const isOpen = (s: Status) => s !== "closed" && s !== "duplicate";

export interface Stats {
  total: number;
  open: number;
  overdue: number;
  closed: number;
  avgFirstReviewHours: number | null;
  avgResolutionDays: number | null;
  avgRating: number | null;
  ratingCount: number;
  byCategory: Record<CategoryId, number>;
  byStatus: Partial<Record<Status, number>>;
  byOrg: Record<string, { assigned: number; open: number }>;
  weekly: { label: string; count: number }[];
}

const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);

/** Every figure is computed directly from report records, so the dashboard can always be checked by hand. */
export function computeStats(reports: Report[], now = Date.now()): Stats {
  const at = (r: Report, s: Status) => r.history.find((h) => h.status === s)?.at;
  const firstReview = reports.flatMap((r) => {
    const t = at(r, "under_review");
    return t ? [(+new Date(t) - +new Date(r.createdAt)) / HOUR] : [];
  });
  const resolution = reports.flatMap((r) => {
    const t = at(r, "closed");
    return t ? [(+new Date(t) - +new Date(r.createdAt)) / DAY] : [];
  });
  const ratings = reports.flatMap((r) => (r.feedback ? [r.feedback.rating] : []));

  const byCategory: Record<CategoryId, number> = { electricity: 0, water: 0, telecom: 0, infrastructure: 0 };
  const byStatus: Partial<Record<Status, number>> = {};
  const byOrg: Stats["byOrg"] = {};
  for (const r of reports) {
    byCategory[r.category]++;
    byStatus[r.status] = (byStatus[r.status] ?? 0) + 1;
    if (r.orgId) {
      byOrg[r.orgId] ??= { assigned: 0, open: 0 };
      byOrg[r.orgId].assigned++;
      if (isOpen(r.status)) byOrg[r.orgId].open++;
    }
  }

  const weekly = Array.from({ length: 8 }, (_, i) => {
    const end = now - (7 - i) * 7 * DAY;
    const start = end - 7 * DAY;
    const count = reports.filter((r) => +new Date(r.createdAt) > start && +new Date(r.createdAt) <= end).length;
    return { label: new Date(end).toLocaleDateString(undefined, { month: "short", day: "numeric" }), count };
  });

  const open = reports.filter((r) => isOpen(r.status));
  return {
    total: reports.length,
    open: open.length,
    overdue: open.filter((r) => now - +new Date(r.createdAt) > OVERDUE_DAYS * DAY).length,
    closed: byStatus.closed ?? 0,
    avgFirstReviewHours: avg(firstReview),
    avgResolutionDays: avg(resolution),
    avgRating: avg(ratings),
    ratingCount: ratings.length,
    byCategory,
    byStatus,
    byOrg,
    weekly,
  };
}
