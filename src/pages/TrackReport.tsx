import { FormEvent, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { devAdvanceReport, submitFeedback, trackReport } from "../api/client";
import Timeline from "../components/Timeline";
import { CATEGORIES, PublicReportView } from "../types";

export default function TrackReport() {
  const [params] = useSearchParams();
  const [id, setId] = useState(params.get("id") ?? "");
  const [code, setCode] = useState("");
  const [view, setView] = useState<PublicReportView | null>(null);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");

  const lookup = async (e?: FormEvent) => {
    e?.preventDefault();
    setBusy(true);
    setMsg("");
    const res = await trackReport(id, code);
    setBusy(false);
    setView(res);
    if (!res) setMsg("No report matches that Report ID and tracking code. Check both and try again.");
  };

  const sendFeedback = async () => {
    if (!view || rating < 1) return setMsg("Choose a rating from 1 to 5.");
    const ok = await submitFeedback(id, code, rating, comment);
    setMsg(ok ? "Thank you for your feedback." : "Feedback could not be saved.");
    if (ok) lookup();
  };

  const field = "mt-1 w-full rounded border border-line bg-white px-3 py-2 font-mono";

  return (
    <div className="w-full">
      <h1 className="text-3xl font-bold tracking-tight">Track a report</h1>
      <div className="mt-6 grid gap-8 lg:grid-cols-[22rem_1fr] lg:items-start">
      <form onSubmit={lookup} className="grid gap-4">
        <div>
          <label htmlFor="id" className="text-sm font-medium">Report ID</label>
          <input id="id" value={id} onChange={(e) => setId(e.target.value)} className={field} />
        </div>
        <div>
          <label htmlFor="code" className="text-sm font-medium">Tracking code</label>
          <input id="code" value={code} onChange={(e) => setCode(e.target.value)} placeholder="XXXX-XXXX" className={field} />
        </div>
        <button disabled={busy || !id || !code} className="rounded bg-civic px-5 py-2.5 font-semibold text-white hover:bg-civic-dark disabled:opacity-60">
          {busy ? "Checking..." : "Show progress"}
        </button>
      </form>
      <div>

      {msg && <p role="alert" className="mt-4 text-sm text-alert" aria-live="polite">{msg}</p>}

      {view && (
        <section className="mt-4 rounded-lg border border-line bg-white p-6">
          <p className="font-mono text-sm text-muted">{view.id}</p>
          <h2 className="mt-1 text-2xl font-bold">{view.statusLabel}</h2>
          <p className="mt-1 text-sm text-muted">
            {CATEGORIES.find((c) => c.id === view.category)?.label} - {view.area}
          </p>
          <p className="mt-4">{view.description}</p>
          {view.resolution && (
            <div className="mt-4 rounded-lg bg-civic/10 p-4">
              <h3 className="font-semibold text-civic-dark">How it was resolved</h3>
              <p className="mt-1">{view.resolution}</p>
            </div>
          )}

          <h3 className="mt-8 mb-4 font-semibold">Progress</h3>
          <Timeline items={view.timeline} resolved={view.isResolved} />

          {view.isResolved && !view.feedbackGiven && (
            <div className="mt-8 border-t border-line pt-6">
              <h3 className="font-semibold">Was the problem fixed to your satisfaction?</h3>
              <div className="mt-3 flex gap-2" role="radiogroup" aria-label="Rating">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button key={n} type="button" role="radio" aria-checked={rating === n} onClick={() => setRating(n)}
                    className={`h-10 w-10 rounded border font-semibold ${rating === n ? "bg-civic text-white border-civic" : "border-line"}`}>{n}</button>
                ))}
              </div>
              <textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={3} placeholder="Comment (optional)" className="mt-3 w-full rounded border border-line px-3 py-2" />
              <button onClick={sendFeedback} className="mt-3 rounded bg-civic px-5 py-2 font-semibold text-white hover:bg-civic-dark">Send feedback</button>
            </div>
          )}
          {view.isResolved && view.feedbackGiven && <p className="mt-8 text-sm text-muted">Feedback received. Thank you.</p>}

          {import.meta.env.DEV && !view.isResolved && (
            <button onClick={async () => { await devAdvanceReport(id, code); lookup(); }} className="mt-8 text-xs text-muted underline">
              Dev only: move this report to its next step
            </button>
          )}
        </section>
      )}
      {!view && !msg && <p className="text-muted">Your report's progress will appear here.</p>}
      </div>
      </div>
    </div>
  );
}
