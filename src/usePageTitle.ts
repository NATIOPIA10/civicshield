import { useEffect } from "react";

/** Gives each page its own browser tab title, which helps people with several tabs and screen readers. */
export function usePageTitle(title: string) {
  useEffect(() => {
    document.title = title ? `${title} - CivicShield` : "CivicShield - Dilla City public-service reports";
  }, [title]);
}
