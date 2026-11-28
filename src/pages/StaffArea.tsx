import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { getSession, listStaffReports } from "../api/client";
import ReportMap from "../components/ReportMap";
import { PageHeader, StatusPill } from "../components/ui";
import { CATEGORIES, Report, Status } from "../types";
import { usePageTitle } from "../usePageTitle";
import { useOrganizations } from "../useOrganizations";

interface Filter { key: string; label: string; hint: string; statuses: Status[] | null; attention?: boolean }

/** Cards that answer "what needs me right now?" for each role. */
const ADMIN_FILTERS: Filter[] = [
  { key: "all", label: "All reports", hint: "Everything", statuses: null },
  { key: "new", label: "To review", hint: "New, not yet looked at", statuses: ["submitted"], attention: true },
  { key: "assign", label: "Ready to assign", hint: "Reviewed, needs an organization", statuses: ["under_review"], attention: true },
  { key: "approve", label: "Awaiting approval", hint: "Provider finished. Check the evidence", statuses: ["resolution_submitted"], attention: true },
  { key: "closed", label: "Closed", hint: "Solved or ended", statuses: ["closed", "incomplete", "duplicate"] },
];
const PROVIDER_FILTERS: Filter[] = [
  { key: "all", label: "All assigned", hint: "Everything given to you", statuses: null },
  { key: "start", label: "To start", hint: "Assigned, work not started", statuses: ["assigned"], attention: true },
  { key: "doing", label: "In progress", hint: "Being worked on, or sent back", statuses: ["in_progress", "returned"], attention: true },
  { key: "wait", label: "Waiting for approval", hint: "You submitted the result", statuses: ["resolution_submitted"] },
  { key: "closed", label: "Closed", hint: "Finished", statuses: ["closed"] },
];

export default function StaffReports() {
  usePageTitle("Reports");
  const [session] = useState(getSession);
  const [reports, setReports] = useState<Report[] | null>(null);
  const [params] = useSearchParams();
  const q = (params.get("q") ?? "").trim();
  const filterParam = params.get("filter");
  const [filterKey, setFilterKey] = useState(filterParam ?? "all");
  useEffect(() => { if (filterParam) setFilterKey(filterParam); }, [filterParam]);
  const [view, setView] = useState<"list" | "map">("list");
  const { orgName } = useOrganizations();
  useEffect(() => { if (session) listStaffReports(session).then(setReports); }, [session]);

  if (!session) return null;
  const admin = session.role === "admin";
  const filters = admin ? ADMIN_FILTERS : PROVIDER_FILTERS;
  const active = filters.find((f) => f.key === filterKey) ?? filters[0];
  const countOf = (f: Filter) => (reports ?? []).filter((r) => !f.statuses || f.statuses.includes(r.status)).length;
  const matches = (r: Report) =>
    !q ||
    [r.id, r.area, r.description, CATEGORIES.find((c) => c.id === r.category)?.label ?? ""].some((v) => v.toLowerCase().includes(q.toLowerCase()));
  const rows = (reports ?? []).filter((r) => (!active.statuses || active.statuses.includes(r.status)) && matches(r));

  return (
    <div>
      <PageHeader
        title={admin ? "All reports" : "Reports assigned to you"}
        subtitle={admin
          ? "Review new reports, assign them to an organization, and close them once the evidence is checked."
          : "Reports given to your organization. Start the work, then submit what you did with a photo."}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5" role="group" aria-label="Show reports">
        {filters.map((f) => {
          const n = reports === null ? null : countOf(f);
          const selected = f.key === active.key;
          return (
            <button
              key={f.key}
              type="button"
              aria-pressed={selected}
              onClick={() => setFilterKey(f.key)}
              className={`card border-t-4 p-4 text-left transition-shadow hover:shadow-md ${selected ? "border-civic bg-civic-soft" : f.attention && (n ?? 0) > 0 ? "border-t-signal" : "border-t-transparent"}`}
            >
              <span className="block text-sm font-semibold text-muted">{f.label}</span>
              <span className="mt-1 block text-3xl font-bold tracking-tight">{n ?? "–"}</span>
              <span className="mt-1 block text-xs text-muted">{f.hint}</span>
            </button>
          );
        })}
      </div>

      {q && (
        <p className="mt-4 text-sm text-muted" aria-live="polite">
          Showing reports that match “{q}”. <Link to="/staff" className="link">Clear search</Link>
        </p>
      )}

      <div className="mt-6 inline-flex rounded-lg border border-line bg-white p-0.5" role="group" aria-label="Show reports as">
        {(["list", "map"] as const).map((v) => (
          <button key={v} aria-pressed={view === v} onClick={() => setView(v)} className={`rounded-md px-4 py-1.5 text-sm font-semibold ${view === v ? "bg-civic text-white" : "text-muted hover:text-ink"}`}>
            {v === "list" ? "List" : "Map"}
          </button>
        ))}
      </div>

      {view === "map" && <div className="mt-4"><ReportMap reports={rows} /></div>}

      <div className={`card mt-4 overflow-x-auto ${view === "map" ? "hidden" : ""}`}>
        <table className="w-full text-left text-sm">
          <thead className="border-b border-line bg-paper text-muted">
            <tr>{["Report ID", "Category", "Area", "Status", "Assigned to", "Submitted"].map((h) => <th key={h} className="px-4 py-3 font-semibold">{h}</th>)}</tr>
          </thead>
          <tbody>
            {reports === null && <tr><td colSpan={6} className="px-4 py-6 text-muted">Loading...</td></tr>}
            {reports && rows.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-muted">{q ? "No reports match your search." : "No reports here yet."}</td></tr>}
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-line last:border-0 hover:bg-paper">
                <td className="px-4 py-3 font-mono"><Link className="link" to={`/staff/report/${r.id}`}>{r.id}</Link></td>
                <td className="px-4 py-3">{CATEGORIES.find((c) => c.id === r.category)?.label}</td>
                <td className="px-4 py-3">{r.area}</td>
                <td className="px-4 py-3"><StatusPill status={r.status} /></td>
                <td className="px-4 py-3">{orgName(r.orgId) ?? "Not assigned"}</td>
                <td className="px-4 py-3">{new Date(r.createdAt).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
