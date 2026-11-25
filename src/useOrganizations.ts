import { useCallback, useEffect, useState } from "react";
import { listOrganizations } from "./api/client";
import type { Organization } from "./types";

/** Loads the organization list and gives a helper to turn an id into a name. */
export function useOrganizations() {
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const reload = useCallback(() => { listOrganizations().then(setOrgs); }, []);
  useEffect(reload, [reload]);
  const orgName = (id?: string | null) => orgs.find((o) => o.id === id)?.name;
  return { orgs, orgName, reload };
}
