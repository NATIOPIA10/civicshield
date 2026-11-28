import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { getSession, listStaffReports } from "../api/client";
import { CATEGORY_ICON, Icon } from "../components/icons";
import ReportMap from "../components/ReportMap";
import { PageHeader, StatusPill } from "../components/ui";
import { CATEGORIES, CategoryId, Report, Status } from "../types";
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

const AVATAR = ["bg-civic-soft text-civic-dark", "bg-info-soft text-info", "bg-signal-soft text-signal", "bg-alert-soft text-alert"];
const sel = "rounded-full border border-line bg-white px-4 py-2 text-sm font-medium shadow-sm focus:border-civic";

export default function StaffReports() {
  usePageTitle("Reports");
  const [session] = useState(getSession);
  const [reports, setReports] = useState<Report[] | null>(null);
  const [params] = useSearchParams();
  const q = (params.get("q") ?? "").trim();
  const filterParam = params.get("filter");
  const [filterKey, setFilterKey] = useState(filterParam ?? "all");
  useEffect(() => { if (filterParam) setFilterKey(filterParam); }, [filterParam]);
  const [category, setCategory] = useState<CategoryId | "all">("all");
  const [org, setOrg] = useState("all");
  const [view, setView] = useState<"list" | "map">("list");
  const { orgs, orgName } = useOrganizations();
  useEffect(() => { if (session) listStaffReports(session).then(setReports); }, [session]);

  if (!session) return null;
  const admin = session.role === "admin";
  const filters = admin ? ADMIN_FILTERS : PROVIDER_FILTERS;
  const active = filters.find((f) => f.key === filterKey) ?? filters[0];
  const countOf = (f: Filter) => (reports ?? []).filter((r) => !f.statuses || f.statuses.includes(r.status)).length;
  const matches = (r: Report) =>
    !q ||
    [r.id, r.area, r.description, CATEGORIES.find((c) => c.id === r.category)?.label ?? ""].some((v) => v.toLowerCase().includes(q.toLowerCase()));
  const rows = (reports ?? []).filter(
    (r) =>
      (!active.statuses || active.statuses.includes(r.status)) &&
      (category === "all" || r.category === category) &&
      (org === "all" || r.orgId === org) &&
      matches(r)
  );
  const filtering = category !== "all" || org !== "all";
  const orgIndex = (id?: string) => Math.max(0, orgs.findIndex((o) => o.id === id));

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
          const needsAction = Boolean(f.attention) && (n ?? 0) > 0;
          return (
            <button
              key={f.key}
              type="button"
              aria-pressed={selected}
              onClick={() => setFilterKey(f.key)}
              className={`relative rounded-2xl p-5 text-left transition-shadow hover:shadow-md ${selected ? "card-hero text-white shadow-md" : "card"}`}
            >
              <span className="block pr-10 text-base font-semibold">
                {f.label}
                {needsAction && !selected && <span aria-hidden className="ml-2 inline-block h-2 w-2 rounded-full bg-signal align-middle" />}
              </span>
              <span className="mt-4 block text-5xl font-bold tracking-tight">{n ?? "–"}</span>
              <span className={`mt-3 block text-xs ${selected ? "text-white/80" : "text-muted"}`}>{f.hint}</span>
              <span
                aria-hidden
                className={`absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-full border ${selected ? "border-transparent bg-white text-civic-dark" : "border-line text-ink"}`}
              >
                <Icon name="arrowUpRight" className="h-4 w-4" />
              </span>
            </button>
          );
        })}
      </div>

      {q && (
        <p className="mt-6 text-sm text-muted" aria-live="polite">
          Showing reports that match “{q}”. <Link to="/staff" className="link">Clear search</Link>
        </p>
      )}

      <section className="card mt-6 overflow-hidden rounded-2xl">
        <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4 p-5">
          <div>
            <h2 className="text-base font-semibold">Report list</h2>
            <p className="mt-0.5 text-sm text-muted" aria-live="polite">
              {reports === null ? "Loading..." : `${rows.length} ${rows.length === 1 ? "report" : "reports"} · ${active.label}`}
            </p>
          </div>

          <div className="flex flex-wrap items-end gap-x-4 gap-y-3">
            <div>
              <label htmlFor="l-cat" className="mb-1 block text-xs font-semibold text-muted">Category</label>
              <select id="l-cat" value={category} onChange={(e) => setCategory(e.target.value as CategoryId | "all")} className={sel}>
                <option value="all">All categories</option>
                {CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
            </div>
            {admin && (
              <div>
                <label htmlFor="l-org" className="mb-1 block text-xs font-semibold text-muted">Organization</label>
                <select id="l-org" value={org} onChange={(e) => setOrg(e.target.value)} className={sel}>
                  <option value="all">All organizations</option>
                  {orgs.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
                </select>
              </div>
            )}
            {filtering && (
              <button type="button" onClick={() => { setCategory("all"); setOrg("all"); }} className="link pb-2 text-sm">Clear filters</button>
            )}
            <div className="inline-flex rounded-full border border-line bg-white p-0.5" role="group" aria-label="Show reports as">
              {(["list", "map"] as const).map((v) => (
                <button
                  key={v}
                  aria-pressed={view === v}
                  onClick={() => setView(v)}
                  className={`rounded-full px-4 py-1.5 text-sm font-semibold ${view === v ? "bg-civic text-white" : "text-muted hover:text-ink"}`}
                >
                  {v === "list" ? "List" : "Map"}
                </button>
              ))}
            </div>
          </div>
        </div>

        {view === "map" && <div className="border-t border-line p-5"><ReportMap reports={rows} /></div>}

        <div className={`overflow-x-auto border-t border-line ${view === "map" ? "hidden" : ""}`}>
          <table className="w-full text-left text-sm">
            <thead className="bg-paper text-muted">
              <tr>{["Report ID", "Category", "Area", "Status", "Assigned to", "Submitted"].map((h) => <th key={h} className="px-5 py-3 font-semibold">{h}</th>)}</tr>
            </thead>
            <tbody>
              {reports === null && <tr><td colSpan={6} className="px-5 py-6 text-muted">Loading...</td></tr>}
              {reports && rows.length === 0 && (
                <tr><td colSpan={6} className="px-5 py-10 text-center text-muted">{q ? "No reports match your search." : "No reports here yet."}</td></tr>
              )}
              {rows.map((r) => {
                const cat = CATEGORIES.find((c) => c.id === r.category);
                const name = orgName(r.orgId);
                return (
                  <tr key={r.id} className="border-t border-line hover:bg-paper">
                    <td className="px-5 py-3.5 font-mono"><Link className="link" to={`/staff/report/${r.id}`}>{r.id}</Link></td>
                    <td className="px-5 py-3.5">
                      <span className="flex items-center gap-2.5">
                        <span aria-hidden className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-civic-soft text-civic"><Icon name={CATEGORY_ICON[r.category]} className="h-4 w-4" /></span>
                        {cat?.label}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">{r.area}</td>
                    <td className="px-5 py-3.5"><StatusPill status={r.status} /></td>
                    <td className="px-5 py-3.5">
                      {name ? (
                        <span className="flex items-center gap-2.5">
                          <span aria-hidden className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-bold ${AVATAR[orgIndex(r.orgId) % AVATAR.length]}`}>{name.charAt(0).toUpperCase()}</span>
                          {name}
                        </span>
                      ) : (
                        <span className="text-muted">Not assigned</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-muted">{new Date(r.createdAt).toLocaleDateString()}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
