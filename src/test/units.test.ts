import { describe, expect, it } from "vitest";
import { computeStats } from "../analytics";
import { answerQuestion, FAQS } from "../faq";
import { summarize } from "../summary";
import { ORGS, Report } from "../types";

const day = 86400000;
const now = Date.parse("2026-11-25T12:00:00Z");
const iso = (ago: number) => new Date(now - ago * day).toISOString();

const report = (over: Partial<Report>): Report => ({
  id: "CS-2026-0001", trackingCode: "AAAA-BBBB", category: "water", description: "x", area: "y",
  status: "submitted", history: [{ status: "submitted", at: iso(1) }], createdAt: iso(1), ...over,
});

describe("dashboard figures", () => {
  const reports = [
    report({ id: "1", status: "submitted", createdAt: iso(10), history: [{ status: "submitted", at: iso(10) }] }),
    report({ id: "2", status: "closed", orgId: "water", createdAt: iso(5), feedback: { rating: 4, at: iso(1) },
      history: [{ status: "submitted", at: iso(5) }, { status: "under_review", at: new Date(now - 5 * day + 6 * 3600000).toISOString() }, { status: "closed", at: iso(3) }] }),
    report({ id: "3", status: "duplicate", createdAt: iso(20) }),
    report({ id: "4", category: "telecom", status: "in_progress", orgId: "telecom", createdAt: iso(2) }),
  ];
  const st = computeStats(reports, now);

  it("counts open, overdue and closed the way the proposal defines them", () => {
    expect(st.total).toBe(4);
    expect(st.open).toBe(2); // duplicate and closed are not open
    expect(st.overdue).toBe(1); // only the 10-day-old open report passes 7 days
    expect(st.closed).toBe(1);
  });
  it("averages review time, resolution time and rating", () => {
    expect(st.avgFirstReviewHours).toBeCloseTo(6);
    expect(st.avgResolutionDays).toBeCloseTo(2);
    expect(st.avgRating).toBe(4);
  });
  it("splits by category and organization", () => {
    expect(st.byCategory).toMatchObject({ water: 3, telecom: 1, electricity: 0 });
    expect(st.byOrg.telecom).toEqual({ assigned: 1, open: 1 });
  });
  it("has 8 weekly buckets", () => expect(st.weekly).toHaveLength(8));
  it("summary only repeats figures the dashboard shows", () => {
    const text = summarize(st, ORGS).join(" ");
    expect(text).toContain("4 reports are in view: 2 open and 1 closed.");
    expect(text).toContain("1 open report has been waiting more than 7 days.");
    expect(text).toContain("4.0 out of 5");
  });
});

describe("chatbot", () => {
  const ask = (q: string) => answerQuestion(q);
  it("answers each approved question with its own entry", () => {
    for (const f of FAQS) expect(ask(f.question).text, f.question).toBe(f.answer);
  });
  it("gives safety guidance, with no repair steps, for danger", () => {
    const a = ask("There is a fallen power line near my house");
    expect(a.text).toMatch(/emergency services/);
    expect(a.text).not.toMatch(/switch off|cut the|disconnect/i);
  });
  it("will not look up a report", () => expect(ask("status of CS-2026-0001").text).toMatch(/cannot look up/));
  it("admits when it has no verified answer", () => expect(ask("What time will the power come back?").text).toMatch(/do not have verified information/));
});
