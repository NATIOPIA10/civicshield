import { Icon } from "./icons";

const STAGES = ["Received", "Under review", "Assigned", "In progress", "Resolved"];

/** Maps the citizen-facing status label to a step. Labels that are not on the normal path return -1. */
const INDEX: Record<string, number> = {
  Received: 0,
  "Under review": 1,
  "Assigned to a service provider": 2,
  "Work in progress": 3,
  Resolved: 4,
};

export const stageIndex = (label: string) => INDEX[label] ?? -1;

export default function ProgressSteps({ label }: { label: string }) {
  const current = stageIndex(label);
  if (current < 0) return null;
  return (
    <ol aria-label="Progress" className="grid grid-cols-5">
      {STAGES.map((stage, i) => {
        const done = i < current || (i === current && current === STAGES.length - 1);
        const active = i === current && !done;
        return (
          <li key={stage} aria-current={active ? "step" : undefined} className="relative flex flex-col items-center text-center">
            {i < STAGES.length - 1 && <span aria-hidden className={`absolute left-1/2 top-4 h-0.5 w-full ${i < current ? "bg-civic" : "bg-line"}`} />}
            <span
              className={`relative z-10 grid h-8 w-8 place-items-center rounded-full text-sm font-bold ${
                done ? "bg-civic text-white" : active ? "border-2 border-civic bg-white text-civic ring-4 ring-civic-soft" : "border border-line bg-white text-muted"
              }`}
            >
              {done ? <Icon name="check" className="h-4 w-4" /> : i + 1}
            </span>
            <span className={`mt-2 text-xs sm:text-sm ${active || done ? "font-semibold text-ink" : "text-muted"}`}>
              {stage}
              <span className="sr-only">{done ? " (completed)" : active ? " (current step)" : " (not reached yet)"}</span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}
