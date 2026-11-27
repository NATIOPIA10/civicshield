import type { CategoryId } from "../types";

const PATHS = {
  bolt: ["M13 2 4 14h7l-1 8 9-12h-7l1-8z"],
  drop: ["M12 3c3.2 4 6 7 6 10.5a6 6 0 0 1-12 0C6 10 8.8 7 12 3z"],
  signal: ["M5 20v-3", "M10 20v-7", "M15 20V9", "M20 20V4"],
  road: ["M8 3 5 21", "M16 3l3 18", "M12 4v3", "M12 10v4", "M12 17v3"],
  camera: ["M4 8h3l2-3h6l2 3h3v11H4z", "M12 10a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7z"],
  pin: ["M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11z", "M12 7.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5z"],
  check: ["M5 12.5 10 17.5 19 7"],
  checkCircle: ["M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z", "M8.5 12.2 11 14.7l4.5-5"],
  arrow: ["M5 12h14", "M13 6l6 6-6 6"],
  menu: ["M4 6h16", "M4 12h16", "M4 18h16"],
  close: ["M6 6l12 12", "M18 6 6 18"],
  search: ["M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14z", "M20 20l-4-4"],
  copy: ["M9 9h10v11H9z", "M6 15V4h10"],
  clipboard: ["M9 4h6v3H9z", "M7 5H5v16h14V5h-2", "M9 12h6", "M9 16h4"],
  clock: ["M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z", "M12 7.5V12l3 2"],
  chat: ["M4 5h16v11H9l-5 4z"],
  shield: ["M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3z", "M8.5 12l2.5 2.5 4.5-5"],
  chart: ["M4 20V4", "M4 20h16", "M8 16v-5", "M12 16V8", "M16 16v-3"],
  building: ["M5 21V5l7-2 7 2v16", "M3 21h18", "M9 9h2", "M13 9h2", "M9 13h2", "M13 13h2", "M10 21v-4h4v4"],
  users: ["M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z", "M2.5 20a6.5 6.5 0 0 1 13 0", "M16 4.3a3.5 3.5 0 0 1 0 6.4", "M18 14a6.5 6.5 0 0 1 3.5 6"],
  globe: ["M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z", "M3 12h18", "M12 3c2.5 2.7 3.7 5.7 3.7 9S14.5 18.3 12 21c-2.5-2.7-3.7-5.7-3.7-9S9.5 5.7 12 3z"],
  logout: ["M10 4H5v16h5", "M15 8l4 4-4 4", "M9 12h10"],
} as const;

export type IconName = keyof typeof PATHS;

export function Icon({ name, className = "h-5 w-5" }: { name: IconName; className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className={className}>
      {PATHS[name].map((d) => <path key={d} d={d} />)}
    </svg>
  );
}

export const CATEGORY_ICON: Record<CategoryId, IconName> = {
  electricity: "bolt",
  water: "drop",
  telecom: "signal",
  infrastructure: "road",
};

export function Logo({ className = "h-9 w-9" }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className={className}>
      <path d="M12 2l9 3.4v7c0 5.4-3.9 8.8-9 9.6-5.1-.8-9-4.2-9-9.6v-7z" fill="#0f6b57" />
      <path d="M8 12l3 3 5-6" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
