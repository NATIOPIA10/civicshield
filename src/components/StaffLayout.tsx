import { FormEvent, useEffect, useRef, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { getSession, setSession } from "../api/client";
import StaffLogin from "../pages/StaffLogin";
import type { StaffSession } from "../types";
import { useAttention } from "../useAttention";
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
  const [bellOpen, setBellOpen] = useState(false);
  const [params] = useSearchParams();
  const qParam = params.get("q") ?? "";
  const [q, setQ] = useState(qParam);
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const searchRef = useRef<HTMLInputElement>(null);
  const bellRef = useRef<HTMLDivElement>(null);
  const attention = useAttention(session, pathname);

  useEffect(() => { setOpen(false); setBellOpen(false); }, [pathname]);
  useEffect(() => { setQ(qParam); }, [qParam]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      const typing = Boolean(t && (/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || t.isContentEditable));
      if (e.key === "/" && !typing) { e.preventDefault(); searchRef.current?.focus(); }
      if (e.key === "Escape") setBellOpen(false);
    };
    const onDown = (e: MouseEvent) => {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) setBellOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onDown);
    return () => { document.removeEventListener("keydown", onKey); document.removeEventListener("mousedown", onDown); };
  }, []);

  if (!session) return <StaffLogin onLogin={(s) => { setSession(s); setS(s); }} />;

  const admin = session.role === "admin";
  const roleLabel = admin ? "City administrator" : "Service provider";
  const signOut = () => { setSession(null); setS(null); navigate("/staff"); };
  const search = (e: FormEvent) => {
    e.preventDefault();
    navigate(q.trim() ? `/staff?q=${encodeURIComponent(q.trim())}` : "/staff");
  };

  // Active item: a green bar on the left and bold text, as in the design reference.
  const item = (active: boolean) =>
    `relative flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-left text-sm font-semibold transition-colors ${
      active
        ? "text-ink before:absolute before:left-0 before:top-1/2 before:h-7 before:w-1 before:-translate-y-1/2 before:rounded-r-full before:bg-civic"
        : "text-muted hover:bg-paper hover:text-ink"
    }`;

  return (
    <div className="min-h-screen bg-shell p-3 md:flex md:gap-3">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[60] focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:font-semibold focus:shadow-lg">
        Skip to main content
      </a>

      {open && <button type="button" aria-label="Close menu" className="fixed inset-0 z-40 bg-ink/40 md:hidden" onClick={() => setOpen(false)} />}

      <aside
        className={`w-64 shrink-0 flex-col rounded-2xl bg-white shadow-sm ${
          open ? "fixed inset-y-3 left-3 z-50 flex shadow-xl md:sticky md:top-3 md:h-[calc(100vh-1.5rem)] md:shadow-sm" : "hidden md:sticky md:top-3 md:flex md:h-[calc(100vh-1.5rem)]"
        }`}
      >
        <Link to="/staff" className="flex h-20 items-center gap-2.5 px-6" aria-label="CivicShield staff portal home">
          <Logo />
          <span className="leading-tight">
            <span className="block text-lg font-bold tracking-tight">CivicShield</span>
            <span className="block text-xs text-muted">Staff portal</span>
          </span>
        </Link>

        <nav aria-label="Staff" className="flex-1 overflow-y-auto px-3 pb-3">
          <p className="px-4 pb-2 pt-3 text-xs font-semibold tracking-wider text-muted">MENU</p>
          <ul className="grid gap-1">
            {ITEMS.filter((i) => admin || !i.adminOnly).map((i) => (
              <li key={i.to}>
                <NavLink to={i.to} end={i.to === "/staff"} className={({ isActive }) => item(isActive || (i.to === "/staff" && pathname.startsWith("/staff/report/")))}>
                  <Icon name={i.icon} className="h-5 w-5" />
                  {i.label}
                  {i.to === "/staff" && attention.total > 0 && (
                    <span aria-hidden className="ml-auto rounded-full bg-civic px-2 py-0.5 text-xs font-bold text-white">{attention.total}</span>
                  )}
                </NavLink>
              </li>
            ))}
          </ul>

          <p className="px-4 pb-2 pt-6 text-xs font-semibold tracking-wider text-muted">GENERAL</p>
          <ul className="grid gap-1">
            <li>
              <Link to="/" className={item(false)}>
                <Icon name="globe" className="h-5 w-5" />
                Public website
              </Link>
            </li>
            <li>
              <button type="button" onClick={signOut} className={item(false)}>
                <Icon name="logout" className="h-5 w-5" />
                Sign out
              </button>
            </li>
          </ul>
        </nav>

        <div className="m-3 rounded-2xl card-dark p-5 text-white">
          <p className="font-semibold">Citizen view</p>
          <p className="mt-1 text-sm text-white/75">See how reviewed reports appear to the public, including hidden photos and locations.</p>
          <Link to="/issues" className="btn btn-sm mt-4 w-full bg-white text-civic-dark hover:bg-civic-soft">Public issues page</Link>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <header className="card sticky top-3 z-30 flex h-16 items-center gap-3 rounded-2xl px-3 sm:px-4">
          <button type="button" className="btn btn-ghost btn-sm md:hidden" aria-expanded={open} aria-label="Open menu" onClick={() => setOpen(true)}>
            <Icon name="menu" className="h-6 w-6" />
          </button>

          <form role="search" onSubmit={search} className="relative min-w-0 flex-1 sm:max-w-md">
            <label htmlFor="staff-search" className="sr-only">Search reports</label>
            <Icon name="search" className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted" />
            <input
              ref={searchRef}
              id="staff-search"
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search reports"
              className="w-full rounded-full border border-line bg-paper py-2.5 pl-11 pr-12 text-sm focus:border-civic focus:bg-white"
            />
            <kbd aria-hidden className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 rounded-md border border-line bg-white px-2 py-0.5 text-xs text-muted sm:block">/</kbd>
          </form>

          <div className="ml-auto flex items-center gap-2 sm:gap-3">
            <div ref={bellRef} className="relative">
              <button
                type="button"
                aria-label={attention.total > 0 ? `Notifications: ${attention.total} need your attention` : "Notifications"}
                aria-expanded={bellOpen}
                aria-controls="attention-panel"
                onClick={() => setBellOpen((o) => !o)}
                className="relative grid h-11 w-11 place-items-center rounded-full border border-line bg-white text-ink hover:bg-civic-soft"
              >
                <Icon name="bell" className="h-5 w-5" />
                {attention.total > 0 && <span aria-hidden className="absolute -right-0.5 -top-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-alert px-1 text-xs font-bold text-white">{attention.total}</span>}
              </button>
              {bellOpen && (
                <div id="attention-panel" role="region" aria-label="Needs your attention" className="card absolute right-0 z-40 mt-2 w-72 rounded-2xl p-4 shadow-lg">
                  <p className="font-semibold">Needs your attention</p>
                  {attention.total === 0 && attention.overdue === 0 ? (
                    <p className="mt-2 text-sm text-muted">Nothing needs your attention right now.</p>
                  ) : (
                    <ul className="mt-3 grid gap-1">
                      {attention.items.filter((i) => i.count > 0).map((i) => (
                        <li key={i.label}>
                          <Link to={i.to} className="flex items-center justify-between rounded-lg px-3 py-2 text-sm hover:bg-paper">
                            <span>{i.label}</span>
                            <span className="rounded-full bg-civic-soft px-2 py-0.5 text-xs font-bold text-civic-dark">{i.count}</span>
                          </Link>
                        </li>
                      ))}
                      {attention.overdue > 0 && (
                        <li>
                          <Link to="/staff" className="flex items-center justify-between rounded-lg px-3 py-2 text-sm hover:bg-paper">
                            <span>Open for too long</span>
                            <span className="rounded-full bg-alert-soft px-2 py-0.5 text-xs font-bold text-alert">{attention.overdue}</span>
                          </Link>
                        </li>
                      )}
                    </ul>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center gap-3 pr-1">
              <span aria-hidden className="grid h-10 w-10 place-items-center rounded-full bg-civic text-sm font-bold text-white">
                {session.name.trim().charAt(0).toUpperCase()}
              </span>
              <span className="hidden text-left leading-tight lg:block">
                <span className="block text-sm font-semibold">{session.name}</span>
                {session.name !== roleLabel && <span className="block text-xs text-muted">{roleLabel}</span>}
              </span>
            </div>
          </div>
        </header>

        <main id="main" tabIndex={-1} className="flex-1 rounded-2xl bg-panel p-4 outline-none sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
