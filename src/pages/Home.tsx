import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import IssueCard from "../components/IssueCard";
import IssueStats from "../components/IssueStats";
import { CATEGORIES } from "../types";
import { usePublicIssues } from "../usePublicIssues";

export default function Home() {
  const nav = useNavigate();
  const issues = usePublicIssues();
  const [id, setId] = useState("");
  const go = (e: FormEvent) => {
    e.preventDefault();
    nav(`/track${id ? `?id=${encodeURIComponent(id.trim())}` : ""}`);
  };
  return (
    <div>
    <div className="grid gap-12 md:grid-cols-[1.6fr_1fr] md:items-start">
      <section>
        <h1 className="max-w-3xl text-4xl md:text-5xl font-bold leading-tight tracking-tight">
          Report a public-service problem in Dilla and see it through to a fix.
        </h1>
        <p className="mt-5 max-w-prose text-lg text-muted">
          No account needed. Describe the problem, say where it is, and you get a Report ID to follow its progress.
          A report is only marked resolved after the city administration has checked the evidence.
        </p>
        <Link to="/report" className="mt-8 inline-block rounded bg-civic px-6 py-3 font-semibold text-white hover:bg-civic-dark">
          Report an issue
        </Link>
        <ul className="mt-12 divide-y divide-line border-y border-line">
          {CATEGORIES.map((c) => (
            <li key={c.id} className="py-3">
              <p className="font-semibold">{c.label}</p>
              <p className="text-sm text-muted">{c.hint}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-lg border border-line bg-white p-6">
        <h2 className="text-xl font-semibold">Already reported something?</h2>
        <p className="mt-1 text-sm text-muted">Enter your Report ID, then your tracking code on the next page.</p>
        <form onSubmit={go} className="mt-5">
          <label htmlFor="rid" className="block text-sm font-medium">Report ID</label>
          <input
            id="rid"
            value={id}
            onChange={(e) => setId(e.target.value)}
            placeholder="CS-2026-0001"
            className="mt-1 w-full rounded border border-line px-3 py-2 font-mono"
          />
          <button className="mt-4 w-full rounded border-2 border-civic px-4 py-2 font-semibold text-civic hover:bg-civic hover:text-white">
            Track report
          </button>
        </form>
      </section>
    </div>

    {issues && issues.stats.reported > 0 && (
      <section className="mt-16" aria-labelledby="public-heading">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 id="public-heading" className="text-2xl font-bold tracking-tight">Reported and solved in Dilla</h2>
          <Link to="/issues" className="text-sm font-medium text-civic underline">See all public issues</Link>
        </div>
        <div className="mt-5"><IssueStats stats={issues.stats} /></div>
        {issues.issues.some((i) => i.group === "solved") && (
          <>
            <h3 className="mt-8 font-semibold">Recently solved</h3>
            <div className="mt-3 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {issues.issues.filter((i) => i.group === "solved").slice(0, 3).map((i) => <IssueCard key={i.id} issue={i} />)}
            </div>
          </>
        )}
      </section>
    )}
    </div>
  );
}
