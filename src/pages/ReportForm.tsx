import { FormEvent, useState } from "react";
import { Link } from "react-router-dom";
import { submitReport } from "../api/client";
import LocationPicker from "../components/LocationPicker";
import PhotoUpload, { PhotoValue } from "../components/PhotoUpload";
import { CATEGORIES, CategoryId } from "../types";

export default function ReportForm() {
  const [category, setCategory] = useState<CategoryId | "">("");
  const [description, setDescription] = useState("");
  const [area, setArea] = useState("");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [photo, setPhoto] = useState<PhotoValue | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [geoMsg, setGeoMsg] = useState("");
  const [done, setDone] = useState<{ reportId: string; trackingCode: string } | null>(null);

  const useLocation = () => {
    if (!navigator.geolocation) return setGeoMsg("This device cannot share its location. Describe the place in the box above instead.");
    setGeoMsg("Finding your location...");
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setCoords({ lat: p.coords.latitude, lng: p.coords.longitude });
        setGeoMsg("Location added.");
      },
      () => setGeoMsg("Location was not shared. Describe the place in the box above instead.")
    );
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const err: Record<string, string> = {};
    if (!category) err.category = "Choose the type of problem.";
    if (description.trim().length < 20) err.description = "Describe the problem in at least 20 characters.";
    if (!area.trim()) err.area = "Say where the problem is, such as a street, kebele or landmark.";
    setErrors(err);
    if (Object.keys(err).length) return;
    setBusy(true);
    const photoData = photo ? (await photo.data) ?? undefined : undefined;
    const res = await submitReport({
      category: category as CategoryId,
      description: description.trim(),
      area: area.trim(),
      ...(coords ?? {}),
      photoName: photo?.name,
      photoData,
    });
    setBusy(false);
    setDone(res);
  };

  if (done) {
    return (
      <div className="w-full rounded-lg border border-line bg-white p-8">
        <h1 className="text-2xl font-bold">Your report was sent</h1>
        <p className="mt-2 text-muted">Save both items below. You need them to track this report.</p>
        <dl className="mt-6 grid gap-4 sm:grid-cols-2">
          <div><dt className="text-sm text-muted">Report ID</dt><dd className="font-mono text-xl">{done.reportId}</dd></div>
          <div><dt className="text-sm text-muted">Tracking code</dt><dd className="font-mono text-xl">{done.trackingCode}</dd></div>
        </dl>
        <p className="mt-6 rounded bg-paper p-3 text-sm">The tracking code is shown only once. If you lose it, you cannot view this report.</p>
        <p className="mt-3 text-sm text-muted">After the city administration reviews your report, it also appears on the public issues page.</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link to={`/track?id=${encodeURIComponent(done.reportId)}`} className="inline-block rounded bg-civic px-5 py-2.5 font-semibold text-white hover:bg-civic-dark">
            Track this report
          </Link>
          <Link to="/issues" className="inline-block rounded border-2 border-civic px-5 py-2.5 font-semibold text-civic hover:bg-civic hover:text-white">
            See public issues
          </Link>
        </div>
      </div>
    );
  }

  const field = "mt-1 w-full rounded border border-line bg-white px-3 py-2";
  const err = (k: string) => (errors[k] ? <p role="alert" className="mt-1 text-sm text-alert">{errors[k]}</p> : null);

  return (
    <form onSubmit={submit} noValidate className="w-full">
      <h1 className="text-3xl font-bold tracking-tight">Report an issue</h1>
      <p className="mt-2 text-muted">No account needed. We do not ask for your name or phone number.</p>

      <div className="mt-8 grid gap-x-12 gap-y-6 lg:grid-cols-2">
        <div className="grid gap-6">
          <fieldset>
            <legend className="font-semibold">What kind of problem is it?</legend>
            <div className="mt-2 grid gap-2">
              {CATEGORIES.map((c) => (
                <label key={c.id} className={`flex cursor-pointer items-start gap-3 rounded border p-3 ${category === c.id ? "border-civic bg-white" : "border-line"}`}>
                  <input type="radio" name="category" value={c.id} checked={category === c.id} onChange={() => setCategory(c.id)} className="mt-1" />
                  <span><span className="block font-medium">{c.label}</span><span className="block text-sm text-muted">{c.hint}</span></span>
                </label>
              ))}
            </div>
            {err("category")}
          </fieldset>

          <div>
            <label htmlFor="desc" className="font-semibold">What is happening?</label>
            <textarea id="desc" rows={4} value={description} onChange={(e) => setDescription(e.target.value)} className={field} />
            {err("description")}
          </div>

          <PhotoUpload
            id="photo"
            label="Photo"
            hint="JPG, PNG or WebP, up to 5 MB. A clear photo helps the right team fix the problem faster. Photos are shown publicly, so avoid faces and number plates."
            value={photo}
            onChange={setPhoto}
          />
        </div>

        <div>
          <label htmlFor="area" className="font-semibold">Where is it?</label>
          <input id="area" value={area} onChange={(e) => setArea(e.target.value)} className={field} />
          {err("area")}
          <p className="mt-4 text-sm font-medium">Mark the exact spot on the map (optional)</p>
          <div className="mt-1"><LocationPicker value={coords} onChange={setCoords} /></div>
          <button type="button" onClick={useLocation} className="mt-2 text-sm font-medium text-civic underline">Use my current location instead</button>
          {geoMsg && <p className="mt-1 text-sm text-muted" aria-live="polite">{geoMsg}</p>}
        </div>
      </div>

      <p className="mt-8 max-w-prose text-sm text-muted">
        After the city administration reviews your report, it is shown on the public issues page with its photo and a link to the location you marked, unless the administration hides them to protect privacy. Your name and phone number are never asked for or shown.
      </p>
      <button disabled={busy} className="mt-4 rounded bg-civic px-6 py-3 font-semibold text-white hover:bg-civic-dark disabled:opacity-60">
        {busy ? "Sending..." : "Send report"}
      </button>
    </form>
  );
}
