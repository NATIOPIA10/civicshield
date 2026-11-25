import { FormEvent, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getSession, listStaffReports, setSession, staffLogin } from "../api/client";
import ReportMap from "../components/ReportMap";
import StaffNav from "../components/StaffNav";
import { CATEGORIES, Report, STATUS_LABEL, StaffSession, Status } from "../types";
import { useOrganizations } from "../useOrganizations";

function Login({ onLogin }: { onLogin: (s: StaffSession) => void }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    const s = await staffLogin(username, password);
    setBusy(false);
    if (s) onLogin(s);
    else setError("Wrong username or password.");
  };

  const field = "mt-1 w-full rounded border border-line bg-white px-3 py-2";
  return (
    <form onSubmit={submit} className="mx-auto max-w-md">
      <h1 className="text-3xl font-bold tracking-tight">Staff sign in</h1>
      <p className="mt-2 text-sm text-muted">For city administrators and service-provider representatives.</p>
      <div className="mt-6">
        <label htmlFor="u" className="font-semibold">Username</label>
        <input id="u" value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" className={field} />
      </div>
      <div className="mt-4">
        <label htmlFor="p" className="font-semibold">Password</label>
        <input id="p" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" className={field} />
      </div>
      {error && <p role="alert" className="mt-3 text-sm text-alert">{error}</p>}
      <button disabled={busy || !username || !password} className="mt-6 rounded bg-civic px-6 py-3 font-semibold text-white hover:bg-civic-dark disabled:opacity-60">
        {busy ? "Signing in..." : "Sign in"}
      </button>
      {import.meta.env.DEV && (
        <p className="mt-8 rounded bg-white p-3 text-xs text-muted">
          Development accounts: <span className="font-mono">admin / admin12345</span>, or{" "}
          <span className="font-mono">provider_water / provider12345</span> (also provider_electric, provider_telecom, provider_roads).
        </p>
      )}
    </form>
  );
}

function Queue({ session, onLogout }: { session: StaffSession; onLogout: () => void }) {
  const [reports, setReports] = useState<Report[] | null>(null);
  const [filter, setFilter] = useState<Status | "all">("all");
  const [view, setView] = useState<"list" | "map">("list");
  const { orgName } = useOrganizations();
  useEffect(() => { listStaffReports(session).then(setReports); }, [session]);

  const counts = (reports ?? []).reduce<Record<string, number>>((m, r) => ({ ...m, [r.status]: (m[r.status] ?? 0) + 1 }), {});
  const rows = (reports ?? []).filter((r) => filter === "all" || r.status === filter);
  const chip = (active: boolean) => `rounded border px-3 py-1.5 text-sm ${active ? "border-civic bg-civic text-white" : "border-line bg-white"}`;

  return (
    <div>
      <StaffNav session={session} onSignOut={onLogout} />
      <h1 className="text-3xl font-bold tracking-tight">{session.role === "admin" ? "All reports" : "Reports assigned to you"}</h1>

      <div className="mt-6 flex flex-wrap gap-2" role="group" aria-label="Filter by status">
        <button onClick={() => setFilter("all")} className={chip(filter === "all")}>All ({reports?.length ?? 0})</button>
        {(Object.keys(counts) as Status[]).map((s) => (
          <button key={s} onClick={() => setFilter(s)} className={chip(filter === s)}>{STATUS_LABEL[s]} ({counts[s]})</button>
        ))}
      </div>

      <div className="mt-4 inline-flex rounded border border-line bg-white p-0.5" role="group" aria-label="Show reports as">
        {(["list", "map"] as const).map((v) => (
          <button key={v} aria-pressed={view === v} onClick={() => setView(v)} className={`rounded px-4 py-1.5 text-sm font-medium ${view === v ? "bg-civic text-white" : "text-muted hover:text-ink"}`}>
            {v === "list" ? "List" : "Map"}
          </button>
        ))}
      </div>

      {view === "map" && <div className="mt-4"><ReportMap reports={rows} /></div>}

      <div className={`mt-6 overflow-x-auto rounded-lg border border-line bg-white ${view === "map" ? "hidden" : ""}`}>
        <table className="w-full text-left text-sm">
          <thead className="border-b border-line bg-paper text-muted">
            <tr>{["Report ID", "Category", "Area", "Status", "Assigned to", "Submitted"].map((h) => <th key={h} className="px-4 py-3 font-medium">{h}</th>)}</tr>
          </thead>
          <tbody>
            {reports === null && <tr><td colSpan={6} className="px-4 py-6 text-muted">Loading...</td></tr>}
            {reports && rows.length === 0 && <tr><td colSpan={6} className="px-4 py-6 text-muted">No reports here yet.</td></tr>}
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-line last:border-0 hover:bg-paper">
                <td className="px-4 py-3 font-mono"><Link className="text-civic underline" to={`/staff/report/${r.id}`}>{r.id}</Link></td>
                <td className="px-4 py-3">{CATEGORIES.find((c) => c.id === r.category)?.label}</td>
                <td className="px-4 py-3">{r.area}</td>
                <td className="px-4 py-3">{STATUS_LABEL[r.status]}</td>
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

export default function StaffArea() {
  const [session, setS] = useState<StaffSession | null>(getSession());
  if (!session) return <Login onLogin={(s) => { setSession(s); setS(s); }} />;
  return <Queue session={session} onLogout={() => { setSession(null); setS(null); }} />;
}
