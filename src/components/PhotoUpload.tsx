import { useRef, useState } from "react";
import { formatSize, readAsDataUrl, shrink } from "../imageUtils";

export interface PhotoValue {
  name: string;
  size: number;
  preview: string; // data URL of the original, for the preview only
  data: Promise<string | null>; // reduced copy that the mock keeps
}

const TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_BYTES = 5 * 1024 * 1024;

interface Props {
  id: string;
  label: string;
  hint: string;
  optional?: boolean;
  value: PhotoValue | null;
  onChange: (v: PhotoValue | null) => void;
}

export default function PhotoUpload({ id, label, hint, optional = true, value, onChange }: Props) {
  const input = useRef<HTMLInputElement>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);

  const take = async (file?: File | null) => {
    if (!file) return;
    if (!TYPES.includes(file.type)) return setError("Use a JPG, PNG or WebP photo.");
    if (file.size > MAX_BYTES) return setError(`That photo is ${formatSize(file.size)}. Choose one smaller than 5 MB.`);
    setError("");
    setBusy(true);
    try {
      const preview = await readAsDataUrl(file);
      onChange({ name: file.name, size: file.size, preview, data: shrink(preview) });
    } catch {
      setError("That file could not be read. Try another photo.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <p id={`${id}-label`} className="font-semibold">
        {label}
        {optional && <span className="ml-1 font-normal text-muted">(optional)</span>}
      </p>

      <input
        ref={input}
        id={id}
        type="file"
        accept={TYPES.join(",")}
        aria-labelledby={`${id}-label`}
        className="peer sr-only"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = ""; // lets the same file be chosen again after removing it
          take(file);
        }}
      />

      {value ? (
        <div className="mt-2 flex items-center gap-4 rounded-lg border border-line bg-white p-3">
          <img src={value.preview} alt="Selected photo preview" className="h-20 w-20 shrink-0 rounded object-cover" />
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium">{value.name}</p>
            <p className="text-sm text-muted">{formatSize(value.size)}</p>
          </div>
          <div className="flex flex-col items-end gap-1 text-sm">
            <button type="button" onClick={() => input.current?.click()} className="font-medium text-civic underline">Replace</button>
            <button type="button" onClick={() => { onChange(null); setError(""); }} className="font-medium text-alert underline">Remove</button>
          </div>
        </div>
      ) : (
        <label
          htmlFor={id}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => { e.preventDefault(); setDragging(false); take(e.dataTransfer.files?.[0]); }}
          className={`mt-2 flex cursor-pointer flex-col items-center gap-1 rounded-lg border-2 border-dashed px-4 py-8 text-center peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-civic ${
            dragging ? "border-civic bg-civic/5" : "border-line bg-white hover:border-civic"
          }`}
        >
          <svg aria-hidden viewBox="0 0 24 24" className="h-8 w-8 text-civic" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5V18a2 2 0 002 2h14a2 2 0 002-2v-1.5M12 15V4m0 0L8 8m4-4l4 4" />
          </svg>
          <span className="font-medium">Drag a photo here, or <span className="text-civic underline">choose a file</span></span>
          <span className="max-w-sm text-sm text-muted">{hint}</span>
        </label>
      )}

      {busy && <p className="mt-2 text-sm text-muted" aria-live="polite">Preparing photo...</p>}
      {error && <p role="alert" className="mt-2 text-sm text-alert">{error}</p>}
    </div>
  );
}
