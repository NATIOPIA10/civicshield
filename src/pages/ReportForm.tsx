import { FormEvent, ReactNode, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { submitReport } from "../api/client";
import { CATEGORY_ICON, Icon } from "../components/icons";
import LocationPicker from "../components/LocationPicker";
import PhotoUpload, { PhotoValue } from "../components/PhotoUpload";
import { Alert, PageHeader } from "../components/ui";
import { CATEGORIES, CategoryId } from "../types";
import { usePageTitle } from "../usePageTitle";

const MIN_DESCRIPTION = 20;

function Section({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  return (
    <section className="card p-5 sm:p-6">
      <div className="flex items-center gap-3">
        <span aria-hidden className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-civic text-sm font-bold text-white">{n}</span>
        <h2 className="text-lg font-semibold">{title}</h2>
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* the person can still select the text by hand */
    }
  };
  return (
    <button type="button" onClick={copy} aria-label={`Copy ${label}`} className="btn btn-ghost btn-sm">
      <Icon name="copy" className="h-4 w-4" />
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

export default function ReportForm() {
  usePageTitle("Report an issue");
  const [params] = useSearchParams();
  const fromLink = params.get("category");
  const [category, setCategory] = useState<CategoryId | "">(CATEGORIES.some((c) => c.id === fromLink) ? (fromLink as CategoryId) : "");
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
    if (description.trim().length < MIN_DESCRIPTION) err.description = "Describe the problem in at least 20 characters.";
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
      <div className="mx-auto max-w-3xl">
        <div className="card p-6 sm:p-10">
          <div className="flex items-center gap-3">
            <span className="grid h-12 w-12 place-items-center rounded-full bg-civic-soft text-civic"><Icon name="checkCircle" className="h-7 w-7" /></span>
            <h1 className="text-2xl font-bold sm:text-3xl">Your report was sent</h1>
          </div>
          <p className="mt-3 text-muted">Save both items below. You need them to follow this report.</p>

          <dl className="mt-6 grid gap-4 sm:grid-cols-2">
            {[
              { label: "Report ID", value: done.reportId },
              { label: "Tracking code", value: done.trackingCode },
            ].map((item) => (
              <div key={item.label} className="rounded-xl border border-line bg-paper p-4">
                <dt className="text-sm text-muted">{item.label}</dt>
                <dd className="mt-1 flex items-center justify-between gap-2">
                  <span className="font-mono text-2xl font-semibold">{item.value}</span>
                  <CopyButton value={item.value} label={item.label} />
                </dd>
              </div>
            ))}
          </dl>

          <div className="mt-6"><Alert tone="info">The tracking code is shown only once. If you lose it, you cannot view this report.</Alert></div>
          <p className="mt-4 text-sm text-muted">After the city administration reviews your report, it also appears on the public issues page.</p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link to={`/track?id=${encodeURIComponent(done.reportId)}`} className="btn btn-primary">Track this report</Link>
            <Link to="/issues" className="btn btn-secondary">See public issues</Link>
          </div>
        </div>
      </div>
    );
  }

  const err = (k: string) => (errors[k] ? <p role="alert" className="mt-2 text-sm font-medium text-alert">{errors[k]}</p> : null);
  const missing = Math.max(0, MIN_DESCRIPTION - description.trim().length);

  return (
    <form onSubmit={submit} noValidate className="w-full">
      <PageHeader title="Report an issue" subtitle="It takes about two minutes. No account needed, and we do not ask for your name or phone number." />

      {Object.keys(errors).length > 0 && (
        <div className="mb-6"><Alert tone="error" role="alert">Please check the fields marked below, then send again.</Alert></div>
      )}

      <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
        <div className="grid gap-6">
          <Section n={1} title="What kind of problem is it?">
            <fieldset>
              <legend className="sr-only">What kind of problem is it?</legend>
              <div className="grid gap-3 sm:grid-cols-2">
                {CATEGORIES.map((c) => (
                  <label
                    key={c.id}
                    className="group flex cursor-pointer items-start gap-3 rounded-xl border border-line bg-white p-4 transition-colors hover:border-civic has-[:checked]:border-civic has-[:checked]:bg-civic-soft has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-civic"
                  >
                    <input type="radio" name="category" value={c.id} checked={category === c.id} onChange={() => setCategory(c.id)} className="sr-only" />
                    <span aria-hidden className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-civic-soft text-civic group-has-[:checked]:bg-white">
                      <Icon name={CATEGORY_ICON[c.id]} className="h-5 w-5" />
                    </span>
                    <span>
                      <span className="block font-semibold">{c.label}</span>
                      <span className="block text-sm text-muted">{c.hint}</span>
                    </span>
                  </label>
                ))}
              </div>
              {err("category")}
            </fieldset>
          </Section>

          <Section n={2} title="Describe the problem">
            <label htmlFor="desc" className="block text-sm font-semibold">What is happening?</label>
            <p className="mt-1 text-sm text-muted">Say what is wrong, since when, and anything that helps the team find it.</p>
            <textarea id="desc" rows={5} value={description} onChange={(e) => setDescription(e.target.value)} className="input mt-2" />
            <div className="mt-1 flex justify-between gap-3 text-sm">
              <span>{err("description")}</span>
              <span className={missing === 0 ? "text-civic" : "text-muted"} aria-live="polite">
                {missing === 0 ? "Long enough" : `${description.trim().length} / ${MIN_DESCRIPTION} minimum`}
              </span>
            </div>
          </Section>
        </div>

        <div className="grid gap-6">
          <Section n={3} title="Show us where">
            <label htmlFor="area" className="block text-sm font-semibold">Where is it?</label>
            <p className="mt-1 text-sm text-muted">A street, kebele or landmark.</p>
            <input id="area" value={area} onChange={(e) => setArea(e.target.value)} className="input mt-2" />
            {err("area")}
            <p className="mt-5 text-sm font-semibold">Mark the exact spot on the map (optional)</p>
            <div className="mt-2"><LocationPicker value={coords} onChange={setCoords} /></div>
            <button type="button" onClick={useLocation} className="btn btn-ghost btn-sm mt-2">
              <Icon name="pin" className="h-4 w-4" /> Use my current location instead
            </button>
            {geoMsg && <p className="mt-1 text-sm text-muted" aria-live="polite">{geoMsg}</p>}
          </Section>

          <Section n={4} title="Add a photo">
            <PhotoUpload
              id="photo"
              label="Photo"
              hint="JPG, PNG or WebP, up to 5 MB. A clear photo helps the right team fix the problem faster. Photos are shown publicly, so avoid faces and number plates."
              value={photo}
              onChange={setPhoto}
            />
          </Section>
        </div>
      </div>

      <div className="card mt-6 flex flex-wrap items-center justify-between gap-4 p-5 sm:p-6">
        <p className="max-w-2xl text-sm text-muted">
          After the city administration reviews your report, it is shown on the public issues page with its photo and a link to the location you marked, unless the administration hides them to protect privacy. Your name and phone number are never asked for or shown.
        </p>
        <button disabled={busy} className="btn btn-primary btn-lg">
          {busy ? "Sending..." : "Send report"}
        </button>
      </div>
    </form>
  );
}
