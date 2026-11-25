import { FormEvent, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { createOrganization, getSession, listAllReportsForDashboard, listStaffUsers } from "../api/client";
import StaffNav from "../components/StaffNav";
import { CATEGORIES, CategoryId, Report, StaffUser } from "../types";
import { useOrganizations } from "../useOrganizations";

export default function OrganizationsPage() {
  const session = getSession();
  const { orgs, reload } = useOrganizations();
  const [users, setUsers] = useState<StaffUser[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [name, setName] = useState("");
  const [category, setCategory] = useState<CategoryId>("electricity");
  const [msg, setMsg] = useState("");
  const [ok, setOk] = useState("");

  const refresh = () => {
    listStaffUsers().then(setUsers);
    if (session) listAllReportsForDashboard(session).then(setReports);
  };
  useEffect(refresh, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (!session || session.role !== "admin") {
    return <p>This page is for city administrators. <Link className="text-civic underline" to="/staff">Sign in</Link></p>;
  }

  const add = async (e: FormEvent) => {
    e.preventDefault();
    setMsg("");
    setOk("");
    const res = await createOrganization(name, category);
    if (typeof res === "string") return setMsg(res);
    setOk(`Added ${res.name}.`);
    setName("");
    reload();
    refresh();
  };

  const field = "mt-1 w-full rounded border border-line bg-white px-3 py-2";
  return (
    <div>
      <StaffNav session={session} />
      <h1 className="text-3xl font-bold tracking-tight">Organizations</h1>
      <p className="mt-1 text-sm text-muted">Institutions that receive and resolve reports.</p>

      <div className="mt-6 grid gap-8 lg:grid-cols-[1.6fr_1fr] lg:items-start">
        <div className="overflow-x-auto rounded-lg border border-line bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-line bg-paper text-muted">
              <tr>{["Name", "Handles", "Staff accounts", "Reports assigned"].map((h) => <th key={h} className="px-4 py-3 font-medium">{h}</th>)}</tr>
            </thead>
            <tbody>
              {orgs.length === 0 && <tr><td colSpan={4} className="px-4 py-6 text-muted">No organizations yet.</td></tr>}
              {orgs.map((o) => (
                <tr key={o.id} className="border-b border-line last:border-0">
                  <td className="px-4 py-3 font-medium">{o.name}</td>
                  <td className="px-4 py-3">{CATEGORIES.find((c) => c.id === o.category)?.label}</td>
                  <td className="px-4 py-3">{users.filter((u) => u.orgId === o.id).length}</td>
                  <td className="px-4 py-3">{reports.filter((r) => r.orgId === o.id).length}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <form onSubmit={add} className="rounded-lg border border-line bg-white p-5">
          <h2 className="font-semibold">Add an organization</h2>
          <label htmlFor="oname" className="mt-4 block text-sm font-medium">Name</label>
          <input id="oname" value={name} onChange={(e) => setName(e.target.value)} className={field} />
          <label htmlFor="ocat" className="mt-4 block text-sm font-medium">Type of problems it handles</label>
          <select id="ocat" value={category} onChange={(e) => setCategory(e.target.value as CategoryId)} className={field}>
            {CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
          {msg && <p role="alert" className="mt-3 text-sm text-alert">{msg}</p>}
          {ok && <p className="mt-3 text-sm text-civic" aria-live="polite">{ok}</p>}
          <button className="mt-4 rounded bg-civic px-5 py-2 font-semibold text-white hover:bg-civic-dark">Add organization</button>
        </form>
      </div>
    </div>
  );
}
