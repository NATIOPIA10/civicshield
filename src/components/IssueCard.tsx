import { mapLink } from "../mapLinks";
import { CATEGORY_ICON, Icon } from "./icons";
import { CATEGORIES, IssueGroup, PublicIssue } from "../types";

const PILL: Record<IssueGroup, string> = {
  solved: "bg-civic-soft text-civic-dark",
  being_fixed: "bg-signal-soft text-signal",
  under_review: "bg-info-soft text-info",
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
    <article className="card flex flex-col overflow-hidden transition-shadow hover:shadow-md">
      {issue.photo && (
        <img src={issue.photo} alt={`Photo of the reported problem at ${issue.area}`} loading="lazy" className="h-48 w-full object-cover" />
      )}
      <div className="flex flex-1 flex-col p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="inline-flex items-center gap-1.5 text-sm font-medium text-muted"><Icon name={CATEGORY_ICON[issue.category]} className="h-4 w-4" />{category}</p>
          <span className={`pill ${PILL[issue.group]}`}>{GROUP_LABEL[issue.group]}</span>
        </div>
        <h3 className="mt-2 text-lg font-semibold">{issue.area}</h3>
        {located && (
          <a
            href={mapLink(issue.lat!, issue.lng!)}
            target="_blank"
            rel="noopener noreferrer"
            className="link mt-1 inline-block text-sm"
          >
            View location on map<span className="sr-only"> for {issue.area} (opens in a new tab)</span>
          </a>
        )}
        <p className="mt-2 line-clamp-3 text-sm">{issue.description}</p>
        {issue.group === "solved" && issue.resolution && (
          <p className="mt-3 rounded-lg bg-civic-soft p-3 text-sm">
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
        <p className="mt-auto flex flex-wrap gap-x-4 pt-4 text-xs text-muted">
          <span className="font-mono">{issue.id}</span>
          <span>Reported {date(issue.submittedAt)}</span>
          {issue.resolvedAt && <span>Solved {date(issue.resolvedAt)}</span>}
        </p>
      </div>
    </article>
  );
}
