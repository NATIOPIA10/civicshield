import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import ChatWidget from "./ChatWidget";
import { Icon, Logo } from "./icons";

const wrap = "mx-auto w-full max-w-[1600px] px-4 sm:px-6 lg:px-10";

const navLink = ({ isActive }: { isActive: boolean }) =>
  `rounded-lg px-3 py-2 text-sm font-medium ${isActive ? "bg-civic-soft text-civic-dark" : "text-muted hover:bg-paper hover:text-ink"}`;

export default function Layout() {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  useEffect(() => { setOpen(false); window.scrollTo?.(0, 0); }, [pathname]);

  return (
    <div className="flex min-h-screen flex-col">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:font-semibold focus:shadow-lg">
        Skip to main content
      </a>

      <header className="sticky top-0 z-40 border-b border-line bg-white/95 backdrop-blur">
        <div className={`${wrap} flex h-16 items-center justify-between gap-4`}>
          <Link to="/" className="flex items-center gap-2.5" aria-label="CivicShield home">
            <Logo />
            <span className="leading-tight">
              <span className="block text-lg font-bold tracking-tight">CivicShield</span>
              <span className="block text-xs text-muted">Dilla City public services</span>
            </span>
          </Link>

          <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
            <NavLink to="/issues" className={navLink}>Public issues</NavLink>
            <NavLink to="/track" className={navLink}>Track a report</NavLink>
            <NavLink to="/staff" className={navLink}>Staff sign in</NavLink>
            <Link to="/report" className="btn btn-primary btn-sm ml-2">Report an issue</Link>
          </nav>

          <button
            type="button"
            className="btn btn-ghost btn-sm md:hidden"
            aria-expanded={open}
            aria-controls="mobile-menu"
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen((o) => !o)}
          >
            <Icon name={open ? "close" : "menu"} className="h-6 w-6" />
          </button>
        </div>

        {open && (
          <nav id="mobile-menu" aria-label="Main mobile" className="border-t border-line bg-white md:hidden">
            <div className={`${wrap} grid gap-1 py-3`}>
              <NavLink to="/issues" className={navLink}>Public issues</NavLink>
              <NavLink to="/track" className={navLink}>Track a report</NavLink>
              <NavLink to="/staff" className={navLink}>Staff sign in</NavLink>
              <Link to="/report" className="btn btn-primary mt-2">Report an issue</Link>
            </div>
          </nav>
        )}
      </header>

      <main id="main" tabIndex={-1} className={`${wrap} flex-1 py-8 outline-none md:py-12`}>
        <Outlet />
      </main>

      <footer className="border-t border-line bg-white">
        <div className={`${wrap} grid gap-8 py-10 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr]`}>
          <div>
            <div className="flex items-center gap-2.5">
              <Logo className="h-8 w-8" />
              <span className="text-lg font-bold tracking-tight">CivicShield</span>
            </div>
            <p className="mt-3 max-w-md text-sm text-muted">
              One traceable record for every public-service problem in Dilla City: reported, assigned, fixed and checked.
            </p>
          </div>
          <nav aria-label="For citizens">
            <p className="text-sm font-semibold">For citizens</p>
            <ul className="mt-3 grid gap-2 text-sm">
              <li><Link className="link" to="/report">Report an issue</Link></li>
              <li><Link className="link" to="/track">Track a report</Link></li>
              <li><Link className="link" to="/issues">Public issues</Link></li>
            </ul>
          </nav>
          <nav aria-label="For staff">
            <p className="text-sm font-semibold">For staff</p>
            <ul className="mt-3 grid gap-2 text-sm">
              <li><Link className="link" to="/staff">Staff sign in</Link></li>
            </ul>
          </nav>
        </div>
        <p className="border-t border-line py-4 text-center text-xs text-muted">
          CivicShield is a Dilla University final-year project prototype. Reports made here are not sent to any institution.
        </p>
      </footer>

      <ChatWidget />
    </div>
  );
}
