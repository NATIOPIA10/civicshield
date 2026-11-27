import { FormEvent, useState } from "react";
import { Link } from "react-router-dom";
import { staffLogin } from "../api/client";
import { Icon, Logo } from "../components/icons";
import { Alert } from "../components/ui";
import type { StaffSession } from "../types";
import { usePageTitle } from "../usePageTitle";

const POINTS = [
  "Review new reports and assign the right institution",
  "Follow every report from submission to closing",
  "Close an issue only after the evidence is checked",
];

export default function StaffLogin({ onLogin }: { onLogin: (s: StaffSession) => void }) {
  usePageTitle("Staff sign in");
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

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="hidden flex-col justify-between bg-civic p-12 text-white lg:flex">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-white"><Logo className="h-8 w-8" /></span>
          <span className="text-xl font-bold tracking-tight">CivicShield</span>
        </div>
        <div>
          <h1 className="max-w-md text-4xl font-bold leading-tight tracking-tight">Staff portal</h1>
          <p className="mt-4 max-w-md text-lg text-white/85">For city administrators and service-provider teams working on reports from the people of Dilla.</p>
          <ul className="mt-8 grid max-w-md gap-4">
            {POINTS.map((p) => (
              <li key={p} className="flex items-start gap-3">
                <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-white/15"><Icon name="check" className="h-4 w-4" /></span>
                <span>{p}</span>
              </li>
            ))}
          </ul>
        </div>
        <p className="text-sm text-white/70">Dilla University final-year project prototype</p>
      </div>

      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <Link to="/" className="link inline-flex items-center gap-1 text-sm">Back to the public website</Link>
          <form onSubmit={submit} className="card mt-4 p-8">
            <h2 className="text-2xl font-bold tracking-tight">Staff sign in</h2>
            <p className="mt-1 text-sm text-muted">Use the account given to you by the city administration.</p>
            <label htmlFor="u" className="mt-6 block text-sm font-semibold">Username</label>
            <input id="u" value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" className="input mt-1" />
            <label htmlFor="p" className="mt-4 block text-sm font-semibold">Password</label>
            <input id="p" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" className="input mt-1" />
            {error && <div className="mt-4"><Alert tone="error" role="alert">{error}</Alert></div>}
            <button disabled={busy || !username || !password} className="btn btn-primary mt-6 w-full">{busy ? "Signing in..." : "Sign in"}</button>
          </form>
          {import.meta.env.DEV && (
            <p className="mt-4 rounded-lg bg-white p-3 text-xs text-muted">
              Development accounts: <span className="font-mono">admin / admin12345</span>, or{" "}
              <span className="font-mono">provider_water / provider12345</span> (also provider_electric, provider_telecom, provider_roads).
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
