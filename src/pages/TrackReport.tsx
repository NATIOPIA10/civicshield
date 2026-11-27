import { FormEvent, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { devAdvanceReport, submitFeedback, trackReport } from "../api/client";
import { CATEGORY_ICON, Icon } from "../components/icons";
import ProgressSteps, { stageIndex } from "../components/ProgressSteps";
import Timeline from "../components/Timeline";
import { Alert, PageHeader } from "../components/ui";
import { CATEGORIES, PublicReportView } from "../types";
import { usePageTitle } from "../usePageTitle";

const NOTICE: Record<string, string> = {
  "More information needed": "This report could not be processed as it was sent. You can send a new report with more detail.",
  "Merged with an existing report": "This report matches one that was already reported, which is being handled.",
};

export default function TrackReport() {
  usePageTitle("Track a report");
  const [params] = useSearchParams();
  const [id, setId] = useState(params.get("id") ?? "");
  const [code, setCode] = useState("");
  const [view, setView] = useState<PublicReportView | null>(null);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [feedbackMsg, setFeedbackMsg] = useState("");

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
    if (!view || rating < 1) return setFeedbackMsg("Choose a rating from 1 to 5.");
    const ok = await submitFeedback(id, code, rating, comment);
    if (!ok) return setFeedbackMsg("Feedback could not be saved.");
    setFeedbackMsg("");
    lookup();
  };

  const category = view && CATEGORIES.find((c) => c.id === view.category);
  const date = (iso: string) => new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });

  return (
    <div className="w-full">
      <PageHeader title="Track a report" subtitle="Enter the Report ID and tracking code you received when you sent the report." />

      <div className="grid gap-8 lg:grid-cols-[24rem_1fr] lg:items-start">
        <form onSubmit={lookup} className="card grid gap-4 p-6">
          <h2 className="text-lg font-semibold">Find your report</h2>
          <div>
            <label htmlFor="id" className="block text-sm font-semibold">Report ID</label>
            <input id="id" value={id} onChange={(e) => setId(e.target.value)} placeholder="CS-2026-0001" className="input mt-1 font-mono" />
          </div>
          <div>
            <label htmlFor="code" className="block text-sm font-semibold">Tracking code</label>
            <input id="code" value={code} onChange={(e) => setCode(e.target.value)} placeholder="XXXX-XXXX" className="input mt-1 font-mono" />
            <p className="mt-1 text-xs text-muted">You received both when you sent the report.</p>
          </div>
          <button disabled={busy || !id || !code} className="btn btn-primary">
            {busy ? "Checking..." : "Show progress"}
          </button>
        </form>

        <div>
          {msg && <Alert tone="error" role="alert">{msg}</Alert>}

          {!view && !msg && (
            <div className="card grid place-items-center gap-3 p-10 text-center text-muted">
              <Icon name="search" className="h-8 w-8" />
              <p>Your report&apos;s progress will appear here.</p>
            </div>
          )}

          {view && (
            <section className="card p-6 sm:p-8">
              <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted">
                <span className="font-mono">{view.id}</span>
                <span>Reported {date(view.submittedAt)}</span>
              </div>
              <h2 className="mt-2 text-3xl font-bold tracking-tight">{view.statusLabel}</h2>
              <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted">
                {category && <span className="inline-flex items-center gap-1.5"><Icon name={CATEGORY_ICON[category.id]} className="h-4 w-4" />{category.label}{view.categoryChanged && <span className="pill bg-info-soft text-info">Updated by the city administration</span>}</span>}
                <span className="inline-flex items-center gap-1.5"><Icon name="pin" className="h-4 w-4" />{view.area}</span>
              </p>

              {stageIndex(view.statusLabel) >= 0 ? (
                <div className="mt-8"><ProgressSteps label={view.statusLabel} /></div>
              ) : (
                NOTICE[view.statusLabel] && <div className="mt-6"><Alert tone="info">{NOTICE[view.statusLabel]}</Alert></div>
              )}

              <p className="mt-8">{view.description}</p>

              {view.resolution && (
                <div className="mt-6 rounded-xl bg-civic-soft p-5">
                  <h3 className="font-semibold text-civic-dark">How it was resolved</h3>
                  <p className="mt-1">{view.resolution}</p>
                </div>
              )}

              <h3 className="mb-4 mt-10 font-semibold">History</h3>
              <Timeline items={view.timeline} resolved={view.isResolved} />

              {view.isResolved && !view.feedbackGiven && (
                <div className="mt-10 rounded-xl border border-line bg-paper p-5">
                  <h3 className="font-semibold">Was the problem fixed to your satisfaction?</h3>
                  <p className="mt-1 text-sm text-muted">1 means not satisfied, 5 means very satisfied.</p>
                  <div className="mt-3 flex gap-2" role="radiogroup" aria-label="Rating">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button
                        key={n}
                        type="button"
                        role="radio"
                        aria-checked={rating === n}
                        onClick={() => setRating(n)}
                        className={`h-11 w-11 rounded-lg border text-lg font-semibold transition-colors ${rating === n ? "border-civic bg-civic text-white" : "border-line bg-white hover:border-civic"}`}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                  <textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={3} placeholder="Comment (optional)" aria-label="Comment" className="input mt-3" />
                  {feedbackMsg && <p role="status" className="mt-2 text-sm font-medium text-alert">{feedbackMsg}</p>}
                  <button onClick={sendFeedback} className="btn btn-primary mt-3">Send feedback</button>
                </div>
              )}
              {view.isResolved && view.feedbackGiven && (
                <div className="mt-8"><Alert tone="success">Feedback received. Thank you.</Alert></div>
              )}

              {import.meta.env.DEV && !view.isResolved && (
                <button onClick={async () => { await devAdvanceReport(id, code); lookup(); }} className="mt-8 text-xs text-muted underline">
                  Dev only: move this report to its next step
                </button>
              )}
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
