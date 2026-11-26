import type { PublicIssuesData } from "../types";

const ACCENT = {
  Reported: "border-t-ink",
  "Under review": "border-t-info",
  "Being fixed": "border-t-signal",
  Solved: "border-t-civic",
} as const;

export default function IssueStats({ stats }: { stats: PublicIssuesData["stats"] }) {
  const tiles = [
    { label: "Reported", value: stats.reported },
    { label: "Under review", value: stats.underReview },
    { label: "Being fixed", value: stats.beingFixed },
    { label: "Solved", value: stats.solved },
  ] as const;
  return (
    <dl className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {tiles.map((t) => (
        <div key={t.label} className={`card border-t-4 p-5 ${ACCENT[t.label]}`}>
          <dt className="text-sm font-medium text-muted">{t.label}</dt>
          <dd className="mt-1 text-4xl font-bold tracking-tight">{t.value}</dd>
        </div>
      ))}
    </dl>
  );
}
