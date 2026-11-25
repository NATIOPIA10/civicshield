import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getSession, getStaffReport, staffAction } from "../api/client";
import PhotoUpload, { PhotoValue } from "../components/PhotoUpload";
import SpotMap from "../components/SpotMap";
import StaffNav from "../components/StaffNav";
import { directionsLink, mapLink } from "../mapLinks";
import { CATEGORIES, Report, STATUS_LABEL, StaffAction, Status } from "../types";
import { useOrganizations } from "../useOrganizations";

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

  useEffect(() => { if (session) getStaffReport(session, id).then(setR); }, [id]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (r) {
      setHidePhoto(Boolean(r.hidePhoto));
      setHideLocation(Boolean(r.hideLocation));
      setHideEvidence(Boolean(r.hideEvidence));
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
    setR({ ...res });
  }, [session, id]);

  if (!session) return <p>Please <Link className="text-civic underline" to="/staff">sign in</Link> first.</p>;
  if (r === undefined) return <p className="text-muted">Loading...</p>;
  if (r === null) return <p>Report not found, or it is not assigned to your organization. <Link className="text-civic underline" to="/staff">Back to list</Link></p>;

  const admin = session.role === "admin";
  const btn = "rounded border-2 border-civic px-4 py-2 font-semibold text-civic hover:bg-civic hover:text-white";
  const solid = "rounded bg-civic px-4 py-2 font-semibold text-white hover:bg-civic-dark";
  const box = "mt-1 w-full rounded border border-line bg-white px-3 py-2";
  // Tell the person why there is no button for them yet, instead of leaving the panel looking empty.
  const org = orgName(r.orgId) ?? "the service provider";
  const waiting: Partial<Record<Status, string>> = admin
    ? {
        assigned: `Waiting for ${org} to start work.`,
        in_progress: `${org} is working on this report. You can review it once they submit the resolution.`,
        returned: `Returned to ${org} for correction. Waiting for a new resolution.`,
      }
    : { resolution_submitted: "Waiting for the administrator to review your resolution." };
  const matching = orgs.filter((o) => o.category === r.category);

  return (
    <div>
    <StaffNav session={session} />
    <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr]">
      <section>
        <Link to="/staff" className="text-sm font-medium text-civic underline">Back to list</Link>
        <p className="mt-4 font-mono text-sm text-muted">{r.id}</p>
        <h1 className="text-3xl font-bold tracking-tight">{STATUS_LABEL[r.status]}</h1>
        <p className="mt-1 text-sm text-muted">
          {CATEGORIES.find((c) => c.id === r.category)?.label} - {r.area}
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
                <a href={mapLink(r.lat, r.lng)} target="_blank" rel="noopener noreferrer" className="font-medium text-civic underline">
                  Open in OpenStreetMap<span className="sr-only"> (opens in a new tab)</span>
                </a>
                <a href={directionsLink(r.lat, r.lng)} target="_blank" rel="noopener noreferrer" className="font-medium text-civic underline">
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
          <div className="mt-6 rounded-lg border border-line bg-white p-4">
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
            <li key={i} className="rounded border border-line bg-white p-3 text-sm"><p>{n.text}</p><p className="mt-1 text-muted">{n.by}, {new Date(n.at).toLocaleString()}</p></li>
          ))}
        </ul>
      </section>

      <aside className="h-fit rounded-lg border border-line bg-white p-6">
        <h2 className="text-lg font-semibold">Actions</h2>
        {msg && <p role="alert" className="mt-2 text-sm text-alert">{msg}</p>}
        <div className="mt-4 grid gap-4">
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

          {waiting[r.status] && <p className="rounded bg-paper p-3 text-sm">{waiting[r.status]}</p>}
          {["incomplete", "duplicate", "closed"].includes(r.status) && <p className="text-sm text-muted">No further steps for this report.</p>}

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
                  className={`mt-3 h-24 w-24 rounded border border-line object-cover ${hidePhoto ? "opacity-40" : ""}`}
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
    </div>
  );
}
