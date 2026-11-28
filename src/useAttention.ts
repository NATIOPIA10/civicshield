import { useEffect, useState } from "react";
import { listStaffReports } from "./api/client";
import { OVERDUE_DAYS, isOpen } from "./analytics";
import type { StaffSession } from "./types";

export interface AttentionItem { label: string; count: number; to: string }

/** What needs this person's attention right now. Refreshes whenever `refreshKey` changes (for example after a page change). */
export function useAttention(session: StaffSession | null, refreshKey: string) {
  const [items, setItems] = useState<AttentionItem[]>([]);
  const [overdue, setOverdue] = useState(0);

  useEffect(() => {
    if (!session) return;
    let stale = false;
    listStaffReports(session).then((reports) => {
      if (stale) return;
      const n = (...statuses: string[]) => reports.filter((r) => statuses.includes(r.status)).length;
      setItems(
        session.role === "admin"
          ? [
              { label: "To review", count: n("submitted"), to: "/staff?filter=new" },
              { label: "Ready to assign", count: n("under_review"), to: "/staff?filter=assign" },
              { label: "Awaiting approval", count: n("resolution_submitted"), to: "/staff?filter=approve" },
            ]
          : [
              { label: "To start", count: n("assigned"), to: "/staff?filter=start" },
              { label: "Sent back for correction", count: n("returned"), to: "/staff?filter=doing" },
            ]
      );
      const limit = OVERDUE_DAYS * 86400000;
      setOverdue(reports.filter((r) => isOpen(r.status) && Date.now() - +new Date(r.createdAt) > limit).length);
    });
    return () => { stale = true; };
  }, [session, refreshKey]);

  return { items, overdue, total: items.reduce((sum, i) => sum + i.count, 0) };
}
