import { mapLink } from "../mapLinks";
import { CATEGORIES, IssueGroup, PublicIssue } from "../types";

const PILL: Record<IssueGroup, string> = {
  solved: "bg-civic/10 text-civic-dark",
  being_fixed: "bg-signal/10 text-signal",
  under_review: "bg-line text-ink",
};

export const GROUP_LABEL: Record<IssueGroup, string> = {
  under_review: "Under review",
  being_fixed: "Being fixed",
  solved: "Solved",
};

const date = (iso: string) => new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });

export default function IssueCard({ issue }: { issue: PublicIssue }) {
  const category = CATEGORIES.find((c) => c.id === issue.category)?.label;
  const located = issue.lat !== undefined && issue.lng !== undefined;
  return (
    <article className="overflow-hidden rounded-lg border border-line bg-white">
      {issue.photo && (
        <img src={issue.photo} alt={`Photo of the reported problem at ${issue.area}`} loading="lazy" className="h-48 w-full object-cover" />
      )}
      <div className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-medium text-muted">{category}</p>
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${PILL[issue.group]}`}>{GROUP_LABEL[issue.group]}</span>
        </div>
        <h3 className="mt-2 font-semibold">{issue.area}</h3>
        {located && (
          <a
            href={mapLink(issue.lat!, issue.lng!)}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 inline-block text-sm font-medium text-civic underline"
          >
            View location on map<span className="sr-only"> for {issue.area} (opens in a new tab)</span>
          </a>
        )}
        <p className="mt-2 line-clamp-3 text-sm">{issue.description}</p>
        {issue.group === "solved" && issue.resolution && (
          <p className="mt-3 rounded bg-civic/10 p-3 text-sm">
            <span className="font-semibold text-civic-dark">How it was solved: </span>
            {issue.resolution}
          </p>
        )}
        {issue.group === "solved" && issue.evidencePhoto && (
          <figure className="mt-3">
            <img src={issue.evidencePhoto} alt={`Photo of the completed repair at ${issue.area}`} loading="lazy" className="h-40 w-full rounded object-cover" />
            <figcaption className="mt-1 text-xs text-muted">After the fix</figcaption>
          </figure>
        )}
        <p className="mt-3 flex flex-wrap gap-x-4 text-xs text-muted">
          <span className="font-mono">{issue.id}</span>
          <span>Reported {date(issue.submittedAt)}</span>
          {issue.resolvedAt && <span>Solved {date(issue.resolvedAt)}</span>}
        </p>
      </div>
    </article>
  );
}
