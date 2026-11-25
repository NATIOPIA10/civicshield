import type { PublicIssuesData } from "../types";

export default function IssueStats({ stats }: { stats: PublicIssuesData["stats"] }) {
  const tiles = [
    { label: "Reported", value: stats.reported },
    { label: "Under review", value: stats.underReview },
    { label: "Being fixed", value: stats.beingFixed },
    { label: "Solved", value: stats.solved },
  ];
  return (
    <dl className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {tiles.map((t) => (
        <div key={t.label} className="rounded-lg border border-line bg-white p-4">
          <dt className="text-sm text-muted">{t.label}</dt>
          <dd className="mt-1 text-3xl font-bold">{t.value}</dd>
        </div>
      ))}
    </dl>
  );
}
