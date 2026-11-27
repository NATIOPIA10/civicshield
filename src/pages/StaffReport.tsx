import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getSession, getStaffReport, staffAction } from "../api/client";
import PhotoUpload, { PhotoValue } from "../components/PhotoUpload";
import SpotMap from "../components/SpotMap";
import { directionsLink, mapLink } from "../mapLinks";
import { CATEGORIES, CategoryId, Report, STATUS_LABEL, StaffAction, Status } from "../types";
import { useOrganizations } from "../useOrganizations";

/** Plain-language guidance: what should this person do with the report right now? */
function nextStep(status: Status, admin: boolean, org: string): { title: string; text: string; waiting?: boolean } {
  if (admin) {
    switch (status) {
      case "submitted": return { title: "Next: review this report", text: "Read the details, then click Start review." };
      case "under_review": return { title: "Next: decide what to do", text: "Check that the category is right (you can change it below), then assign it to the responsible organization, or mark it incomplete or duplicate." };
      case "assigned": return { title: "Waiting for the provider", text: `Waiting for ${org} to start work.`, waiting: true };
      case "in_progress": return { title: "Waiting for the provider", text: `${org} is working on this report. You can review it once they submit the resolution.`, waiting: true };
      case "returned": return { title: "Waiting for the provider", text: `Returned to ${org} for correction. Waiting for a new resolution.`, waiting: true };
      case "resolution_submitted": return { title: "Next: check the evidence", text: "Read the resolution and look at the repair photo. Approve to close the report, or return it with what must be corrected." };
      case "closed": return { title: "Finished", text: "This report is closed. The citizen can now rate the result.", waiting: true };
      case "incomplete": return { title: "Finished", text: "This report was marked incomplete. No further steps.", waiting: true };
      case "duplicate": return { title: "Finished", text: "This report was marked as a duplicate. No further steps.", waiting: true };
    }
  }
  switch (status) {
    case "assigned": return { title: "Next: start work", text: "Click Start work when your team begins." };
    case "in_progress": return { title: "Next: finish and report", text: "Do the repair, then describe what you did and add a photo of the finished work." };
    case "returned": return { title: "Next: correct and send again", text: "The administrator asked for a correction. Read the internal notes, fix it, then submit again." };
    case "resolution_submitted": return { title: "Waiting for the administrator", text: "Waiting for the administrator to review your resolution.", waiting: true };
    default: return { title: "Finished", text: "No further steps for this report.", waiting: true };
  }
}

