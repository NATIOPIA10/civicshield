/** Reads a file as a data URL. */
export function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

/**
 * Shrinks a photo so the mock can keep it in browser storage (maximum 800 px, JPEG).
 * If the browser cannot do that, it keeps the original only when it is small, otherwise it returns null.
 * The real backend stores the original file, so this exists only for the mock.
 */
export function shrink(dataUrl: string, maxSide = 800): Promise<string | null> {
  return new Promise((resolve) => {
    const fallback = () => resolve(dataUrl.length < 400_000 ? dataUrl : null);
    const timer = setTimeout(fallback, 1500);
    const img = new Image();
    img.onload = () => {
      clearTimeout(timer);
      try {
        const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(img.width * scale));
        canvas.height = Math.max(1, Math.round(img.height * scale));
        const ctx = canvas.getContext("2d");
        if (!ctx) return fallback();
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.72));
      } catch {
        fallback();
      }
    };
    img.onerror = () => { clearTimeout(timer); fallback(); };
    img.src = dataUrl;
  });
}

export function formatSize(bytes: number): string {
  return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
