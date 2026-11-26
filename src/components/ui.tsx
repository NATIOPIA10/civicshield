import type { ReactNode } from "react";
import { STATUS_LABEL, Status } from "../types";

const TONE: Record<Status, string> = {
  submitted: "bg-line text-ink",
  under_review: "bg-info-soft text-info",
  incomplete: "bg-alert-soft text-alert",
  duplicate: "bg-line text-ink",
  assigned: "bg-info-soft text-info",
  in_progress: "bg-signal-soft text-signal",
  resolution_submitted: "bg-signal-soft text-signal",
  returned: "bg-alert-soft text-alert",
  closed: "bg-civic-soft text-civic-dark",
};

export function StatusPill({ status }: { status: Status }) {
  return <span className={`pill ${TONE[status]}`}>{STATUS_LABEL[status]}</span>;
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-3xl font-bold tracking-tight md:text-4xl">{title}</h1>
        {subtitle && <p className="mt-2 max-w-prose text-muted">{subtitle}</p>}
      </div>
      {actions}
    </header>
  );
}

const ALERT: Record<"error" | "info" | "success", string> = {
  error: "border-alert/30 bg-alert-soft text-alert",
  info: "border-info/30 bg-info-soft text-info",
  success: "border-civic/30 bg-civic-soft text-civic-dark",
};

export function Alert({ tone = "info", role, children }: { tone?: "error" | "info" | "success"; role?: "alert" | "status"; children: ReactNode }) {
  return <div role={role} className={`rounded-lg border px-4 py-3 text-sm font-medium ${ALERT[tone]}`}>{children}</div>;
}
