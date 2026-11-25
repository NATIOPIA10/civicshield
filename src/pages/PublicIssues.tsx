import { useState } from "react";
import { Link } from "react-router-dom";
import IssueCard, { GROUP_LABEL } from "../components/IssueCard";
import IssueStats from "../components/IssueStats";
import { CATEGORIES, CategoryId, IssueGroup } from "../types";
import { usePublicIssues } from "../usePublicIssues";

const PAGE = 12;

export default function PublicIssues() {
  const data = usePublicIssues();
  const [group, setGroup] = useState<IssueGroup | "all">("all");
  const [category, setCategory] = useState<CategoryId | "all">("all");
  const [shown, setShown] = useState(PAGE);

  if (!data) return <p className="text-muted">Loading...</p>;

  const rows = data.issues.filter((i) => (group === "all" || i.group === group) && (category === "all" || i.category === category));
  const count = (g: IssueGroup) => data.stats[g === "under_review" ? "underReview" : g === "being_fixed" ? "beingFixed" : "solved"];
  const chip = (active: boolean) => `rounded border px-3 py-1.5 text-sm ${active ? "border-civic bg-civic text-white" : "border-line bg-white"}`;

  return (
    <div>
      <h1 className="max-w-3xl text-3xl font-bold tracking-tight md:text-4xl">Reported and solved issues in Dilla</h1>
      <p className="mt-3 max-w-prose text-muted">
        Every problem reported through CivicShield appears here after the city administration has reviewed it, and stays
        until it is solved. Each issue is shown with its photo and a map link to its location, and once solved, a photo of the finished repair, unless the administration has hidden them to protect someone's privacy. Names and phone numbers are never asked for or shown.
      </p>

      <div className="mt-8"><IssueStats stats={data.stats} /></div>

      <div className="mt-8 flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by progress">
          <button onClick={() => { setGroup("all"); setShown(PAGE); }} className={chip(group === "all")}>All ({data.stats.reported})</button>
          {(Object.keys(GROUP_LABEL) as IssueGroup[]).map((g) => (
            <button key={g} onClick={() => { setGroup(g); setShown(PAGE); }} className={chip(group === g)}>{GROUP_LABEL[g]} ({count(g)})</button>
          ))}
        </div>
        <div>
          <label htmlFor="cat" className="block text-sm font-medium">Category</label>
          <select id="cat" value={category} onChange={(e) => { setCategory(e.target.value as CategoryId | "all"); setShown(PAGE); }} className="mt-1 rounded border border-line bg-white px-3 py-2 text-sm">
            <option value="all">All categories</option>
            {CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="mt-10 text-muted">
          {data.issues.length === 0 ? "No issues have been published yet." : "No issues match these filters."}
        </p>
      ) : (
        <>
          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {rows.slice(0, shown).map((i) => <IssueCard key={i.id} issue={i} />)}
          </div>
          {rows.length > shown && (
            <button onClick={() => setShown((n) => n + PAGE)} className="mt-6 rounded border-2 border-civic px-5 py-2 font-semibold text-civic hover:bg-civic hover:text-white">
              Show more ({rows.length - shown} remaining)
            </button>
          )}
        </>
      )}

      <p className="mt-10 text-sm text-muted">
        Seen a problem that is not listed? <Link to="/report" className="font-medium text-civic underline">Report an issue</Link>.
      </p>
    </div>
  );
}
