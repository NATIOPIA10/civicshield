import { FormEvent, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { createStaffUser, getSession, listStaffUsers } from "../api/client";
import { StaffUser } from "../types";
import { useOrganizations } from "../useOrganizations";

export default function UsersPage() {
  const session = getSession();
  const { orgs, orgName } = useOrganizations();
  const [users, setUsers] = useState<StaffUser[]>([]);
  const [form, setForm] = useState({ name: "", username: "", password: "", role: "provider" as "admin" | "provider", orgId: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [ok, setOk] = useState("");

  const load = () => { listStaffUsers().then(setUsers); };
  useEffect(load, []);

  if (!session || session.role !== "admin") {
    return <p>This page is for city administrators. <Link className="link" to="/staff">Sign in</Link></p>;
  }

  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));
  const add = async (e: FormEvent) => {
    e.preventDefault();
    setOk("");
    const res = await createStaffUser({ ...form, orgId: form.role === "provider" ? form.orgId : undefined });
    if ("role" in res && typeof res.role === "string" && "id" in res) {
      setErrors({});
      setOk(`Account ${res.username} created.`);
      setForm({ name: "", username: "", password: "", role: "provider", orgId: "" });
      load();
    } else {
      setErrors(res as Record<string, string>);
    }
  };

  const field = "input mt-1";
  const err = (k: string) => (errors[k] ? <p role="alert" className="mt-1 text-sm text-alert">{errors[k]}</p> : null);

  return (
    <div>
      <h1 className="text-3xl font-bold tracking-tight">Staff accounts</h1>
      <p className="mt-1 text-sm text-muted">City administrators and service-provider representatives.</p>

      <div className="mt-6 grid gap-8 lg:grid-cols-[1.6fr_1fr] lg:items-start">
        <div className="overflow-x-auto card">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-line bg-paper text-muted">
              <tr>{["Name", "Username", "Role", "Organization"].map((h) => <th key={h} className="px-4 py-3 font-medium">{h}</th>)}</tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-line last:border-0">
                  <td className="px-4 py-3 font-medium">{u.name}</td>
                  <td className="px-4 py-3 font-mono">{u.username}</td>
                  <td className="px-4 py-3">{u.role === "admin" ? "City administrator" : "Service provider"}</td>
                  <td className="px-4 py-3">{u.role === "admin" ? "-" : orgName(u.orgId) ?? u.orgId}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <form onSubmit={add} noValidate className="card p-5">
          <h2 className="font-semibold">Add an account</h2>
          <label htmlFor="n" className="mt-4 block text-sm font-medium">Full name</label>
          <input id="n" value={form.name} onChange={(e) => set("name", e.target.value)} className={field} />
          {err("name")}
          <label htmlFor="un" className="mt-4 block text-sm font-medium">Username</label>
          <input id="un" value={form.username} onChange={(e) => set("username", e.target.value)} autoComplete="off" className={field} />
          {err("username")}
          <label htmlFor="pw" className="mt-4 block text-sm font-medium">Password (at least 8 characters)</label>
          <input id="pw" type="password" value={form.password} onChange={(e) => set("password", e.target.value)} autoComplete="new-password" className={field} />
          {err("password")}
          <label htmlFor="role" className="mt-4 block text-sm font-medium">Role</label>
          <select id="role" value={form.role} onChange={(e) => set("role", e.target.value)} className={field}>
            <option value="provider">Service-provider representative</option>
            <option value="admin">City administrator</option>
          </select>
          {form.role === "provider" && (
            <>
              <label htmlFor="org" className="mt-4 block text-sm font-medium">Organization</label>
              <select id="org" value={form.orgId} onChange={(e) => set("orgId", e.target.value)} className={field}>
                <option value="">Choose...</option>
                {orgs.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
              </select>
              {err("orgId")}
            </>
          )}
          {ok && <p className="mt-3 text-sm text-civic" aria-live="polite">{ok}</p>}
          <button className="mt-4 btn btn-primary">Create account</button>
          <p className="mt-3 text-xs text-muted">In this prototype, accounts and passwords stay in your browser only.</p>
        </form>
      </div>
    </div>
  );
}
