import { ReactNode, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { devSeedDemoReports, getSession, listAllReportsForDashboard } from "../api/client";
import { OVERDUE_DAYS, computeStats } from "../analytics";
import { Gauge, HBar, PillBars } from "../components/charts";
import { CATEGORY_ICON, Icon } from "../components/icons";
import ReportMap from "../components/ReportMap";
import { StatusPill } from "../components/ui";
import { summarize } from "../summary";
import { CATEGORIES, CategoryId, Report, Status } from "../types";
import { usePageTitle } from "../usePageTitle";
import { useOrganizations } from "../useOrganizations";

const fmt = (n: number | null, unit: string, digits = 1) => (n === null ? "No data yet" : `${n.toFixed(digits)} ${unit}`);
const AVATAR = ["bg-civic-soft text-civic-dark", "bg-info-soft text-info", "bg-signal-soft text-signal", "bg-alert-soft text-alert"];
const IN_PROGRESS: Status[] = ["assigned", "in_progress", "resolution_submitted", "returned"];
const PENDING: Status[] = ["submitted", "under_review"];

function Panel({ title, action, className = "", children }: { title: string; action?: ReactNode; className?: string; children: ReactNode }) {
  return (
    <section className={`card flex flex-col rounded-2xl p-5 ${className}`}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function StatCard({ label, value, hint, to, hero, danger }: { label: string; value: string; hint: string; to: string; hero?: boolean; danger?: boolean }) {
  return (
    <div className={`relative rounded-2xl p-5 ${hero ? "card-hero text-white shadow-md" : "card"}`}>
      <dt className="pr-12 text-base font-semibold">{label}</dt>
      <dd className={`mt-4 text-5xl font-bold tracking-tight ${danger ? "text-alert" : ""}`}>{value}</dd>
      <dd className={`mt-3 text-xs ${hero ? "text-white/80" : "text-muted"}`}>{hint}</dd>
      <Link
        to={to}
        aria-label={`View reports: ${label}`}
        className={`absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-full border transition-colors ${hero ? "border-transparent bg-white text-civic-dark hover:bg-civic-soft" : "border-line text-ink hover:bg-civic-soft"}`}
      >
        <Icon name="arrowUpRight" className="h-4 w-4" />
      </Link>
    </div>
  );
}

export default function Dashboard() {
  usePageTitle("Dashboard");
  const session = getSession();
  const { orgs } = useOrganizations();
  const [reports, setReports] = useState<Report[] | null>(null);
  useEffect(() => { if (session) listAllReportsForDashboard(session).then(setReports); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const [range, setRange] = useState("all");
  const [cat, setCat] = useState<CategoryId | "all">("all");
  const [org, setOrg] = useState("all");
  const filtered = useMemo(() => {
    if (!reports) return null;
    const since = range === "all" ? 0 : Date.now() - Number(range) * 86400000;
    return reports.filter(
      (r) => +new Date(r.createdAt) >= since && (cat === "all" || r.category === cat) && (org === "all" || r.orgId === org)
    );
  }, [reports, range, cat, org]);
  const stats = useMemo(() => (filtered ? computeStats(filtered) : null), [filtered]);
  const filtering = range !== "all" || cat !== "all" || org !== "all";
  const sel = "rounded-full border border-line bg-white px-4 py-2 text-sm font-medium shadow-sm focus:border-civic";

  if (!session || session.role !== "admin") {
    return <p>The dashboard is for city administrators. <Link className="link" to="/staff">Sign in</Link></p>;
  }
  if (!reports || !filtered || !stats) return <p className="text-muted">Loading...</p>;

  const count = (list: Status[]) => list.reduce((n, s) => n + (stats.byStatus[s] ?? 0), 0);
  const closed = stats.byStatus.closed ?? 0;
  const progress = count(IN_PROGRESS);
  const pending = count(PENDING);
  const others = stats.total - closed - progress - pending; // incomplete and duplicate
  const maxCategory = Math.max(1, ...CATEGORIES.map((c) => stats.byCategory[c.id]));
  const maxOpen = Math.max(1, ...orgs.map((o) => stats.byOrg[o.id]?.open ?? 0));
  const maxStatus = Math.max(1, ...Object.values(stats.byStatus));

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight md:text-4xl">Dashboard</h1>
          <p className="mt-1 text-muted">Track how reports are moving and where help is needed.</p>
        </div>
        {import.meta.env.DEV && (
          <button onClick={async () => { await devSeedDemoReports(); setReports(await listAllReportsForDashboard(session)); }} className="text-xs text-muted underline">
            Dev only: add 24 sample reports
          </button>
        )}
      </div>

      {reports.length > 0 && (
        <div className="mt-6 flex flex-wrap items-end gap-x-4 gap-y-3">
          <div>
            <label htmlFor="f-range" className="mb-1 block text-xs font-semibold text-muted">Submitted</label>
            <select id="f-range" value={range} onChange={(e) => setRange(e.target.value)} className={sel}>
              <option value="all">All time</option>
              <option value="7">Last 7 days</option>
              <option value="30">Last 30 days</option>
              <option value="90">Last 90 days</option>
            </select>
          </div>
          <div>
            <label htmlFor="f-cat" className="mb-1 block text-xs font-semibold text-muted">Category</label>
            <select id="f-cat" value={cat} onChange={(e) => setCat(e.target.value as CategoryId | "all")} className={sel}>
              <option value="all">All categories</option>
              {CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="f-org" className="mb-1 block text-xs font-semibold text-muted">Organization</label>
            <select id="f-org" value={org} onChange={(e) => setOrg(e.target.value)} className={sel}>
              <option value="all">All organizations</option>
              {orgs.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
            </select>
          </div>
          {filtering && (
            <button onClick={() => { setRange("all"); setCat("all"); setOrg("all"); }} className="link pb-2 text-sm">Clear filters</button>
          )}
          <p className="pb-2 text-sm text-muted" aria-live="polite">Showing {filtered.length} of {reports.length} reports</p>
        </div>
      )}

      {stats.total === 0 ? (
        <p className="mt-8 text-muted">{reports.length === 0 ? "No reports yet. Submitted reports will appear here." : "No reports match these filters."}</p>
      ) : (
        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-12">
          <dl className="grid gap-4 md:col-span-2 md:grid-cols-2 xl:col-span-12 xl:grid-cols-4">
            <StatCard hero label="Total reports" value={String(stats.total)} hint="Everything in this view" to="/staff" />
            <StatCard label="Open reports" value={String(stats.open)} hint="Not yet closed" to="/staff" />
            <StatCard label={`Overdue (open over ${OVERDUE_DAYS} days)`} value={String(stats.overdue)} hint="Open too long. Follow these up" to="/staff" danger={stats.overdue > 0} />
            <StatCard label="Closed reports" value={String(stats.closed)} hint="Solved and checked" to="/staff?filter=closed" />
          </dl>

          <Panel title="New reports per week (last 8 weeks)" className="md:col-span-2 xl:col-span-6">
            <PillBars data={stats.weekly.map((w) => ({ label: w.label, count: w.count }))} />
          </Panel>

          <Panel title="Automatic summary" className="xl:col-span-3">
            <ul className="grid list-disc gap-2 pl-5 text-sm">
              {summarize(stats, orgs).map((line) => <li key={line}>{line}</li>)}
            </ul>
            <p className="mt-3 text-xs text-muted">
              Template-based summary built only from the figures on this page. It does not explain causes or judge any institution.
            </p>
            <Link to="/staff" className="btn btn-primary mt-auto self-start">
              <Icon name="clipboard" className="h-5 w-5" /> View reports
            </Link>
          </Panel>

          <Panel title="Reports by category" className="xl:col-span-3">
            <ul className="grid gap-4">
              {CATEGORIES.map((c) => (
                <li key={c.id}>
                  <div className="flex items-center gap-3">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-civic-soft text-civic"><Icon name={CATEGORY_ICON[c.id]} className="h-5 w-5" /></span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold">{c.label}</span>
                      <span className="block text-xs text-muted">{stats.byCategory[c.id]} {stats.byCategory[c.id] === 1 ? "report" : "reports"}</span>
                    </span>
                  </div>
                  <div className="mt-2"><HBar value={stats.byCategory[c.id]} max={maxCategory} /></div>
                </li>
              ))}
            </ul>
          </Panel>

          <Panel
            title="Workload by organization (open reports)"
            className="md:col-span-2 xl:col-span-5"
            action={<Link to="/staff/organizations" className="btn btn-secondary btn-sm">Manage organizations</Link>}
          >
            {orgs.length === 0 ? (
              <p className="text-sm text-muted">No organizations yet.</p>
            ) : (
              <ul className="grid gap-4">
                {orgs.map((o, i) => {
                  const open = stats.byOrg[o.id]?.open ?? 0;
                  const assigned = stats.byOrg[o.id]?.assigned ?? 0;
                  return (
                    <li key={o.id}>
                      <div className="flex items-center gap-3">
                        <span aria-hidden className={`grid h-10 w-10 shrink-0 place-items-center rounded-full text-sm font-bold ${AVATAR[i % AVATAR.length]}`}>{o.name.charAt(0).toUpperCase()}</span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold">{o.name}</span>
                          <span className="block text-xs text-muted">{open} open {open === 1 ? "report" : "reports"}</span>
                        </span>
                        <span className="pill bg-paper text-muted">{assigned} assigned</span>
                      </div>
                      <div className="mt-2"><HBar value={open} max={maxOpen} tone="bg-civic-mid" /></div>
                    </li>
                  );
                })}
              </ul>
            )}
          </Panel>

          <Panel title="Resolution progress" className="xl:col-span-4">
            <Gauge closed={closed} progress={progress} pending={pending} total={stats.total} />
            <ul className="mt-5 flex flex-wrap justify-center gap-x-5 gap-y-2 text-xs font-medium">
              <li className="flex items-center gap-1.5"><span aria-hidden className="h-2.5 w-2.5 rounded-full bg-civic-dark" />Closed ({closed})</li>
              <li className="flex items-center gap-1.5"><span aria-hidden className="h-2.5 w-2.5 rounded-full bg-civic-mid" />In progress ({progress})</li>
              <li className="flex items-center gap-1.5"><span aria-hidden className="hatch h-2.5 w-2.5 rounded-full border border-line" />Pending ({pending})</li>
            </ul>
            {others > 0 && <p className="mt-3 text-center text-xs text-muted">Incomplete and duplicate reports ({others}) are not counted here.</p>}
          </Panel>

          <section className="card-dark flex flex-col justify-between gap-6 rounded-2xl p-6 text-white md:col-span-2 xl:col-span-3">
            <dl className="grid gap-6">
              <div>
                <dt className="text-sm font-medium text-white/80">{`Citizen satisfaction (${stats.ratingCount} ratings)`}</dt>
                <dd className="mt-2 text-5xl font-bold tracking-tight">
                  {stats.avgRating === null ? <span className="text-2xl">No ratings yet</span> : <><span>{stats.avgRating.toFixed(1)}</span> <span className="text-lg font-medium text-white/70">out of 5</span></>}
                </dd>
                <dd className="mt-1 text-xs text-white/70">Ratings from citizens</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-white/80">Average time to first review</dt>
                <dd className="mt-1 text-2xl font-semibold">{fmt(stats.avgFirstReviewHours, "hours")}</dd>
                <dd className="text-xs text-white/70">From sent to reviewed</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-white/80">Average time to resolution</dt>
                <dd className="mt-1 text-2xl font-semibold">{fmt(stats.avgResolutionDays, "days")}</dd>
                <dd className="text-xs text-white/70">From sent to closed</dd>
              </div>
            </dl>
          </section>

          <Panel title="Reports by status" className="md:col-span-2 xl:col-span-4">
            <ul className="grid gap-4">
              {(Object.keys(stats.byStatus) as Status[]).map((s) => (
                <li key={s}>
                  <div className="flex items-center justify-between gap-3">
                    <StatusPill status={s} />
                    <span className="text-sm font-semibold">{stats.byStatus[s] ?? 0}</span>
                  </div>
                  <div className="mt-2"><HBar value={stats.byStatus[s] ?? 0} max={maxStatus} /></div>
                </li>
              ))}
            </ul>
          </Panel>

          <Panel title="Report locations" className="md:col-span-2 xl:col-span-8">
            <ReportMap reports={filtered} />
          </Panel>
        </div>
      )}
    </div>
  );
}
