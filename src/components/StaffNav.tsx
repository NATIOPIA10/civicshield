import { NavLink, useNavigate } from "react-router-dom";
import { setSession } from "../api/client";
import type { StaffSession } from "../types";

export default function StaffNav({ session, onSignOut }: { session: StaffSession; onSignOut?: () => void }) {
  const navigate = useNavigate();
  const signOut = onSignOut ?? (() => { setSession(null); navigate("/staff"); });
  const link = ({ isActive }: { isActive: boolean }) =>
    `rounded px-3 py-1.5 text-sm font-medium ${isActive ? "bg-civic text-white" : "text-muted hover:text-ink"}`;
  return (
    <nav aria-label="Staff" className="mb-8 flex flex-wrap items-center gap-1 border-b border-line pb-3">
      <NavLink to="/staff" end className={link}>Reports</NavLink>
      {session.role === "admin" && (
        <>
          <NavLink to="/staff/dashboard" className={link}>Dashboard</NavLink>
          <NavLink to="/staff/organizations" className={link}>Organizations</NavLink>
          <NavLink to="/staff/users" className={link}>Staff accounts</NavLink>
        </>
      )}
      <span className="ml-auto flex items-center gap-3 text-sm">
        <span className="text-muted">{session.name}</span>
        <button onClick={signOut} className="font-medium text-civic underline">Sign out</button>
      </span>
    </nav>
  );
}