export default function StaffReport() {
  const { id = "" } = useParams();
  const session = getSession();
  const [r, setR] = useState<Report | null | undefined>(undefined);
  const [msg, setMsg] = useState("");
  const [orgId, setOrgId] = useState("");
  const [summary, setSummary] = useState("");
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const [evidence, setEvidence] = useState<PhotoValue | null>(null);
  const { orgs, orgName } = useOrganizations();
  const [hidePhoto, setHidePhoto] = useState(false);
  const [hideLocation, setHideLocation] = useState(false);
  const [hideEvidence, setHideEvidence] = useState(false);
  const [category, setCategory] = useState<CategoryId>("electricity");
  const [categoryReason, setCategoryReason] = useState("");
  const [reorg, setReorg] = useState("");

  useEffect(() => { if (session) getStaffReport(session, id).then(setR); }, [id]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (r) {
      setHidePhoto(Boolean(r.hidePhoto));
      setHideLocation(Boolean(r.hideLocation));
      setHideEvidence(Boolean(r.hideEvidence));
      setCategory(r.category);
      setReorg("");
    }
  }, [r]);

  const run = useCallback(async (a: StaffAction) => {
    if (!session) return;
    const res = await staffAction(session, id, a);
    if (typeof res === "string") return setMsg(res);
    setMsg("");
    setSummary("");
    setReason("");
    setNote("");
    setEvidence(null);
    setCategoryReason("");
    setR({ ...res });
  }, [session, id]);

  if (!session) return <p>Please <Link className="link" to="/staff">sign in</Link> first.</p>;
  if (r === undefined) return <p className="text-muted">Loading...</p>;
  if (r === null) return <p>Report not found, or it is not assigned to your organization. <Link className="link" to="/staff">Back to list</Link></p>;

  const admin = session.role === "admin";
  const btn = "btn btn-secondary";
  const solid = "btn btn-primary";
  const box = "input mt-1";
  // Tell the person why there is no button for them yet, instead of leaving the panel looking empty.
  const org = orgName(r.orgId) ?? "the service provider";
  const step = nextStep(r.status, admin, org);
  const categoryLabel = (id: CategoryId) => CATEGORIES.find((c) => c.id === id)?.label ?? id;
  const canEditRouting = admin && ["submitted", "under_review", "assigned", "in_progress", "resolution_submitted", "returned"].includes(r.status);
  const canReassign = admin && ["assigned", "in_progress", "returned"].includes(r.status);
  const reportedAs = r.originalCategory && r.originalCategory !== r.category ? r.originalCategory : null;
  const currentOrg = orgs.find((o) => o.id === r.orgId);
  const mismatch = currentOrg && currentOrg.category !== r.category
    ? `${currentOrg.name} handles ${categoryLabel(currentOrg.category)}, but this report is now in ${categoryLabel(r.category)}. Consider moving it.`
    : "";
  const otherOrgs = orgs.filter((o) => o.id !== r.orgId).sort((a, b) => Number(b.category === r.category) - Number(a.category === r.category));
  const matching = orgs.filter((o) => o.category === r.category);

  return (
    <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr]">
      <section>
        <Link to="/staff" className="link text-sm">Back to list</Link>
        <p className="mt-4 font-mono text-sm text-muted">{r.id}</p>
        <h1 className="text-3xl font-bold tracking-tight">{STATUS_LABEL[r.status]}</h1>
        <p className="mt-1 text-sm text-muted">
          {CATEGORIES.find((c) => c.id === r.category)?.label} - {r.area}
          {reportedAs && <span className="ml-3 font-medium text-signal">Reporter chose {categoryLabel(reportedAs)}</span>}
        </p>
        <p className="mt-4 max-w-prose">{r.description}</p>
        {r.photoData ? (
          <figure className="mt-4">
            <img src={r.photoData} alt="Photo from the citizen" className="max-h-72 rounded-lg border border-line object-contain" />
            <figcaption className="mt-1 text-sm text-muted">Citizen photo{r.photoName ? `: ${r.photoName}` : ""}{r.hidePhoto ? " - hidden from the public page" : ""}</figcaption>
          </figure>
        ) : (
          r.photoName && <p className="mt-2 text-sm text-muted">Citizen photo: {r.photoName}</p>
        )}
        <section className="mt-6" aria-labelledby="loc-heading">
          <h2 id="loc-heading" className="font-semibold">Location</h2>
          <p className="text-sm text-muted">{r.area}</p>
          {r.lat !== undefined && r.lng !== undefined ? (
            <div className="mt-2">
              <SpotMap lat={r.lat} lng={r.lng} label={`Map showing where ${r.id} was reported`} />
              <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-1 text-sm">
                <a href={mapLink(r.lat, r.lng)} target="_blank" rel="noopener noreferrer" className="link">
                  Open in OpenStreetMap<span className="sr-only"> (opens in a new tab)</span>
                </a>
                <a href={directionsLink(r.lat, r.lng)} target="_blank" rel="noopener noreferrer" className="link">
                  Get directions<span className="sr-only"> (opens in a new tab)</span>
                </a>
                <span className="font-mono text-muted">{r.lat.toFixed(5)}, {r.lng.toFixed(5)}</span>
                {r.hideLocation && <span className="text-muted">Hidden from the public page</span>}
              </div>
            </div>
          ) : (
            <p className="mt-1 text-sm text-muted">The citizen did not mark an exact spot. Use the area description above.</p>
          )}
        </section>
        <p className="mt-4 text-sm">Assigned to: {orgName(r.orgId) ?? "Not assigned"}</p>

        {r.resolution && (
          <div className="mt-6 card p-4">
            <h2 className="font-semibold">Resolution from provider</h2>
            <p className="mt-1">{r.resolution.summary}</p>
            {r.resolution.evidenceData ? (
              <figure className="mt-3">
                <img src={r.resolution.evidenceData} alt="Evidence photo from the provider" className="max-h-72 rounded-lg border border-line object-contain" />
                <figcaption className="mt-1 text-sm text-muted">Evidence{r.resolution.evidenceName ? `: ${r.resolution.evidenceName}` : ""}{r.hideEvidence ? " - hidden from the public page" : ""}</figcaption>
              </figure>
            ) : (
              r.resolution.evidenceName && <p className="mt-1 text-sm text-muted">Evidence: {r.resolution.evidenceName}</p>
            )}
          </div>
        )}

        <h2 className="mt-8 font-semibold">History</h2>
        <ol className="mt-2 divide-y divide-line border-y border-line text-sm">
          {r.history.map((h, i) => (
            <li key={i} className="flex justify-between py-2"><span>{STATUS_LABEL[h.status]}</span><span className="text-muted">{new Date(h.at).toLocaleString()}</span></li>
          ))}
        </ol>

        <h2 className="mt-8 font-semibold">Internal notes</h2>
        <p className="text-sm text-muted">Never shown to citizens.</p>
        <ul className="mt-2 grid gap-2">
          {(r.notes ?? []).length === 0 && <li className="text-sm text-muted">No notes yet.</li>}
          {(r.notes ?? []).map((n, i) => (
            <li key={i} className="rounded-lg border border-line bg-white p-3 text-sm"><p>{n.text}</p><p className="mt-1 text-muted">{n.by}, {new Date(n.at).toLocaleString()}</p></li>
          ))}
        </ul>
      </section>

      <aside className="h-fit card p-6">
        <h2 className="text-lg font-semibold">Actions</h2>
        {msg && <p role="alert" className="mt-2 text-sm text-alert">{msg}</p>}
        <div className="mt-4 grid gap-4">
          <div className={`rounded-lg p-4 ${step.waiting ? "bg-paper" : "bg-civic-soft"}`}>
            <p className={`text-sm font-semibold ${step.waiting ? "text-ink" : "text-civic-dark"}`}>{step.title}</p>
            <p className="mt-1 text-sm">{step.text}</p>
          </div>
          {admin && r.status === "submitted" && <button className={solid} onClick={() => run({ type: "start_review" })}>Start review</button>}

          {admin && r.status === "under_review" && (
            <>
              <div>
                <label htmlFor="org" className="text-sm font-medium">Assign to organization</label>
                <select id="org" value={orgId} onChange={(e) => setOrgId(e.target.value)} className={box}>
                  <option value="">Choose...</option>
                  {matching.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
                  {orgs.filter((o) => o.category !== r.category).map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
                </select>
                <button className={`${solid} mt-2`} onClick={() => run({ type: "assign", orgId })}>Assign report</button>
              </div>
              <div className="flex gap-2">
                <button className={btn} onClick={() => run({ type: "mark_incomplete" })}>Mark incomplete</button>
                <button className={btn} onClick={() => run({ type: "mark_duplicate" })}>Mark duplicate</button>
              </div>
            </>
          )}

          {!admin && r.status === "assigned" && <button className={solid} onClick={() => run({ type: "start_work" })}>Start work</button>}

          {!admin && (r.status === "in_progress" || r.status === "returned") && (
            <div>
              <label htmlFor="sum" className="text-sm font-medium">Action taken</label>
              <textarea id="sum" rows={3} value={summary} onChange={(e) => setSummary(e.target.value)} className={box} />
              <div className="mt-4">
                <PhotoUpload id="ev" label="Evidence photo" hint="Show the finished repair. JPG, PNG or WebP, up to 5 MB." value={evidence} onChange={setEvidence} />
              </div>
              <button
                className={`${solid} mt-3`}
                onClick={async () => run({ type: "submit_resolution", summary, evidenceName: evidence?.name, evidenceData: evidence ? (await evidence.data) ?? undefined : undefined })}
              >
                Submit resolution
              </button>
            </div>
          )}

          {admin && r.status === "resolution_submitted" && (
            <div>
              <button className={solid} onClick={() => run({ type: "approve" })}>Approve and close</button>
              <label htmlFor="ret" className="mt-4 block text-sm font-medium">Or return for correction</label>
              <textarea id="ret" rows={2} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="What must be corrected?" className={box} />
              <button className={`${btn} mt-2`} onClick={() => run({ type: "return", reason })}>Return to provider</button>
            </div>
          )}


          {canEditRouting && (
            <fieldset className="border-t border-line pt-4">
              <legend className="text-sm font-medium">Category and organization</legend>
              <p className="mt-1 text-xs text-muted">
                Fix the category if the citizen chose the wrong one{canReassign ? ", or move the report to a different organization" : ""}. Each change is recorded in the internal notes.
              </p>
              {reportedAs && (
                <div className="mt-3 rounded-lg bg-paper p-3 text-sm">
                  <p>The reporter chose <span className="font-semibold">{categoryLabel(reportedAs)}</span>.</p>
                  <button
                    type="button"
                    className="link mt-1 text-sm"
                    onClick={() => run({ type: "change_category", category: reportedAs, reason: "Restored the category chosen by the reporter." })}
                  >
                    Restore the reporter's choice
                  </button>
                </div>
              )}
              <label htmlFor="route-cat" className="mt-3 block text-sm font-medium">Category</label>
              <select id="route-cat" value={category} onChange={(e) => setCategory(e.target.value as CategoryId)} className={box}>
                {CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
              {category !== r.category && (
                <>
                  <label htmlFor="route-reason" className="mt-3 block text-sm font-medium">Why is the category changing?</label>
                  <input id="route-reason" value={categoryReason} onChange={(e) => setCategoryReason(e.target.value)} placeholder="For example: pipe burst, not an electrical fault" className={box} />
                  <p className="mt-1 text-xs text-muted">The reason is saved in the internal notes. The citizen is told only that the category was updated.</p>
                </>
              )}
              <button className={`${btn} mt-2`} disabled={category === r.category} onClick={() => run({ type: "change_category", category, reason: categoryReason })}>Save category</button>
              {mismatch && <p className="mt-2 text-xs font-medium text-signal">{mismatch}</p>}
              {canReassign && (
                <>
                  <label htmlFor="route-org" className="mt-4 block text-sm font-medium">Move to another organization</label>
                  <select id="route-org" value={reorg} onChange={(e) => setReorg(e.target.value)} className={box}>
                    <option value="">Choose...</option>
                    {otherOrgs.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
                  </select>
                  <p className="mt-1 text-xs text-muted">The report goes back to Assigned, and the new organization must start the work.</p>
                  <button className={`${btn} mt-2`} disabled={!reorg} onClick={() => run({ type: "reassign", orgId: reorg })}>Reassign report</button>
                </>
              )}
            </fieldset>
          )}

          {admin && (r.photoName || r.photoData || r.lat !== undefined || r.resolution?.evidenceName || r.resolution?.evidenceData) && (
            <fieldset className="border-t border-line pt-4">
              <legend className="text-sm font-medium">Public visibility</legend>
              <p className="mt-1 text-xs text-muted">
                The photo, the location and, once solved, the repair photo appear on the public issues page. Hide any of them if they show people, a home or private details.
              </p>
              {r.photoData && (
                <img
                  src={r.photoData}
                  alt="Thumbnail of the citizen photo"
                  className={`mt-3 h-24 w-24 rounded-lg border border-line object-cover ${hidePhoto ? "opacity-40" : ""}`}
                />
              )}
              {(r.photoName || r.photoData) && (
                <label className="mt-2 flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={hidePhoto} onChange={(e) => setHidePhoto(e.target.checked)} />
                  Hide photo from the public page
                </label>
              )}
              {r.lat !== undefined && (
                <label className="mt-2 flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={hideLocation} onChange={(e) => setHideLocation(e.target.checked)} />
                  Hide location from the public page
                </label>
              )}
              {(r.resolution?.evidenceName || r.resolution?.evidenceData) && (
                <label className="mt-2 flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={hideEvidence} onChange={(e) => setHideEvidence(e.target.checked)} />
                  Hide repair photo from the public page
                </label>
              )}
              <button className={`${btn} mt-3`} onClick={() => run({ type: "set_visibility", hidePhoto, hideLocation, hideEvidence })}>Save visibility</button>
            </fieldset>
          )}

          <div className="border-t border-line pt-4">
            <label htmlFor="note" className="text-sm font-medium">Add internal note</label>
            <textarea id="note" rows={2} value={note} onChange={(e) => setNote(e.target.value)} className={box} />
            <button className={`${btn} mt-2`} onClick={() => run({ type: "note", text: note })}>Save note</button>
          </div>
        </div>
      </aside>
    </div>
  );
}
