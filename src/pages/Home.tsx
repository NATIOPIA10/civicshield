import { FormEvent, ReactNode, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { CATEGORY_ICON, Icon, IconName } from "../components/icons";
import IssueCard from "../components/IssueCard";
import IssueStats from "../components/IssueStats";
import { PAD } from "../layoutClasses";
import { CATEGORIES } from "../types";
import { usePageTitle } from "../usePageTitle";
import { usePublicIssues } from "../usePublicIssues";

const ACTIONS: { to: string; icon: IconName; title: string; text: string }[] = [
  { to: "/report", icon: "clipboard", title: "Report a problem", text: "Tell us what is wrong and where. It takes about two minutes." },
  { to: "/track", icon: "search", title: "Track my report", text: "Enter your Report ID and see where it is, step by step." },
  { to: "/issues", icon: "checkCircle", title: "See what has been fixed", text: "Browse reviewed reports in Dilla, with photos and results." },
];

const STEPS: { icon: IconName; title: string; text: string }[] = [
  { icon: "clipboard", title: "You report it", text: "Describe the problem, pin the place on the map and add a photo. No account needed, and you get a Report ID to follow it." },
  { icon: "clock", title: "We review and assign", text: "The city administration checks your report and sends it to the institution responsible for fixing it." },
  { icon: "checkCircle", title: "It is fixed and checked", text: "The institution does the work and uploads evidence. A report is closed only after the administration has checked it." },
];

function Band({ tone, label, children }: { tone: "white" | "paper"; label: string; children: ReactNode }) {
  return (
    <section aria-labelledby={label} className={`${tone === "white" ? "bg-white" : "bg-paper"} py-12 md:py-16 ${PAD}`}>
      {children}
    </section>
  );
}

export default function Home() {
  usePageTitle("");
  const nav = useNavigate();
  const issues = usePublicIssues();
  const [id, setId] = useState("");
  const go = (e: FormEvent) => {
    e.preventDefault();
    nav(`/track${id ? `?id=${encodeURIComponent(id.trim())}` : ""}`);
  };

  return (
    <div>
      <section className={`border-b border-line bg-gradient-to-br from-civic-soft via-white to-white py-12 md:py-20 ${PAD}`}>
        <div className="grid items-center gap-12 lg:grid-cols-[1.4fr_1fr]">
          <div>
            <span className="pill border border-line bg-white text-civic-dark">Dilla City public services</span>
            <h1 className="mt-5 max-w-4xl text-4xl font-bold leading-[1.1] tracking-tight sm:text-5xl xl:text-6xl">
              Report a public-service problem and follow it until it is fixed.
            </h1>
            <p className="mt-5 max-w-2xl text-lg text-muted">
              Electricity, water, telecom or road problems: tell us once, with a photo and a pin on the map. The right
              institution is assigned, and nothing is closed until the evidence has been checked.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/report" className="btn btn-primary btn-lg">
                Report an issue <Icon name="arrow" />
              </Link>
              <Link to="/track" className="btn btn-secondary btn-lg">Track a report</Link>
            </div>
            <ul className="mt-8 grid max-w-2xl gap-2 text-sm text-muted sm:grid-cols-3">
              {["No account needed", "Every step is recorded", "Closed only after checking"].map((t) => (
                <li key={t} className="flex items-center gap-2"><Icon name="check" className="h-4 w-4 text-civic" />{t}</li>
              ))}
            </ul>
          </div>

          <form onSubmit={go} className="card p-6 lg:p-8">
            <h2 className="text-xl font-semibold">Already reported something?</h2>
            <p className="mt-1 text-sm text-muted">Enter your Report ID, then your tracking code on the next page.</p>
            <label htmlFor="rid" className="mt-5 block text-sm font-semibold">Report ID</label>
            <input id="rid" value={id} onChange={(e) => setId(e.target.value)} placeholder="CS-2026-0001" className="input mt-1 font-mono" />
            <button className="btn btn-secondary mt-4 w-full">Track report</button>
          </form>
        </div>
      </section>

      <Band tone="paper" label="actions-heading">
        <h2 id="actions-heading" className="text-2xl font-bold tracking-tight">What would you like to do?</h2>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {ACTIONS.map((a) => (
            <Link key={a.to} to={a.to} className="card group flex items-start gap-4 p-6 transition-shadow hover:border-civic hover:shadow-md">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-civic text-white"><Icon name={a.icon} className="h-6 w-6" /></span>
              <span className="flex-1">
                <span className="block text-lg font-semibold">{a.title}</span>
                <span className="mt-1 block text-muted">{a.text}</span>
              </span>
              <Icon name="arrow" className="mt-1 h-5 w-5 text-civic transition-transform group-hover:translate-x-1" />
            </Link>
          ))}
        </div>
      </Band>

      <Band tone="white" label="how-heading">
        <h2 id="how-heading" className="text-2xl font-bold tracking-tight">How it works</h2>
        <ol className="mt-6 grid gap-4 md:grid-cols-3">
          {STEPS.map((s, i) => (
            <li key={s.title} className="card p-6">
              <div className="flex items-center gap-3">
                <span className="grid h-11 w-11 place-items-center rounded-xl bg-civic-soft text-civic"><Icon name={s.icon} className="h-6 w-6" /></span>
                <span className="text-sm font-semibold text-muted">Step {i + 1}</span>
              </div>
              <h3 className="mt-4 text-lg font-semibold">{s.title}</h3>
              <p className="mt-1 text-muted">{s.text}</p>
            </li>
          ))}
        </ol>
      </Band>

      <Band tone="paper" label="what-heading">
        <h2 id="what-heading" className="text-2xl font-bold tracking-tight">What can you report?</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {CATEGORIES.map((c) => (
            <Link key={c.id} to={`/report?category=${c.id}`} className="card group flex flex-col p-6 transition-shadow hover:border-civic hover:shadow-md">
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-civic-soft text-civic"><Icon name={CATEGORY_ICON[c.id]} className="h-6 w-6" /></span>
              <span className="mt-4 text-lg font-semibold">{c.label}</span>
              <span className="mt-1 flex-1 text-sm text-muted">{c.hint}</span>
              <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-civic">Report this <Icon name="arrow" className="h-4 w-4 transition-transform group-hover:translate-x-1" /></span>
            </Link>
          ))}
        </div>
      </Band>

      {issues && issues.stats.reported > 0 && (
        <Band tone="white" label="public-heading">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <h2 id="public-heading" className="text-2xl font-bold tracking-tight">Reported and solved in Dilla</h2>
            <Link to="/issues" className="link text-sm">See all public issues</Link>
          </div>
          <div className="mt-6"><IssueStats stats={issues.stats} /></div>
          {issues.issues.some((i) => i.group === "solved") && (
            <>
              <h3 className="mt-10 text-lg font-semibold">Recently solved</h3>
              <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {issues.issues.filter((i) => i.group === "solved").slice(0, 3).map((i) => <IssueCard key={i.id} issue={i} />)}
              </div>
            </>
          )}
        </Band>
      )}
    </div>
  );
}
