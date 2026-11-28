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

describe("layout and guidance", () => {
  const admin = { role: "admin" as const, name: "Admin" };

  it("gives the public site a header with a clear Report an issue button and a skip link", () => {
    open("/");
    const header = screen.getByRole("banner");
    expect(within(header).getByRole("link", { name: "Report an issue" })).toBeInTheDocument();
    expect(within(header).getByRole("link", { name: "Public issues" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Skip to main content" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "What would you like to do?" })).toBeInTheDocument();
  });

  it("opens and closes the public menu on small screens", async () => {
    const user = userEvent.setup();
    open("/");
    expect(screen.queryByRole("navigation", { name: "Main mobile" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Open menu" }));
    const menu = screen.getByRole("navigation", { name: "Main mobile" });
    expect(within(menu).getByRole("link", { name: "Track a report" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Close menu" }));
    expect(screen.queryByRole("navigation", { name: "Main mobile" })).not.toBeInTheDocument();
  });

  it("shows staff a full-screen sign-in without the public header", async () => {
    open("/staff");
    expect(await screen.findByLabelText("Username")).toBeInTheDocument();
    expect(screen.queryByRole("banner")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back to the public website" })).toBeInTheDocument();
  });

  it("gives an administrator a sidebar and a top bar", async () => {
    const user = userEvent.setup();
    open("/staff");
    await signIn(user, "admin", "admin12345");
    const sidebar = await screen.findByRole("navigation", { name: "Staff" });
    for (const name of ["Reports", "Dashboard", "Organizations", "Staff accounts", "Public website"]) {
      expect(within(sidebar).getByRole("link", { name })).toBeInTheDocument();
    }
    expect(within(sidebar).getByRole("button", { name: "Sign out" })).toBeInTheDocument();
    expect(screen.getByText("MENU")).toBeInTheDocument();
    expect(screen.getByText("GENERAL")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Public issues page" })).toHaveAttribute("href", "/issues");

    const top = screen.getByRole("banner");
    expect(within(top).getByText("City administrator")).toBeInTheDocument();
    expect(within(top).getByRole("searchbox", { name: "Search reports" })).toBeInTheDocument();
    expect(within(top).getByRole("button", { name: /^Notifications/ })).toBeInTheDocument();
  });

  it("gives a provider only the Reports item", async () => {
    const user = userEvent.setup();
    open("/staff");
    await signIn(user, "provider_water", "provider12345");
    const sidebar = await screen.findByRole("navigation", { name: "Staff" });
    expect(within(sidebar).getByRole("link", { name: "Reports" })).toBeInTheDocument();
    for (const name of ["Dashboard", "Organizations", "Staff accounts"]) {
      expect(within(sidebar).queryByRole("link", { name })).not.toBeInTheDocument();
    }
    expect(within(screen.getByRole("banner")).getByText("Service provider")).toBeInTheDocument();
  });

  it("opens the staff menu on small screens", async () => {
    const user = userEvent.setup();
    open("/staff");
    await signIn(user, "admin", "admin12345");
    await user.click(await screen.findByRole("button", { name: "Open menu" }));
    await user.click(screen.getByRole("button", { name: "Close menu" }));
    expect(screen.queryByRole("button", { name: "Close menu" })).not.toBeInTheDocument();
  });

  it("shows to-do cards with counts, and filters the list when one is chosen", async () => {
    const user = userEvent.setup();
    await newReport(); // submitted, so it needs review
    open("/staff");
    await signIn(user, "admin", "admin12345");
    const group = await screen.findByRole("group", { name: "Show reports" });
    const toReview = within(group).getByRole("button", { name: /^To review/ });
    expect(toReview).toHaveTextContent("–"); // shown until the reports have loaded
    await waitFor(() => expect(toReview).toHaveTextContent("1"));
    expect(within(group).getByRole("button", { name: /^All reports/ })).toHaveTextContent("2"); // plus the demo report
    await user.click(toReview);
    expect(toReview).toHaveAttribute("aria-pressed", "true");
    expect(screen.queryByRole("link", { name: "CS-2026-0001" })).not.toBeInTheDocument();
    await user.click(within(group).getByRole("button", { name: /^Awaiting approval/ }));
    expect(screen.getByText("No reports here yet.")).toBeInTheDocument();
  });

  it("tells the administrator what to do next, step by step", async () => {
    const user = userEvent.setup();
    const { reportId } = await newReport();
    open("/staff");
    await signIn(user, "admin", "admin12345");
    await user.click(await screen.findByRole("link", { name: reportId }));
    expect(await screen.findByText("Next: review this report")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Start review" }));
    expect(await screen.findByText("Next: decide what to do")).toBeInTheDocument();
  });

  it("tells the provider what to do next", async () => {
    const user = userEvent.setup();
    const { reportId } = await newReport();
    await staffAction(admin, reportId, { type: "start_review" });
    await staffAction(admin, reportId, { type: "assign", orgId: "electric" });
    open("/staff");
    await signIn(user, "provider_electric", "provider12345");
    await user.click(await screen.findByRole("link", { name: reportId }));
    expect(await screen.findByText("Next: start work")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Start work" }));
    expect(await screen.findByText("Next: finish and report")).toBeInTheDocument();
  });

  it("shows the progress steps on the tracking page", async () => {
    const user = userEvent.setup();
    const { reportId, trackingCode } = await newReport();
    await staffAction(admin, reportId, { type: "start_review" });
    open(`/track?id=${reportId}`);
    await user.type(screen.getByLabelText("Tracking code"), trackingCode);
    await user.click(screen.getByRole("button", { name: "Show progress" }));
    const steps = await screen.findByRole("list", { name: "Progress" });
    expect(within(steps).getByText(/Received/)).toHaveTextContent("(completed)");
    expect(within(steps).getByText(/Under review/)).toHaveTextContent("(current step)");
    expect(within(steps).getByText(/Resolved/)).toHaveTextContent("(not reached yet)");
  });
});

describe("category and reassignment", () => {
  const admin = { role: "admin" as const, name: "Admin" };
  const electric = { role: "provider" as const, orgId: "electric", name: "Electric" };

  const inProgress = async () => {
    const r = await newReport("electricity");
    await staffAction(admin, r.reportId, { type: "start_review" });
    await staffAction(admin, r.reportId, { type: "assign", orgId: "electric" });
    await staffAction(electric, r.reportId, { type: "start_work" });
    return r;
  };

  it("lets the administrator correct the category with a reason, and records it", async () => {
    const user = userEvent.setup();
    const { reportId } = await newReport("electricity");
    open("/staff");
    await signIn(user, "admin", "admin12345");
    await user.click(await screen.findByRole("link", { name: reportId }));
    await user.selectOptions(await screen.findByLabelText("Category"), "water");

    // a reason is needed
    await user.click(screen.getByRole("button", { name: "Save category" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Give a short reason for the change");

    await user.type(screen.getByLabelText("Why is the category changing?"), "Pipe burst, not electrical");
    await user.click(screen.getByRole("button", { name: "Save category" }));
    expect(await screen.findByText("Category changed from Electricity to Water supply. Reason: Pipe burst, not electrical.")).toBeInTheDocument();
    expect(screen.getByText(/Water supply - (School|Market) road/)).toBeInTheDocument();
    expect(screen.getByText("Reporter chose Electricity")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save category" })).toBeDisabled(); // nothing left to save
  });

  it("keeps the reporter's choice visible and lets the administrator restore it", async () => {
    const user = userEvent.setup();
    const { reportId } = await newReport("electricity");
    await staffAction(admin, reportId, { type: "change_category", category: "water", reason: "First guess" });
    await staffAction(admin, reportId, { type: "change_category", category: "telecom", reason: "Second guess" });

    open("/staff");
    await signIn(user, "admin", "admin12345");
    await user.click(await screen.findByRole("link", { name: reportId }));
    expect(await screen.findByText("Reporter chose Electricity")).toBeInTheDocument(); // still the first choice, not the previous one
    await user.click(screen.getByRole("button", { name: "Restore the reporter's choice" }));
    expect(await screen.findByText("Category changed from Network and telecommunications to Electricity. Reason: Restored the category chosen by the reporter.")).toBeInTheDocument();
    expect(screen.queryByText(/Reporter chose/)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Restore the reporter's choice" })).not.toBeInTheDocument();
  });

  it("tells the citizen when the category was updated, and only then", async () => {
    const user = userEvent.setup();
    const { reportId, trackingCode } = await newReport("electricity");
    const lookup = async () => {
      const view = open(`/track?id=${reportId}`);
      await user.type(screen.getByLabelText("Tracking code"), trackingCode);
      await user.click(screen.getByRole("button", { name: "Show progress" }));
      await screen.findByRole("heading", { name: "Received" });
      return view;
    };

    let view = await lookup();
    expect(screen.queryByText("Updated by the city administration")).not.toBeInTheDocument();
    view.unmount();

    await staffAction(admin, reportId, { type: "change_category", category: "water", reason: "Pipe burst, not electrical" });
    view = await lookup();
    expect(screen.getByText("Updated by the city administration")).toBeInTheDocument();
    expect(document.body.textContent).not.toContain("Pipe burst"); // the reason stays internal
    view.unmount();

    await staffAction(admin, reportId, { type: "change_category", category: "electricity", reason: "Restored the category chosen by the reporter." });
    await lookup();
    expect(screen.queryByText("Updated by the city administration")).not.toBeInTheDocument(); // back to what the reporter chose
  });

  it("shows the corrected category on the public page", async () => {
    localStorage.setItem("civicshield.mock.reports.v1", "[]");
    const { reportId } = await newReport("electricity");
    await staffAction(admin, reportId, { type: "start_review" });
    await staffAction(admin, reportId, { type: "change_category", category: "water", reason: "Pipe burst, not electrical" });
    open("/issues");
    const card = await screen.findByRole("article");
    expect(within(card).getByText("Water supply")).toBeInTheDocument();
    expect(within(card).queryByText("Electricity")).not.toBeInTheDocument();
  });

  it("moves a report to another organization that handles the same category and sends it back to Assigned", async () => {
    const user = userEvent.setup();
    const { createOrganization } = await import("../api/client");
    const second = await createOrganization("Electric Co-op (sample)", "electricity");
    if (typeof second === "string") throw new Error(second);
    const coop = { role: "provider" as const, orgId: second.id, name: "Co-op" };
    const { reportId } = await inProgress();

    open("/staff");
    await signIn(user, "admin", "admin12345");
    await user.click(await screen.findByRole("link", { name: reportId }));
    expect(await screen.findByRole("heading", { name: "In progress" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reassign report" })).toBeDisabled(); // choose an organization first

    // only organizations that handle Electricity are offered: not the water utility, and not the current organization
    const choices = within(screen.getByLabelText("Move to another organization")).getAllByRole("option").map((o) => o.textContent);
    expect(choices).toEqual(["Choose...", "Electric Co-op (sample)"]);

    await user.selectOptions(screen.getByLabelText("Move to another organization"), second.id);
    await user.click(screen.getByRole("button", { name: "Reassign report" }));
    expect(await screen.findByRole("heading", { name: "Assigned" })).toBeInTheDocument();
    expect(screen.getByText("Reassigned from Electric utility (sample) to Electric Co-op (sample).")).toBeInTheDocument();
    expect(screen.getByText("Waiting for Electric Co-op (sample) to start work.")).toBeInTheDocument();

    const { listStaffReports } = await import("../api/client");
    expect((await listStaffReports(coop)).map((r) => r.id)).toContain(reportId);
    expect((await listStaffReports(electric)).map((r) => r.id)).not.toContain(reportId);
  });

  it("takes an assigned report back to review when the new category does not fit its organization", async () => {
    const user = userEvent.setup();
    const { reportId } = await inProgress();
    open("/staff");
    await signIn(user, "admin", "admin12345");
    await user.click(await screen.findByRole("link", { name: reportId }));
    await user.selectOptions(await screen.findByLabelText("Category"), "water");
    expect(screen.getByText(/This report is assigned to Electric utility \(sample\), which does not handle Water supply\. Saving takes it back to review/)).toBeInTheDocument();
    await user.type(screen.getByLabelText("Why is the category changing?"), "Pipe burst, not electrical");
    await user.click(screen.getByRole("button", { name: "Save category" }));

    expect(await screen.findByRole("heading", { name: "Under review" })).toBeInTheDocument();
    expect(screen.getByText("Taken back to review: Electric utility (sample) does not handle Water supply. Assign an organization that handles it.")).toBeInTheDocument();
    expect(screen.getByText("Assigned to: Not assigned")).toBeInTheDocument();
    // the old provider no longer has it, and the administrator can only pick a water organization
    const { listStaffReports } = await import("../api/client");
    expect((await listStaffReports(electric)).map((r) => r.id)).not.toContain(reportId);
    const choices = within(screen.getByLabelText("Assign to organization")).getAllByRole("option").map((o) => o.textContent);
    expect(choices).toEqual(["Choose...", "Water utility (sample)"]);
  });

  it("only offers organizations that handle the report's category when assigning", async () => {
    const user = userEvent.setup();
    const { reportId } = await newReport("electricity");
    await staffAction(admin, reportId, { type: "start_review" });
    open("/staff");
    await signIn(user, "admin", "admin12345");
    await user.click(await screen.findByRole("link", { name: reportId }));
    const choices = within(await screen.findByLabelText("Assign to organization")).getAllByRole("option").map((o) => o.textContent);
    expect(choices).toEqual(["Choose...", "Electric utility (sample)"]);
    expect(screen.getByText(/Only organizations that handle Electricity are listed/)).toBeInTheDocument();
  });

  it("explains what to do when no organization handles the category yet", async () => {
    const user = userEvent.setup();
    const { reportId } = await newReport("electricity");
    await staffAction(admin, reportId, { type: "start_review" });
    localStorage.setItem("civicshield.mock.orgs.v1", JSON.stringify([{ id: "water", name: "Water utility (sample)", category: "water" }]));
    open("/staff");
    await signIn(user, "admin", "admin12345");
    await user.click(await screen.findByRole("link", { name: reportId }));
    expect(await screen.findByText(/No organization handles Electricity yet/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Add one under Organizations" })).toHaveAttribute("href", "/staff/organizations");
    expect(screen.getByRole("button", { name: "Assign report" })).toBeDisabled();
  });

  it("refuses an organization that does not handle the category, and category changes while a result awaits review", async () => {
    const { reportId } = await newReport("electricity");
    await staffAction(admin, reportId, { type: "start_review" });
    expect(await staffAction(admin, reportId, { type: "assign", orgId: "water" })).toBe(
      "Water utility (sample) handles Water supply, not Electricity. Choose an organization that handles this category."
    );
    expect(await staffAction(admin, reportId, { type: "assign", orgId: "electric" })).toMatchObject({ status: "assigned" });
    expect(await staffAction(admin, reportId, { type: "reassign", orgId: "water" })).toBe(
      "Water utility (sample) handles Water supply, not Electricity. Choose an organization that handles this category."
    );

    await staffAction(electric, reportId, { type: "start_work" });
    await staffAction(electric, reportId, { type: "submit_resolution", summary: "Replaced the broken light." });
    expect(await staffAction(admin, reportId, { type: "change_category", category: "water", reason: "Pipe burst, not electrical" })).toMatch(/not available at the report's current step/);
  });

  it("keeps these controls away from providers and closed reports", async () => {
    const user = userEvent.setup();
    const { reportId } = await inProgress();
    expect(await staffAction(electric, reportId, { type: "change_category", category: "water", reason: "Pipe burst, not electrical" })).toBe("Your role cannot do this.");
    expect(await staffAction(electric, reportId, { type: "reassign", orgId: "water" })).toBe("Your role cannot do this.");

    open("/staff");
    await signIn(user, "provider_electric", "provider12345");
    await user.click(await screen.findByRole("link", { name: reportId }));
    await screen.findByText("Next: finish and report");
    expect(screen.queryByLabelText("Category")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Move to another organization")).not.toBeInTheDocument();
  });

  it("refuses invalid changes", async () => {
    const { reportId } = await inProgress();
    expect(await staffAction(admin, reportId, { type: "change_category", category: "electricity", reason: "Pipe burst, not electrical" })).toBe("The report already has this category.");
    expect(await staffAction(admin, reportId, { type: "change_category", category: "water", reason: "no" })).toBe("Give a short reason for the change (at least 5 characters).");
    expect(await staffAction(admin, reportId, { type: "change_category", category: "water", reason: "     " })).toBe("Give a short reason for the change (at least 5 characters).");
    expect(await staffAction(admin, reportId, { type: "reassign", orgId: "electric" })).toBe("The report is already assigned to this organization.");
    expect(await staffAction(admin, reportId, { type: "reassign", orgId: "nope" })).toBe("Choose an organization.");

    const fresh = await newReport();
    expect(await staffAction(admin, fresh.reportId, { type: "reassign", orgId: "water" })).toMatch(/not available at the report's current step/);

    await staffAction(electric, reportId, { type: "submit_resolution", summary: "Replaced the broken light." });
    await staffAction(admin, reportId, { type: "approve" });
    expect(await staffAction(admin, reportId, { type: "change_category", category: "water", reason: "Pipe burst, not electrical" })).toMatch(/not available at the report's current step/);
  });
});

describe("admin dashboard design", () => {
  const admin = { role: "admin" as const, name: "Admin" };

  async function openDashboard(user: ReturnType<typeof userEvent.setup>) {
    open("/staff");
    await signIn(user, "admin", "admin12345");
    await user.click(await screen.findByRole("link", { name: "Dashboard" }));
    await screen.findByText("Automatic summary");
  }

  it("keeps every figure, chart and note, laid out as cards", async () => {
    const user = userEvent.setup();
    await devSeedDemoReports();
    await openDashboard(user);

    // the four headline cards, the first one highlighted, each with an arrow link
    const tiles = within(document.querySelector("dl")!);
    for (const label of ["Total reports", "Open reports", "Closed reports"]) expect(tiles.getByText(label)).toBeInTheDocument();
    expect(tiles.getByText(/^Overdue \(open over 7 days\)$/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "View reports: Closed reports" })).toHaveAttribute("href", "/staff?filter=closed");
    expect(screen.getByRole("link", { name: "View reports: Total reports" })).toHaveAttribute("href", "/staff");

    // every panel that existed before is still there, with its title
    for (const title of [
      "New reports per week (last 8 weeks)",
      "Automatic summary",
      "Reports by category",
      "Workload by organization (open reports)",
      "Resolution progress",
      "Reports by status",
      "Report locations",
    ]) {
      expect(screen.getByRole("heading", { name: title })).toBeInTheDocument();
    }
    expect(screen.getByText(/Template-based summary built only from the figures on this page/)).toBeInTheDocument();

    // the other three figures now sit in the dark card
    expect(screen.getByText(/^Citizen satisfaction \(\d+ ratings\)$/)).toBeInTheDocument();
    expect(screen.getByText("Average time to first review")).toBeInTheDocument();
    expect(screen.getByText("Average time to resolution")).toBeInTheDocument();
  });

  it("draws the weekly bars with a readable text version, and the gauge with a summary", async () => {
    const user = userEvent.setup();
    await devSeedDemoReports();
    await openDashboard(user);
    const weeks = screen.getAllByText(/^Week ending /);
    expect(weeks).toHaveLength(8);
    expect(weeks[0].textContent).toMatch(/Week ending .+: \d+ new reports?/);
    expect(screen.getByRole("img", { name: /^\d+% of reports closed$/ })).toBeInTheDocument();
    expect(screen.getByText(/^Closed \(\d+\)$/)).toBeInTheDocument();
    expect(screen.getByText(/^In progress \(\d+\)$/)).toBeInTheDocument();
    expect(screen.getByText(/^Pending \(\d+\)$/)).toBeInTheDocument();
  });

  it("lists every organization in the workload card, and every category", async () => {
    const user = userEvent.setup();
    await devSeedDemoReports();
    await openDashboard(user);
    const workload = screen.getByRole("heading", { name: "Workload by organization (open reports)" }).closest("section")!;
    for (const name of ["Electric utility (sample)", "Water utility (sample)", "Telecom provider (sample)", "Roads and construction office (sample)"]) {
      expect(within(workload).getByText(name)).toBeInTheDocument();
    }
    expect(within(workload).getByRole("link", { name: "Manage organizations" })).toHaveAttribute("href", "/staff/organizations");
    const categories = screen.getByRole("heading", { name: "Reports by category" }).closest("section")!;
    for (const name of ["Electricity", "Water supply", "Network and telecommunications", "Construction and public infrastructure"]) {
      expect(within(categories).getByText(name)).toBeInTheDocument();
    }
  });

  it("says when the gauge leaves out incomplete and duplicate reports", async () => {
    const user = userEvent.setup();
    const { reportId } = await newReport();
    await staffAction(admin, reportId, { type: "start_review" });
    await staffAction(admin, reportId, { type: "mark_duplicate" });
    await openDashboard(user);
    expect(screen.getByText(/Incomplete and duplicate reports \(1\) are not counted here/)).toBeInTheDocument();
  });
});

describe("search and notifications", () => {
  const admin = { role: "admin" as const, name: "Admin" };

  it("searches reports from the top bar, and clears the search", async () => {
    const user = userEvent.setup();
    const first = await submitReport({ category: "water", description: "A pipe is leaking badly near the school.", area: "Market road" });
    await submitReport({ category: "water", description: "A pipe is leaking badly near the church.", area: "Church street" });
    open("/staff");
    await signIn(user, "admin", "admin12345");
    await screen.findByRole("link", { name: first.reportId });
    await user.type(screen.getByRole("searchbox", { name: "Search reports" }), "market{Enter}");
    expect(await screen.findByText(/Showing reports that match/)).toHaveTextContent("market");
    expect(screen.getByRole("link", { name: first.reportId })).toBeInTheDocument();
    expect(screen.queryByText("Church street")).not.toBeInTheDocument();

    await user.clear(screen.getByRole("searchbox", { name: "Search reports" }));
    await user.type(screen.getByRole("searchbox", { name: "Search reports" }), "zzzz{Enter}");
    expect(await screen.findByText("No reports match your search.")).toBeInTheDocument();

    await user.click(screen.getByRole("link", { name: "Clear search" }));
    expect(await screen.findByRole("link", { name: first.reportId })).toBeInTheDocument();
    expect(screen.queryByText(/Showing reports that match/)).not.toBeInTheDocument();
  });

  it("shows how many things need attention on the bell, and links to them", async () => {
    const user = userEvent.setup();
    const { reportId } = await newReport();
    open("/staff");
    await signIn(user, "admin", "admin12345");
    const bell = await screen.findByRole("button", { name: "Notifications: 1 need your attention" });
    await user.click(bell);
    const panel = screen.getByRole("region", { name: "Needs your attention" });
    await user.click(within(panel).getByRole("link", { name: /To review/ }));
    expect(await screen.findByRole("link", { name: reportId })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^To review/ })).toHaveAttribute("aria-pressed", "true");
    expect(screen.queryByRole("link", { name: "CS-2026-0001" })).not.toBeInTheDocument();
  });

  it("tells a provider what needs them, and an administrator when nothing does", async () => {
    const user = userEvent.setup();
    const { reportId } = await newReport();
    await staffAction(admin, reportId, { type: "start_review" });
    await staffAction(admin, reportId, { type: "assign", orgId: "electric" });

    open("/staff");
    await signIn(user, "provider_electric", "provider12345");
    await user.click(await screen.findByRole("button", { name: "Notifications: 1 need your attention" }));
    expect(within(screen.getByRole("region", { name: "Needs your attention" })).getByRole("link", { name: /To start/ })).toHaveAttribute("href", "/staff?filter=start");
  });

  it("opens the report list on the card named in the link", async () => {
    const user = userEvent.setup();
    open("/staff?filter=closed");
    await signIn(user, "admin", "admin12345");
    expect(await screen.findByRole("button", { name: /^Closed/ })).toHaveAttribute("aria-pressed", "true");
    expect(await screen.findByText("No reports here yet.")).toBeInTheDocument();
  });
});

describe("reports page like the dashboard", () => {
  const admin = { role: "admin" as const, name: "Admin" };

  async function twoReports() {
    const water = await submitReport({ category: "water", description: "A pipe is leaking badly near the school.", area: "School road" });
    const power = await submitReport({ category: "electricity", description: "The street light has been broken for a week.", area: "Market road" });
    await staffAction(admin, power.reportId, { type: "start_review" });
    await staffAction(admin, power.reportId, { type: "assign", orgId: "electric" });
    return { water, power };
  }

  it("filters the list by category, shows the count, and clears the filter", async () => {
    const user = userEvent.setup();
    const { water, power } = await twoReports();
    open("/staff");
    await signIn(user, "admin", "admin12345");
    await screen.findByRole("link", { name: water.reportId });
    expect(screen.getByText("3 reports · All reports")).toBeInTheDocument(); // plus the demo report

    await user.selectOptions(screen.getByLabelText("Category"), "electricity");
    expect(screen.getByRole("link", { name: power.reportId })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: water.reportId })).not.toBeInTheDocument();
    expect(screen.getByText("1 report · All reports")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Clear filters" }));
    expect(screen.getByRole("link", { name: water.reportId })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Clear filters" })).not.toBeInTheDocument();
  });

  it("lets an administrator filter by organization, and combines it with the cards", async () => {
    const user = userEvent.setup();
    const { water, power } = await twoReports();
    open("/staff");
    await signIn(user, "admin", "admin12345");
    await screen.findByRole("link", { name: power.reportId });
    await user.selectOptions(screen.getByLabelText("Organization"), "electric");
    expect(screen.getByRole("link", { name: power.reportId })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: water.reportId })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /^To review/ })); // the only electric report is already assigned
    expect(screen.getByText("No reports here yet.")).toBeInTheDocument();
    expect(screen.getByText("0 reports · To review")).toBeInTheDocument();
  });

  it("gives a provider a category filter but no organization filter", async () => {
    const user = userEvent.setup();
    open("/staff");
    await signIn(user, "provider_water", "provider12345");
    await screen.findByText("Reports assigned to you");
    expect(screen.getByLabelText("Category")).toBeInTheDocument();
    expect(screen.queryByLabelText("Organization")).not.toBeInTheDocument();
  });

  it("shows each report's category and organization in its row, and highlights the chosen card", async () => {
    const user = userEvent.setup();
    const { power } = await twoReports();
    open("/staff");
    await signIn(user, "admin", "admin12345");
    const row = (await screen.findByRole("link", { name: power.reportId })).closest("tr")!;
    expect(within(row).getByText("Electricity")).toBeInTheDocument();
    expect(within(row).getByText("Electric utility (sample)")).toBeInTheDocument();
    expect(within(row).getByText("Assigned")).toBeInTheDocument();

    const all = screen.getByRole("button", { name: /^All reports/ });
    expect(all).toHaveAttribute("aria-pressed", "true");
    expect(all.className).toContain("card-hero"); // the chosen card gets the green highlight
    await user.click(screen.getByRole("button", { name: /^Ready to assign/ }));
    expect(all).toHaveAttribute("aria-pressed", "false");
    expect(all.className).not.toContain("card-hero");
  });
});

describe("sidebar joined to the page", () => {
  const admin = { role: "admin" as const, name: "Admin" };

  it("marks the current page as the active tab, and moves it when you navigate", async () => {
    const user = userEvent.setup();
    open("/staff");
    await signIn(user, "admin", "admin12345");
    const sidebar = await screen.findByRole("navigation", { name: "Staff" });
    const reports = within(sidebar).getByRole("link", { name: "Reports" });
    const dashboard = within(sidebar).getByRole("link", { name: "Dashboard" });
    expect(reports.className).toContain("nav-tab");
    expect(reports).toHaveAttribute("aria-current", "page");
    expect(dashboard.className).not.toContain("nav-tab");

    await user.click(dashboard);
    await screen.findByText("Automatic summary");
    expect(within(sidebar).getByRole("link", { name: "Dashboard" }).className).toContain("nav-tab");
    expect(within(sidebar).getByRole("link", { name: "Dashboard" })).toHaveAttribute("aria-current", "page");
    expect(within(sidebar).getByRole("link", { name: "Reports" }).className).not.toContain("nav-tab");
  });

  it("keeps Reports as the active tab on a report's detail page", async () => {
    const user = userEvent.setup();
    const { reportId } = await newReport();
    await staffAction(admin, reportId, { type: "start_review" });
    open("/staff");
    await signIn(user, "admin", "admin12345");
    await user.click(await screen.findByRole("link", { name: reportId }));
    await screen.findByRole("heading", { name: "Under review" });
    const sidebar = screen.getByRole("navigation", { name: "Staff" });
    expect(within(sidebar).getByRole("link", { name: "Reports" }).className).toContain("nav-tab");
  });

  it("highlights only one menu item at a time, and never the general links", async () => {
    const user = userEvent.setup();
    open("/staff");
    await signIn(user, "admin", "admin12345");
    const sidebar = await screen.findByRole("navigation", { name: "Staff" });
    const tabs = within(sidebar).getAllByRole("link").filter((l) => l.className.includes("nav-tab"));
    expect(tabs).toHaveLength(1);
    expect(within(sidebar).getByRole("link", { name: "Public website" }).className).not.toContain("nav-tab");
  });
});
