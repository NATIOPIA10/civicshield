import { OVERDUE_DAYS, Stats } from "./analytics";
import { CATEGORIES, Organization } from "./types";

const n = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;

/**
 * Deterministic summary. Every number comes straight from the Stats object that the dashboard displays,
 * so no figure can be invented. An AI service may later rephrase these lines, but only these lines.
 */
export function summarize(st: Stats, orgs: Organization[]): string[] {
  const out: string[] = [];
  out.push(`${n(st.total, "report is", "reports are")} in view: ${st.open} open and ${st.closed} closed.`);

  if (st.open > 0) {
    out.push(
      st.overdue > 0
        ? `${n(st.overdue, "open report has", "open reports have")} been waiting more than ${OVERDUE_DAYS} days.`
        : `No open report has been waiting more than ${OVERDUE_DAYS} days.`
    );
  }

  const topCat = Math.max(...CATEGORIES.map((c) => st.byCategory[c.id]));
  if (topCat > 0) {
    const names = CATEGORIES.filter((c) => st.byCategory[c.id] === topCat).map((c) => c.label);
    out.push(
      names.length === 1
        ? `${names[0]} has the most reports (${topCat} of ${st.total}).`
        : `${names.join(" and ")} are tied for the most reports (${topCat} each).`
    );
  }

  const topOpen = Math.max(0, ...orgs.map((o) => st.byOrg[o.id]?.open ?? 0));
  if (topOpen > 0) {
    const names = orgs.filter((o) => (st.byOrg[o.id]?.open ?? 0) === topOpen).map((o) => o.name);
    out.push(`${names.join(" and ")} ${names.length === 1 ? "has" : "have"} the most open reports (${topOpen}).`);
  }

  if (st.avgFirstReviewHours !== null) out.push(`Reports wait on average ${st.avgFirstReviewHours.toFixed(1)} hours for a first review.`);
  if (st.avgResolutionDays !== null) out.push(`Closed reports took on average ${st.avgResolutionDays.toFixed(1)} days from submission to closure.`);
  if (st.avgRating !== null) out.push(`Citizens rated resolved reports ${st.avgRating.toFixed(1)} out of 5 on average (${n(st.ratingCount, "rating", "ratings")}).`);
  return out;
}
