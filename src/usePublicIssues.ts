import { useEffect, useState } from "react";
import { listPublicIssues } from "./api/client";
import type { PublicIssuesData } from "./types";

export function usePublicIssues() {
  const [data, setData] = useState<PublicIssuesData | null>(null);
  useEffect(() => { listPublicIssues().then(setData); }, []);
  return data;
}
