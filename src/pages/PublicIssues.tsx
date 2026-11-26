import { useState } from "react";
import { Link } from "react-router-dom";
import { Icon } from "../components/icons";
import IssueCard, { GROUP_LABEL } from "../components/IssueCard";
import IssueStats from "../components/IssueStats";
import { PageHeader } from "../components/ui";
import { CATEGORIES, CategoryId, IssueGroup } from "../types";
import { usePageTitle } from "../usePageTitle";
import { usePublicIssues } from "../usePublicIssues";

const PAGE = 12;

export default function PublicIssues() {
  usePageTitle("Public issues");
  const data = usePublicIssues();
  const [group, setGroup] = useState<IssueGroup | "all">("all");
  const [category, setCategory] = useState<CategoryId | "all">("all");
  const [query, setQuery] = useState("");
  const [shown, setShown] = useState(PAGE);

  if (!data) return <p className="text-muted">Loading...</p>;

  const q = query.trim().toLowerCase();
  const rows = data.issues.filter(
    (i) =>
      (group === "all" || i.group === group) &&
      (category === "all" || i.category === category) &&
      (!q || i.area.toLowerCase().includes(q) || i.description.toLowerCase().includes(q) || i.id.toLowerCase().includes(q))
  );
  const count = (g: IssueGroup) => data.stats[g === "under_review" ? "underReview" : g === "being_fixed" ? "beingFixed" : "solved"];
  const reset = () => setShown(PAGE);
  const chip = (active: boolean) =>
    `rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${active ? "bg-civic text-white" : "text-muted hover:bg-civic-soft hover:text-civic-dark"}`;

  return (
    <div>
      <PageHeader
        title="Reported and solved issues in Dilla"
        subtitle="Every problem reported through CivicShield appears here after the city administration has reviewed it, and stays until it is solved. Each issue is shown with its photo and a map link to its location, and once solved, a photo of the finished repair, unless the administration has hidden them to protect someone's privacy. Names and phone numbers are never asked for or shown."
      />

      <IssueStats stats={data.stats} />

      <div className="card mt-8 grid gap-4 p-4 lg:grid-cols-[auto_1fr_auto] lg:items-end">
        <div className="flex flex-wrap gap-1 rounded-xl bg-paper p-1" role="group" aria-label="Filter by progress">
          <button onClick={() => { setGroup("all"); reset(); }} className={chip(group === "all")}>All ({data.stats.reported})</button>
          {(Object.keys(GROUP_LABEL) as IssueGroup[]).map((g) => (
            <button key={g} onClick={() => { setGroup(g); reset(); }} className={chip(group === g)}>{GROUP_LABEL[g]} ({count(g)})</button>
          ))}
        </div>
        <div>
          <label htmlFor="q" className="block text-sm font-semibold">Search</label>
          <div className="relative mt-1">
            <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted" />
            <input id="q" type="search" value={query} onChange={(e) => { setQuery(e.target.value); reset(); }} placeholder="Street, landmark or Report ID" className="input pl-10" />
          </div>
        </div>
        <div>
          <label htmlFor="cat" className="block text-sm font-semibold">Category</label>
          <select id="cat" value={category} onChange={(e) => { setCategory(e.target.value as CategoryId | "all"); reset(); }} className="input mt-1">
            <option value="all">All categories</option>
            {CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="card mt-6 grid place-items-center gap-2 p-12 text-center text-muted">
          <Icon name="search" className="h-8 w-8" />
          <p>{data.issues.length === 0 ? "No issues have been published yet." : "No issues match these filters."}</p>
        </div>
      ) : (
        <>
          <p className="mt-6 text-sm text-muted" aria-live="polite">Showing {Math.min(shown, rows.length)} of {rows.length} issues</p>
          <div className="mt-3 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {rows.slice(0, shown).map((i) => <IssueCard key={i.id} issue={i} />)}
          </div>
          {rows.length > shown && (
            <button onClick={() => setShown((n) => n + PAGE)} className="btn btn-secondary mt-6">
              Show more ({rows.length - shown} remaining)
            </button>
          )}
        </>
      )}

      <p className="mt-10 text-sm text-muted">
        Seen a problem that is not listed? <Link to="/report" className="link">Report an issue</Link>.
      </p>
    </div>
  );
}
