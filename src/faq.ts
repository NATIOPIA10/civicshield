/**
 * Verified answers for the citizen-support chatbot.
 * Each entry records source, owner, approval status and review date, as the proposal requires.
 * Only add an entry after its content has been checked against an official source.
 */
export interface Faq {
  id: string;
  question: string;
  answer: string;
  keywords: string[];
  links?: { label: string; to: string }[];
  source: string;
  owner: string;
  status: "approved";
  reviewed: string;
}
export interface Answer {
  text: string;
  links?: { label: string; to: string }[];
  source?: string;
}

const SRC = "CivicShield help (project team, reviewed 24 Nov 2026)";
const base = { source: SRC, owner: "Project team", status: "approved" as const, reviewed: "2026-11-24" };

export const FAQS: Faq[] = [
  { ...base, id: "how-report", question: "How do I report a problem?",
    answer: "Open Report an issue, choose the type of problem, describe what is happening, and say where it is. You can also place a pin on the map and add a photo. You do not need an account.",
    keywords: ["how do i report", "how to report", "report a problem", "report an issue", "submit a report", "make a report", "send a report", "file a report"],
    links: [{ label: "Report an issue", to: "/report" }] },
  { ...base, id: "categories", question: "What problems can I report?",
    answer: "Four kinds: electricity, water supply, network and telecommunications, and construction and public infrastructure such as damaged roads.",
    keywords: ["what problems", "what can i report", "what kind of", "which problems", "categories", "types of problem"] },
  { ...base, id: "lost-code", question: "I lost my tracking code",
    answer: "In this prototype the tracking code is shown only once and cannot be recovered, because no personal details are stored. If the problem is still not fixed, you can send a new report.",
    keywords: ["lost my tracking code", "lost my", "forgot my", "lost the", "lost code", "lost tracking", "forgot tracking", "forgot code", "can't find my", "cannot find my"],
    links: [{ label: "Report an issue", to: "/report" }] },
  { ...base, id: "codes", question: "What are the Report ID and tracking code?",
    answer: "When you send a report you get a Report ID and a tracking code. You need both to see its progress. The code keeps other people from viewing your report.",
    keywords: ["tracking code", "report id", "reference number", "what is the code"] },
  { ...base, id: "track", question: "How do I track my report?",
    answer: "Open Track a report and enter your Report ID and tracking code. You will see the current status and a timeline.",
    keywords: ["how do i track", "how to track", "track my", "track a report", "check my report", "progress of my", "status of my", "follow up"],
    links: [{ label: "Track a report", to: "/track" }] },
  { ...base, id: "statuses", question: "What do the statuses mean?",
    answer: "Received: your report arrived. Under review: the city administration is checking it. Assigned: it was given to a service provider. Work in progress: the provider is working on it. Resolved: the administration reviewed the evidence and closed it. More information needed or Merged with an existing report: the administration found a problem with the report or a matching one.",
    keywords: ["status mean", "statuses", "what does under review", "what does assigned", "what do the status", "what does received", "work in progress"] },
  { ...base, id: "resolved", question: "When is a report marked resolved?",
    answer: "Only after the service provider submits evidence of the work and the city administrator reviews and approves it. If the evidence is not accepted, the report goes back to the provider.",
    keywords: ["marked resolved", "when is it resolved", "when is a report resolved", "when will it be fixed", "who closes", "how is a report closed"] },
  { ...base, id: "account", question: "Do I need an account?",
    answer: "No. Citizens can report and track without an account. Accounts are only for city administrators and service-provider staff.",
    keywords: ["need an account", "do i need to register", "sign up", "create an account", "register"] },
  { ...base, id: "privacy", question: "Who can see my report?",
    answer: "We do not ask for your name or phone number. Someone tracking a report sees only its approved status, never internal notes. Service-provider staff see only reports assigned to their organization.",
    keywords: ["who can see", "my privacy", "personal information", "is my report private", "private"] },
  { ...base, id: "photo", question: "Can I add a photo?",
    answer: "Yes, a photo is optional. Use a JPG, PNG or WebP file up to 5 MB.",
    keywords: ["add a photo", "upload a photo", "attach a photo", "add a picture", "photo size", "picture"] },
  { ...base, id: "feedback", question: "How do I give feedback?",
    answer: "When your report is resolved, open Track a report, enter your details, and rate the result from 1 to 5. You can add a comment.",
    keywords: ["give feedback", "rate", "rating", "satisfaction", "leave a comment", "feedback"],
    links: [{ label: "Track a report", to: "/track" }] },
];

export const GREETING = "Hello. I can answer common questions about reporting and tracking problems in Dilla. I use a short list of approved answers, I cannot look up your report, and I cannot make official decisions.";

const DANGER = /\b(fallen (power )?lines?|live wires?|sparking|sparks|electric shock|electrocut\w*|gas leak|fire|flood(ing|ed)?|collaps\w*|injur\w*|bleeding|emergency|danger\w*)\b/i;

export function answerQuestion(input: string): Answer {
  const text = input.trim().toLowerCase();

  if (/cs-\d{4}-\d{4}/i.test(text)) {
    return { text: "I cannot look up or show details of any report. Use Track a report with your Report ID and tracking code.", links: [{ label: "Track a report", to: "/track" }] };
  }

  if (DANGER.test(text)) {
    return {
      text: "If anyone is hurt or in danger, contact your local emergency services now. Stay well away from fallen lines, sparks, flooding or damaged structures, and do not try to repair them yourself. You can also report the problem here so the responsible institution is informed.",
      links: [{ label: "Report an issue", to: "/report" }],
    };
  }

  if (/^(hi|hello|hey|selam|good (morning|afternoon|evening))\b/.test(text)) return { text: GREETING };

  let best: Faq | null = null;
  let bestScore = 0;
  for (const f of FAQS) {
    const score = f.keywords.reduce((sum, k) => (text.includes(k) ? sum + k.split(" ").length : sum), 0);
    if (score > bestScore) { best = f; bestScore = score; }
  }
  if (best) return { text: best.answer, links: best.links, source: best.source };

  return {
    text: "I do not have verified information on that. For official service questions, such as outage times, bills or repair schedules, please contact the service provider or the city administration directly. If something needs fixing, you can report it here.",
    links: [{ label: "Report an issue", to: "/report" }],
  };
}
