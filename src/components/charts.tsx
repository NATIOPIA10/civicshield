/** Small, dependency-free charts in the style of the design reference. */

/** Horizontal progress bar. */
export function HBar({ value, max, tone = "bg-civic" }: { value: number; max: number; tone?: string }) {
  return (
    <span className="block h-2 overflow-hidden rounded-full bg-line" aria-hidden>
      <span className={`block h-2 rounded-full ${tone}`} style={{ width: `${max > 0 ? Math.round((value / max) * 100) : 0}%` }} />
    </span>
  );
}

/** Rounded vertical bars. The busiest period is dark green with a bubble, empty periods are hatched. */
export function PillBars({ data }: { data: { label: string; count: number }[] }) {
  const max = Math.max(1, ...data.map((d) => d.count));
  const peak = data.reduce((best, d, i) => (d.count > data[best].count ? i : best), 0);
  return (
    <ol className="flex items-end justify-between gap-1.5 sm:gap-3">
      {data.map((d, i) => {
        const isPeak = i === peak && d.count > 0;
        const height = d.count === 0 ? 28 : 36 + Math.round((d.count / max) * 108);
        const tone = d.count === 0 ? "hatch border border-line" : isPeak ? "bg-civic-dark" : d.count * 2 >= max ? "bg-civic-mid" : "bg-civic-light";
        return (
          <li key={d.label} className="flex min-w-0 flex-1 flex-col items-center">
            <div className="flex h-44 w-full flex-col items-center justify-end gap-1.5">
              <span className={isPeak ? "rounded-full bg-white px-2 py-0.5 text-xs font-bold shadow ring-1 ring-line" : "text-xs font-medium text-muted"} aria-hidden>{d.count}</span>
              <span className={`block w-full max-w-14 rounded-full ${tone}`} style={{ height }} aria-hidden />
            </div>
            <span className="mt-2 text-xs text-muted" aria-hidden>{d.label}</span>
            <span className="sr-only">Week ending {d.label}: {d.count} new {d.count === 1 ? "report" : "reports"}</span>
          </li>
        );
      })}
    </ol>
  );
}

/** Half-circle gauge: closed (dark), in progress (mid), pending (hatched). */
export function Gauge({ closed, progress, pending, total }: { closed: number; progress: number; pending: number; total: number }) {
  const pct = total ? Math.round((closed / total) * 100) : 0;
  const part = (n: number) => (total ? (n / total) * 100 : 0);
  const c = part(closed);
  const p = part(progress);
  const q = part(pending);
  const d = "M 22 100 A 78 78 0 0 1 178 100";
  const arc = (len: number, start: number, stroke: string, key: string) => (
    <path key={key} d={d} pathLength={100} fill="none" stroke={stroke} strokeWidth={26} strokeDasharray={`${len} ${100 - len}`} strokeDashoffset={-start} />
  );
  return (
    <div className="relative mx-auto w-full max-w-64">
      <svg viewBox="0 0 200 108" role="img" aria-label={`${pct}% of reports closed`} className="w-full">
        <defs>
          <pattern id="gauge-hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width="6" height="6" fill="#eef4f1" />
            <line x1="0" y1="0" x2="0" y2="6" stroke="#a9c1b6" strokeWidth="2" />
          </pattern>
        </defs>
        {arc(100, 0, "#e6efeb", "track")}
        {arc(c, 0, "#0a4d3f", "closed")}
        {arc(p, c, "#3f9b78", "progress")}
        {arc(q, c + p, "url(#gauge-hatch)", "pending")}
      </svg>
      <div className="absolute inset-x-0 bottom-0 text-center" aria-hidden>
        <span className="block text-4xl font-bold leading-none tracking-tight">{pct}%</span>
        <span className="mt-1 block text-xs text-muted">Closed</span>
      </div>
    </div>
  );
}
