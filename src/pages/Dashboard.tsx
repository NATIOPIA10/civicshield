import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { devSeedDemoReports, getSession, listAllReportsForDashboard } from "../api/client";
import { OVERDUE_DAYS, computeStats } from "../analytics";
import ReportMap from "../components/ReportMap";
import { summarize } from "../summary";
import StaffNav from "../components/StaffNav";
import { CATEGORIES, CategoryId, Report, STATUS_LABEL, Status } from "../types";
import { useOrganizations } from "../useOrganizations";

function Bars({ rows }: { rows: { label: string; value: number }[] }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <ul className="grid gap-2">
      {rows.map((r) => (
        <li key={r.label} className="grid grid-cols-[minmax(0,1fr)_2rem] items-center gap-3 text-sm sm:grid-cols-[14rem_1fr_2rem]">
          <span className="truncate sm:col-auto col-span-2">{r.label}</span>
          <span className="h-3 rounded bg-line"><span className="block h-3 rounded bg-civic" style={{ width: `${(r.value / max) * 100}%` }} /></span>
          <span className="text-right font-mono">{r.value}</span>
        </li>
      ))}
    </ul>
  );
}

const Panel = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="card p-5">
    <h2 className="mb-4 font-semibold">{title}</h2>
    {children}
  </section>
);

const fmt = (n: number | null, unit: string, digits = 1) => (n === null ? "No data yet" : `${n.toFixed(digits)} ${unit}`);

export default function Dashboard() {
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
  const sel = "input mt-1 w-auto text-sm";

  if (!session || session.role !== "admin") {
    return <p>The dashboard is for city administrators. <Link className="link" to="/staff">Sign in</Link></p>;
  }
  if (!reports || !filtered || !stats) return <p className="text-muted">Loading...</p>;

  const tiles = [
    { label: "Total reports", value: String(stats.total) },
    { label: "Open reports", value: String(stats.open) },
    { label: `Overdue (open over ${OVERDUE_DAYS} days)`, value: String(stats.overdue) },
    { label: "Closed reports", value: String(stats.closed) },
    { label: "Average time to first review", value: fmt(stats.avgFirstReviewHours, "hours") },
    { label: "Average time to resolution", value: fmt(stats.avgResolutionDays, "days") },
    { label: `Citizen satisfaction (${stats.ratingCount} ratings)`, value: stats.avgRating === null ? "No ratings yet" : `${stats.avgRating.toFixed(1)} out of 5` },
  ];

  return (
    <div>
      <StaffNav session={session} />
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        </div>
        {import.meta.env.DEV && (
          <button onClick={async () => { await devSeedDemoReports(); setReports(await listAllReportsForDashboard(session)); }} className="text-xs text-muted underline">
            Dev only: add 24 sample reports
          </button>
        )}
      </div>

      {reports.length > 0 && (
        <div className="mt-6 flex flex-wrap items-end gap-4 card p-4">
          <div>
            <label htmlFor="f-range" className="block text-sm font-medium">Submitted</label>
            <select id="f-range" value={range} onChange={(e) => setRange(e.target.value)} className={sel}>
              <option value="all">All time</option>
              <option value="7">Last 7 days</option>
              <option value="30">Last 30 days</option>
              <option value="90">Last 90 days</option>
            </select>
          </div>
          <div>
            <label htmlFor="f-cat" className="block text-sm font-medium">Category</label>
            <select id="f-cat" value={cat} onChange={(e) => setCat(e.target.value as CategoryId | "all")} className={sel}>
              <option value="all">All categories</option>
              {CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="f-org" className="block text-sm font-medium">Organization</label>
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
        <>
          <div className="mt-6">
            <Panel title="Automatic summary">
              <ul className="grid max-w-3xl list-disc gap-1 pl-5">
                {summarize(stats, orgs).map((line) => <li key={line}>{line}</li>)}
              </ul>
              <p className="mt-3 text-xs text-muted">
                Template-based summary built only from the figures on this page. It does not explain causes or judge any institution.
              </p>
            </Panel>
          </div>

          <dl className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {tiles.map((t) => (
              <div key={t.label} className="card p-4">
                <dt className="text-sm text-muted">{t.label}</dt>
                <dd className="mt-1 text-2xl font-bold">{t.value}</dd>
              </div>
            ))}
          </dl>

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <Panel title="Reports by category">
              <Bars rows={CATEGORIES.map((c) => ({ label: c.label, value: stats.byCategory[c.id] }))} />
            </Panel>
            <Panel title="Reports by status">
              <Bars rows={(Object.keys(stats.byStatus) as Status[]).map((s) => ({ label: STATUS_LABEL[s], value: stats.byStatus[s] ?? 0 }))} />
            </Panel>
            <Panel title="Workload by organization (open reports)">
              <Bars rows={orgs.map((o) => ({ label: o.name, value: stats.byOrg[o.id]?.open ?? 0 }))} />
            </Panel>
            <Panel title="New reports per week (last 8 weeks)">
              <Bars rows={stats.weekly.map((w) => ({ label: `Week ending ${w.label}`, value: w.count }))} />
            </Panel>
          </div>

          <div className="mt-6"><Panel title="Report locations"><ReportMap reports={filtered} /></Panel></div>
        </>
      )}
    </div>
  );
}
