import { NavLink, useNavigate } from "react-router-dom";
import { setSession } from "../api/client";
import type { StaffSession } from "../types";

export default function StaffNav({ session, onSignOut }: { session: StaffSession; onSignOut?: () => void }) {
  const navigate = useNavigate();
  const signOut = onSignOut ?? (() => { setSession(null); navigate("/staff"); });
  const link = ({ isActive }: { isActive: boolean }) =>
    `inline-flex min-h-10 items-center rounded-lg px-4 text-sm font-semibold transition-colors ${isActive ? "bg-civic text-white" : "text-muted hover:bg-civic-soft hover:text-civic-dark"}`;
  return (
    <nav aria-label="Staff" className="card mb-8 flex flex-wrap items-center gap-1 p-2">
      <NavLink to="/staff" end className={link}>Reports</NavLink>
      {session.role === "admin" && (
        <>
          <NavLink to="/staff/dashboard" className={link}>Dashboard</NavLink>
          <NavLink to="/staff/organizations" className={link}>Organizations</NavLink>
          <NavLink to="/staff/users" className={link}>Staff accounts</NavLink>
        </>
      )}
      <span className="ml-auto flex items-center gap-3 pr-1">
        <span className="hidden text-right leading-tight sm:block">
          <span className="block text-sm font-semibold">{session.name}</span>
          <span className="block text-xs text-muted">{session.role === "admin" ? "City administrator" : "Service provider"}</span>
        </span>
        <span aria-hidden className="grid h-9 w-9 place-items-center rounded-full bg-civic-soft font-bold text-civic-dark">
          {session.name.trim().charAt(0).toUpperCase()}
        </span>
        <button onClick={signOut} className="btn btn-ghost btn-sm">Sign out</button>
      </span>
    </nav>
  );
}
