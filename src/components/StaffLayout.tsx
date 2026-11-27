import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { getSession, setSession } from "../api/client";
import StaffLogin from "../pages/StaffLogin";
import type { StaffSession } from "../types";
import { Icon, IconName, Logo } from "./icons";

const ITEMS: { to: string; label: string; icon: IconName; adminOnly?: boolean }[] = [
  { to: "/staff", label: "Reports", icon: "clipboard" },
  { to: "/staff/dashboard", label: "Dashboard", icon: "chart", adminOnly: true },
  { to: "/staff/organizations", label: "Organizations", icon: "building", adminOnly: true },
  { to: "/staff/users", label: "Staff accounts", icon: "users", adminOnly: true },
];

export default function StaffLayout() {
  const [session, setS] = useState<StaffSession | null>(getSession());
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { pathname } = useLocation();
  useEffect(() => { setOpen(false); }, [pathname]);

  if (!session) return <StaffLogin onLogin={(s) => { setSession(s); setS(s); }} />;

  const admin = session.role === "admin";
  const roleLabel = admin ? "City administrator" : "Service provider";
  const signOut = () => { setSession(null); setS(null); navigate("/staff"); };
  const item = (active: boolean) =>
    `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors ${active ? "bg-civic text-white" : "text-muted hover:bg-civic-soft hover:text-civic-dark"}`;

  return (
    <div className="min-h-screen md:flex">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[60] focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:font-semibold focus:shadow-lg">
        Skip to main content
      </a>

      {open && <button type="button" aria-label="Close menu" className="fixed inset-0 z-40 bg-ink/40 md:hidden" onClick={() => setOpen(false)} />}

      <aside
        className={`w-64 shrink-0 flex-col border-r border-line bg-white ${
          open ? "fixed inset-y-0 left-0 z-50 flex shadow-xl md:sticky md:top-0 md:h-screen md:shadow-none" : "hidden md:sticky md:top-0 md:flex md:h-screen"
        }`}
      >
        <Link to="/staff" className="flex h-16 items-center gap-2.5 border-b border-line px-5" aria-label="CivicShield staff portal home">
          <Logo />
          <span className="leading-tight">
            <span className="block text-lg font-bold tracking-tight">CivicShield</span>
            <span className="block text-xs text-muted">Staff portal</span>
          </span>
        </Link>

        <nav aria-label="Staff" className="flex-1 overflow-y-auto p-3">
          <ul className="grid gap-1">
            {ITEMS.filter((i) => admin || !i.adminOnly).map((i) => (
              <li key={i.to}>
                <NavLink to={i.to} end={i.to === "/staff"} className={({ isActive }) => item(isActive || (i.to === "/staff" && pathname.startsWith("/staff/report/")))}>
                  <Icon name={i.icon} className="h-5 w-5" />
                  {i.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className="border-t border-line p-3">
          <Link to="/" className={item(false)}>
            <Icon name="globe" className="h-5 w-5" />
            Public website
          </Link>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-line bg-white/95 px-4 backdrop-blur sm:px-6">
          <button type="button" className="btn btn-ghost btn-sm md:hidden" aria-expanded={open} aria-label="Open menu" onClick={() => setOpen(true)}>
            <Icon name="menu" className="h-6 w-6" />
          </button>
          <p className="hidden text-sm font-semibold text-muted sm:block">{admin ? "Administration" : "Service provider workspace"}</p>
          <span className="ml-auto flex items-center gap-3">
            <span className="hidden text-right leading-tight sm:block">
              <span className="block text-sm font-semibold">{session.name}</span>
              {session.name !== roleLabel && <span className="block text-xs text-muted">{roleLabel}</span>}
            </span>
            <span aria-hidden className="grid h-9 w-9 place-items-center rounded-full bg-civic-soft font-bold text-civic-dark">
              {session.name.trim().charAt(0).toUpperCase()}
            </span>
            <button onClick={signOut} className="btn btn-ghost btn-sm">
              <Icon name="logout" className="h-4 w-4" />
              Sign out
            </button>
          </span>
        </header>

        <main id="main" tabIndex={-1} className="flex-1 p-4 outline-none sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
