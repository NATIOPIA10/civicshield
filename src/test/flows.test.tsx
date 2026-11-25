import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import App from "../App";
import { devSeedDemoReports, staffAction, submitReport } from "../api/client";

// jsdom has no SVG, which Leaflet needs to draw map dots, so the dashboard map is replaced here.
vi.mock("../components/ReportMap", () => ({ default: () => <div>Map placeholder</div> }));
vi.mock("../components/SpotMap", () => ({ default: () => <div>Spot map placeholder</div> }));

const open = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>
  );

async function signIn(user: ReturnType<typeof userEvent.setup>, username: string, password: string) {
  await user.type(await screen.findByLabelText("Username"), username);
  await user.type(screen.getByLabelText("Password"), password);
  await user.click(screen.getByRole("button", { name: "Sign in" }));
}

const newReport = (category: "electricity" | "water" = "electricity") =>
  submitReport({ category, description: "The street light has been broken for a week.", area: "Market road" });

describe("citizen flow", () => {
  it("reports a problem through the form and tracks it", async () => {
    const user = userEvent.setup();
    open("/report");

    await user.click(screen.getByRole("radio", { name: /^Electricity/ }));
    await user.type(screen.getByLabelText("What is happening?"), "The street light has been broken for a week.");
    await user.type(screen.getByLabelText("Where is it?"), "Market road");
    await user.click(screen.getByRole("button", { name: "Send report" }));

    await screen.findByText("Your report was sent");
    const id = document.body.textContent!.match(/CS-\d{4}-\d{4}/)![0];
    const code = document.body.textContent!.match(/[A-Z2-9]{4}-[A-Z2-9]{4}/)![0];

    await user.click(screen.getByRole("link", { name: "Track this report" }));
    expect(await screen.findByLabelText("Report ID")).toHaveValue(id);
    await user.type(screen.getByLabelText("Tracking code"), code);
    await user.click(screen.getByRole("button", { name: "Show progress" }));
    expect(await screen.findByRole("heading", { name: "Received" })).toBeInTheDocument();
  });

  it("shows validation messages instead of sending an empty form", async () => {
    const user = userEvent.setup();
    open("/report");
    await user.click(screen.getByRole("button", { name: "Send report" }));
    expect(await screen.findByText("Choose the type of problem.")).toBeInTheDocument();
    expect(screen.getByText(/at least 20 characters/)).toBeInTheDocument();
    expect(screen.queryByText("Your report was sent")).not.toBeInTheDocument();
  });

  it("refuses a wrong tracking code", async () => {
    const user = userEvent.setup();
    const { reportId } = await newReport();
    open(`/track?id=${reportId}`);
    await user.type(screen.getByLabelText("Tracking code"), "WRONG-CODE");
    await user.click(screen.getByRole("button", { name: "Show progress" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("No report matches");
  });

  it("answers from the chatbot and links to tracking", async () => {
    const user = userEvent.setup();
    open("/");
    await user.click(screen.getByRole("button", { name: "Ask a question" }));
    await user.type(screen.getByLabelText("Your question"), "How do I track my report?");
    await user.click(screen.getByRole("button", { name: "Send" }));
    expect(await screen.findByText(/enter your Report ID and tracking code/)).toBeInTheDocument();
  });
});

describe("staff flow", () => {
  it("takes a report from submitted to closed and lets the citizen rate it", async () => {
    const user = userEvent.setup();
    const { reportId } = await newReport();

    // administrator reviews and assigns
    const first = open("/staff");
    await signIn(user, "admin", "admin12345");
    await user.click(await screen.findByRole("link", { name: reportId }));
    await user.click(await screen.findByRole("button", { name: "Start review" }));
    await user.selectOptions(await screen.findByLabelText("Assign to organization"), "electric");
    await user.click(screen.getByRole("button", { name: "Assign report" }));
    expect(await screen.findByRole("heading", { name: "Assigned" })).toBeInTheDocument();
    expect(screen.getByText(/Assigned to: Electric utility/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Sign out" }));
    first.unmount();

    // provider does the work and submits evidence
    open("/staff");
    await signIn(user, "provider_electric", "provider12345");
    await user.click(await screen.findByRole("link", { name: reportId }));
    await user.click(await screen.findByRole("button", { name: "Start work" }));
    await user.type(await screen.findByLabelText("Action taken"), "Replaced the broken light bulb.");
    await user.click(screen.getByRole("button", { name: "Submit resolution" }));
    expect(await screen.findByRole("heading", { name: "Resolution submitted" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Sign out" }));
  });

  it("keeps the citizen view unresolved until the administrator approves", async () => {
    const user = userEvent.setup();
    const { reportId, trackingCode } = await newReport();
    const { staffAction } = await import("../api/client");
    const admin = { role: "admin" as const, name: "Admin" };
    const provider = { role: "provider" as const, orgId: "electric", name: "P" };
    await staffAction(admin, reportId, { type: "start_review" });
    await staffAction(admin, reportId, { type: "assign", orgId: "electric" });
    await staffAction(provider, reportId, { type: "start_work" });
    await staffAction(provider, reportId, { type: "submit_resolution", summary: "Replaced the broken light." });

    open(`/track?id=${reportId}`);
    await user.type(screen.getByLabelText("Tracking code"), trackingCode);
    await user.click(screen.getByRole("button", { name: "Show progress" }));
    expect(await screen.findByRole("heading", { name: "Work in progress" })).toBeInTheDocument();
    expect(screen.queryByText("Was the problem fixed to your satisfaction?")).not.toBeInTheDocument();

    await staffAction(admin, reportId, { type: "approve" });
    await user.click(screen.getByRole("button", { name: "Show progress" }));
    expect(await screen.findByRole("heading", { name: "Resolved" })).toBeInTheDocument();
    await user.click(screen.getByRole("radio", { name: "5" }));
    await user.click(screen.getByRole("button", { name: "Send feedback" }));
    expect(await screen.findByText(/Feedback received/)).toBeInTheDocument();
  });

  it("explains what the report is waiting for when there is no action to take", async () => {
    const user = userEvent.setup();
    const { reportId } = await newReport();
    const admin = { role: "admin" as const, name: "Admin" };
    await staffAction(admin, reportId, { type: "start_review" });
    await staffAction(admin, reportId, { type: "assign", orgId: "electric" });

    open("/staff");
    await signIn(user, "admin", "admin12345");
    await user.click(await screen.findByRole("link", { name: reportId }));
    expect(await screen.findByText("Waiting for Electric utility (sample) to start work.")).toBeInTheDocument();
  });

  it("shows the reported location to the provider with links to open it and get directions", async () => {
    const user = userEvent.setup();
    const admin = { role: "admin" as const, name: "Admin" };
    const withPin = await submitReport({ category: "water", description: "A pipe is leaking badly near the school.", area: "School road", lat: 6.4089, lng: 38.31 });
    const noPin = await submitReport({ category: "water", description: "A pipe is leaking badly near the market.", area: "Market lane" });
    for (const r of [withPin, noPin]) {
      await staffAction(admin, r.reportId, { type: "start_review" });
      await staffAction(admin, r.reportId, { type: "assign", orgId: "water" });
    }

    open("/staff");
    await signIn(user, "provider_water", "provider12345");
    await user.click(await screen.findByRole("link", { name: withPin.reportId }));
    expect(await screen.findByText("Spot map placeholder")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Open in OpenStreetMap/ })).toHaveAttribute("href", expect.stringContaining("mlat=6.408900&mlon=38.310000"));
    expect(screen.getByRole("link", { name: /Get directions/ })).toHaveAttribute("href", expect.stringContaining("route=%3B6.408900%2C38.310000"));
    expect(screen.getByText("6.40890, 38.31000")).toBeInTheDocument();

    await user.click(screen.getByRole("link", { name: "Back to list" }));
    await user.click(await screen.findByRole("link", { name: noPin.reportId }));
    expect(await screen.findByText(/did not mark an exact spot/)).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Get directions/ })).not.toBeInTheDocument();
  });

  it("lets staff switch the report list to a map and back", async () => {
    const user = userEvent.setup();
    open("/staff");
    await signIn(user, "admin", "admin12345");
    await screen.findByRole("link", { name: "CS-2026-0001" });
    expect(screen.getByRole("button", { name: "List" })).toHaveAttribute("aria-pressed", "true");
    await user.click(screen.getByRole("button", { name: "Map" }));
    expect(screen.getByText("Map placeholder")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Map" })).toHaveAttribute("aria-pressed", "true");
    await user.click(screen.getByRole("button", { name: "List" }));
    expect(screen.queryByText("Map placeholder")).not.toBeInTheDocument();
  });

  it("shows a provider only the reports assigned to their organization", async () => {
    const user = userEvent.setup();
    const { reportId } = await newReport("electricity");
    const { staffAction } = await import("../api/client");
    const admin = { role: "admin" as const, name: "Admin" };
    await staffAction(admin, reportId, { type: "start_review" });
    await staffAction(admin, reportId, { type: "assign", orgId: "electric" });

    open("/staff");
    await signIn(user, "provider_water", "provider12345");
    expect(await screen.findByText("No reports here yet.")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: reportId })).not.toBeInTheDocument();
  });

  it("rejects a wrong password", async () => {
    const user = userEvent.setup();
    open("/staff");
    await signIn(user, "admin", "not-the-password");
    expect(await screen.findByRole("alert")).toHaveTextContent("Wrong username or password");
  });

  it("hides admin pages from providers", async () => {
    const user = userEvent.setup();
    open("/staff");
    await signIn(user, "provider_water", "provider12345");
    await screen.findByText("Reports assigned to you");
    expect(screen.queryByRole("link", { name: "Dashboard" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Organizations" })).not.toBeInTheDocument();
  });
});

describe("administrator screens", () => {
  it("adds an organization and a provider account that can sign in", async () => {
    const user = userEvent.setup();
    const view = open("/staff");
    await signIn(user, "admin", "admin12345");
    await user.click(await screen.findByRole("link", { name: "Organizations" }));
    await user.type(await screen.findByLabelText("Name"), "Dilla Road Authority");
    await user.selectOptions(screen.getByLabelText("Type of problems it handles"), "infrastructure");
    await user.click(screen.getByRole("button", { name: "Add organization" }));
    expect(await screen.findByText("Added Dilla Road Authority.")).toBeInTheDocument();

    await user.click(screen.getByRole("link", { name: "Staff accounts" }));
    await user.type(await screen.findByLabelText("Full name"), "Sara Bekele");
    await user.type(screen.getByLabelText("Username"), "sara");
    await user.type(screen.getByLabelText(/^Password/), "longenough1");
    await user.selectOptions(screen.getByLabelText("Organization"), "dilla-road-authority");
    await user.click(screen.getByRole("button", { name: "Create account" }));
    expect(await screen.findByText("Account sara created.")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Sign out" }));
    view.unmount();
    open("/staff");
    await signIn(user, "sara", "longenough1");
    expect(await screen.findByText("Reports assigned to you")).toBeInTheDocument();
  });

  it("shows validation errors for a short password and a taken username", async () => {
    const user = userEvent.setup();
    open("/staff");
    await signIn(user, "admin", "admin12345");
    await user.click(await screen.findByRole("link", { name: "Staff accounts" }));
    await user.type(await screen.findByLabelText("Full name"), "Test");
    await user.type(screen.getByLabelText("Username"), "admin");
    await user.type(screen.getByLabelText(/^Password/), "short");
    await user.click(screen.getByRole("button", { name: "Create account" }));
    expect(await screen.findByText("This username is already taken.")).toBeInTheDocument();
    expect(screen.getByText("Use at least 8 characters.")).toBeInTheDocument();
    expect(screen.getByText("Choose an organization for a service-provider account.")).toBeInTheDocument();
  });

  it("shows dashboard figures, the summary and filters", async () => {
    const user = userEvent.setup();
    await devSeedDemoReports();
    open("/staff");
    await signIn(user, "admin", "admin12345");
    await user.click(await screen.findByRole("link", { name: "Dashboard" }));
    expect(await screen.findByText("Automatic summary")).toBeInTheDocument();
    expect(screen.getByText("Showing 25 of 25 reports")).toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText("Category"), "water");
    await waitFor(() => expect(screen.getByText(/Showing 7 of 25 reports/)).toBeInTheDocument());
    const tiles = within(document.querySelector("dl")!);
    expect(tiles.getByText("Total reports").nextElementSibling).toHaveTextContent("7");
  });
});

describe("photo upload", () => {
  const photoInput = () => screen.getByLabelText(/^Photo/);

  it("previews a chosen photo and lets the citizen remove it", async () => {
    const user = userEvent.setup({ applyAccept: false });
    open("/report");
    await user.upload(photoInput(), new File([new Uint8Array(2048)], "pothole.jpg", { type: "image/jpeg" }));
    expect(await screen.findByText("pothole.jpg")).toBeInTheDocument();
    expect(screen.getByAltText("Selected photo preview")).toBeInTheDocument();
    expect(screen.getByText("2 KB")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Remove" }));
    expect(screen.queryByText("pothole.jpg")).not.toBeInTheDocument();
    expect(screen.getByText(/Drag a photo here/)).toBeInTheDocument();
  });

  it("rejects a file that is not a photo", async () => {
    const user = userEvent.setup({ applyAccept: false });
    open("/report");
    await user.upload(photoInput(), new File(["hello"], "notes.txt", { type: "text/plain" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Use a JPG, PNG or WebP photo.");
    expect(screen.queryByAltText("Selected photo preview")).not.toBeInTheDocument();
  });

  it("rejects a photo over 5 MB", async () => {
    const user = userEvent.setup({ applyAccept: false });
    open("/report");
    await user.upload(photoInput(), new File([new ArrayBuffer(5 * 1024 * 1024 + 1)], "huge.png", { type: "image/png" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("smaller than 5 MB");
  });

  it("sends the photo with the report and shows it to staff", async () => {
    const user = userEvent.setup({ applyAccept: false });
    open("/report");
    await user.click(screen.getByRole("radio", { name: /^Water supply/ }));
    await user.type(screen.getByLabelText("What is happening?"), "A pipe is leaking badly near the school.");
    await user.type(screen.getByLabelText("Where is it?"), "School road");
    await user.upload(photoInput(), new File([new Uint8Array(500)], "leak.png", { type: "image/png" }));
    await screen.findByText("leak.png");
    await user.click(screen.getByRole("button", { name: "Send report" }));
    // Longer wait: this test environment cannot decode images, so the photo step falls back after 1.5 s. Real browsers take milliseconds.
    await screen.findByText("Your report was sent", {}, { timeout: 6000 });
    const id = document.body.textContent!.match(/CS-\d{4}-\d{4}/)![0];
    cleanup();

    open("/staff");
    await signIn(user, "admin", "admin12345");
    await user.click(await screen.findByRole("link", { name: id }));
    expect(await screen.findByText(/Citizen photo/)).toBeInTheDocument();
    expect(screen.getByAltText("Thumbnail of the citizen photo")).toBeInTheDocument();
  });
});

describe("public issues", () => {
  const issue = (area: string) =>
    submitReport({ category: "water", description: "A pipe is leaking badly near the school.", area });
  const admin = { role: "admin" as const, name: "Admin" };
  const provider = { role: "provider" as const, orgId: "water", name: "Water" };

  // The app starts with one demo report, which is public. Start these tests from an empty list.
  const emptyList = () => localStorage.setItem("civicshield.mock.reports.v1", "[]");

  async function setUp() {
    emptyList();
    const solved = await issue("School road");
    const reviewing = await issue("Bus station");
    const unreviewed = await issue("Hidden lane");
    await staffAction(admin, solved.reportId, { type: "start_review" });
    await staffAction(admin, solved.reportId, { type: "assign", orgId: "water" });
    await staffAction(provider, solved.reportId, { type: "start_work" });
    await staffAction(provider, solved.reportId, { type: "submit_resolution", summary: "Replaced the burst pipe section." });
    await staffAction(admin, solved.reportId, { type: "approve" });
    await staffAction(admin, reviewing.reportId, { type: "start_review" });
    return { solved, reviewing, unreviewed };
  }

  it("shows reviewed and solved issues with how they were solved, and hides unreviewed ones", async () => {
    await setUp();
    open("/issues");
    expect(await screen.findByText("School road")).toBeInTheDocument();
    expect(screen.getByText("Bus station")).toBeInTheDocument();
    expect(screen.getByText("Replaced the burst pipe section.")).toBeInTheDocument();
    expect(screen.queryByText("Hidden lane")).not.toBeInTheDocument();
    const stat = (label: string) => screen.getByText(label, { selector: "dt" }).nextElementSibling;
    expect(stat("Reported")).toHaveTextContent("2");
    expect(stat("Under review")).toHaveTextContent("1");
    expect(stat("Solved")).toHaveTextContent("1");
  });

  it("shows the photo and a map link for issues that have them", async () => {
    emptyList();
    const pixel = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
    const withBoth = await submitReport({ category: "water", description: "A pipe is leaking badly near the school.", area: "School road", lat: 6.4089, lng: 38.31, photoData: pixel });
    await staffAction(admin, withBoth.reportId, { type: "start_review" });
    const { reportId } = await submitReport({ category: "water", description: "A pipe is leaking badly near the church.", area: "Church street" });
    await staffAction(admin, reportId, { type: "start_review" });

    open("/issues");
    await screen.findByText("School road");
    expect(screen.getByAltText("Photo of the reported problem at School road")).toHaveAttribute("src", pixel);
    const link = screen.getByRole("link", { name: /View location on map for School road/ });
    expect(link).toHaveAttribute("href", "https://www.openstreetmap.org/?mlat=6.408900&mlon=38.310000#map=18/6.408900/38.310000");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", expect.stringContaining("noopener"));
    // the issue without a photo or location shows neither
    expect(screen.queryByAltText("Photo of the reported problem at Church street")).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Church street/ })).not.toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: /View location on map/ })).toHaveLength(1);
  });

  it("lets the administrator hide the photo and location, and show them again", async () => {
    const user = userEvent.setup();
    emptyList();
    const pixel = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
    const { reportId } = await submitReport({ category: "water", description: "A pipe is leaking badly near the school.", area: "School road", lat: 6.4089, lng: 38.31, photoData: pixel, photoName: "leak.png" });
    await staffAction(admin, reportId, { type: "start_review" });

    const publicNow = async () => {
      const view = open("/issues");
      await screen.findByText("School road");
      const result = {
        photo: screen.queryByAltText("Photo of the reported problem at School road") !== null,
        link: screen.queryByRole("link", { name: /View location on map/ }) !== null,
      };
      view.unmount();
      return result;
    };
    expect(await publicNow()).toEqual({ photo: true, link: true });

    const staff = open("/staff");
    await signIn(user, "admin", "admin12345");
    await user.click(await screen.findByRole("link", { name: reportId }));
    await user.click(await screen.findByLabelText("Hide photo from the public page"));
    await user.click(screen.getByLabelText("Hide location from the public page"));
    await user.click(screen.getByRole("button", { name: "Save visibility" }));
    expect(await screen.findByText(/photo hidden, location hidden/)).toBeInTheDocument();
    staff.unmount();
    expect(await publicNow()).toEqual({ photo: false, link: false });

    // only the photo hidden: the location link comes back
    await staffAction(admin, reportId, { type: "set_visibility", hidePhoto: true, hideLocation: false });
    expect(await publicNow()).toEqual({ photo: false, link: true });
  });

  it("does not let a provider change what is public", async () => {
    const { reportId } = await issue("School road");
    await staffAction(admin, reportId, { type: "start_review" });
    await staffAction(admin, reportId, { type: "assign", orgId: "water" }); // visible to the provider, so only the role rule applies
    expect(await staffAction(provider, reportId, { type: "set_visibility", hidePhoto: true, hideLocation: true })).toBe("Your role cannot do this.");
  });

  it("shows the repair photo on solved issues until the administrator hides it", async () => {
    emptyList();
    const pixel = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
    const { reportId } = await issue("School road");
    await staffAction(admin, reportId, { type: "start_review" });
    await staffAction(admin, reportId, { type: "assign", orgId: "water" });
    await staffAction(provider, reportId, { type: "start_work" });
    await staffAction(provider, reportId, { type: "submit_resolution", summary: "Replaced the burst pipe section.", evidenceName: "after.png", evidenceData: pixel });

    // not public until the administrator approves
    let view = open("/issues");
    await screen.findByText("School road");
    expect(screen.queryByAltText("Photo of the completed repair at School road")).not.toBeInTheDocument();
    view.unmount();

    await staffAction(admin, reportId, { type: "approve" });
    view = open("/issues");
    await screen.findByText("School road");
    expect(screen.getByAltText("Photo of the completed repair at School road")).toHaveAttribute("src", pixel);
    expect(screen.getByText("After the fix")).toBeInTheDocument();
    view.unmount();

    await staffAction(admin, reportId, { type: "set_visibility", hidePhoto: false, hideLocation: false, hideEvidence: true });
    open("/issues");
    await screen.findByText("School road");
    expect(screen.queryByAltText("Photo of the completed repair at School road")).not.toBeInTheDocument();
  });

  it("filters by progress", async () => {
    const user = userEvent.setup();
    await setUp();
    open("/issues");
    await screen.findByText("School road");
    await user.click(screen.getByRole("button", { name: /^Solved/ }));
    expect(screen.getByText("School road")).toBeInTheDocument();
    expect(screen.queryByText("Bus station")).not.toBeInTheDocument();
  });

  it("never exposes private details", async () => {
    const { solved } = await setUp();
    await staffAction(admin, solved.reportId, { type: "note", text: "Caller seems unreliable" });
    open("/issues");
    await screen.findByText("School road");
    const page = document.body.textContent!;
    expect(page).not.toContain("unreliable");
    expect(page).not.toContain(solved.trackingCode);
    expect(page).not.toContain("Water utility");
  });

  it("appears on the home page, and the tracking page shows the approved resolution", async () => {
    const user = userEvent.setup();
    const { solved } = await setUp();
    const home = open("/");
    expect(await screen.findByText("Recently solved")).toBeInTheDocument();
    expect(screen.getByText("Replaced the burst pipe section.")).toBeInTheDocument();
    home.unmount();

    open(`/track?id=${solved.reportId}`);
    await user.type(screen.getByLabelText("Tracking code"), solved.trackingCode);
    await user.click(screen.getByRole("button", { name: "Show progress" }));
    expect(await screen.findByText("How it was resolved")).toBeInTheDocument();
  });

  it("says so when nothing is published yet", async () => {
    emptyList();
    open("/issues");
    expect(await screen.findByText("No issues have been published yet.")).toBeInTheDocument();
  });
});
