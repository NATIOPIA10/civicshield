export default function Timeline({ items, resolved }: { items: { label: string; at: string }[]; resolved: boolean }) {
  return (
    <ol className="relative ml-3 border-l-2 border-line">
      {items.map((it, i) => {
        const current = i === items.length - 1;
        const dot = current ? (resolved ? "bg-civic" : "bg-signal") : "bg-ink";
        return (
          <li key={it.label + it.at} className="pb-6 pl-6 last:pb-0 relative">
            <span aria-hidden className={`absolute -left-[9px] top-1 h-4 w-4 rounded-full border-2 border-paper ${dot}`} />
            <p className={current ? "font-semibold" : "font-medium"}>{it.label}</p>
            <p className="text-sm text-muted">{new Date(it.at).toLocaleString()}</p>
          </li>
        );
      })}
    </ol>
  );
}
