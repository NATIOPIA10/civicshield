import { Link, NavLink, Outlet } from "react-router-dom";
import ChatWidget from "./ChatWidget";

const nav = "px-3 py-2 text-sm font-medium text-muted hover:text-ink rounded";
const active = "text-ink bg-white";

export default function Layout() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-line bg-paper">
        <div className="w-full px-4 sm:px-8 lg:px-12 min-h-16 py-2 flex flex-wrap items-center justify-between gap-y-1">
          <Link to="/" className="flex items-center gap-2 font-bold text-lg tracking-tight">
            <span aria-hidden className="inline-block h-6 w-6 rounded-sm bg-civic" />
            CivicShield
          </Link>
          <nav className="flex items-center gap-1" aria-label="Main">
            <NavLink to="/issues" className={({ isActive }) => `${nav} ${isActive ? active : ""}`}>Public issues</NavLink>
            <NavLink to="/report" className={({ isActive }) => `${nav} ${isActive ? active : ""}`}>Report an issue</NavLink>
            <NavLink to="/track" className={({ isActive }) => `${nav} ${isActive ? active : ""}`}>Track a report</NavLink>
            <NavLink to="/staff" className={({ isActive }) => `${nav} ${isActive ? active : ""}`}>Staff sign in</NavLink>
          </nav>
        </div>
      </header>
      <main className="w-full flex-1 px-4 py-10 sm:px-8 lg:px-12">
        <Outlet />
      </main>
      <footer className="border-t border-line">
        <p className="w-full px-4 py-6 sm:px-8 lg:px-12 text-sm text-muted">
          CivicShield is a Dilla University final-year project prototype. Reports made here are not sent to any institution.
        </p>
      </footer>
      <ChatWidget />
    </div>
  );
}
