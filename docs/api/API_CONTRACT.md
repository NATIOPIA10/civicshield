# CivicShield API contract (v0.1)

`openapi.yaml` is the formal contract. This page explains how to use it. Paste the YAML into https://editor.swagger.io to browse it.

**Rule:** the frontend and backend are both built to this contract. Change it in one place, tell everyone, update both sides.

## 1. How the frontend connects

All screens call functions in `src/api/client.ts`. Today they use a mock. To go live, replace each function body with a `fetch` to the endpoint below. Screens do not change.

| Frontend function | Endpoint | Notes |
|---|---|---|
| `submitReport` | `POST /public/reports` | Send as multipart so the photo uploads with it |
| `trackReport` | `POST /public/reports/track` | Returns `null` in the mock; the API returns 404, so map 404 to `null` |
| `submitFeedback` | `POST /public/reports/feedback` | 204 = saved, 409 = not allowed |
| `getSession` / `setSession` | `POST /auth/login`, `GET /auth/me` | Keep the tokens in memory, not localStorage |
| `listStaffReports` | `GET /staff/reports` | Server already filters providers to their organization |
| `getStaffReport` | `GET /staff/reports/{id}` | 404 if not visible |
| `staffAction` (all but `submit_resolution`) | `POST /staff/reports/{id}/actions` | Body `{type, orgId?, reason?, text?}` |
| `staffAction` (`submit_resolution`) | `POST /staff/reports/{id}/resolution` | Multipart with the evidence file |
| `listAllReportsForDashboard` + `computeStats` | `GET /staff/dashboard/stats` and `/map-points` | The server computes the figures; `src/analytics.ts` becomes the reference for the SQL |
| `listPublicIssues` | `GET /public/issues` | The frontend loads everything and filters in the browser; the API can filter and page on the server |
| `answerQuestion` (chatbot) | `POST /public/chat` | Optional; the local FAQ keeps working without it |
| `devAdvanceReport`, `devSeedDemoReports` | none | Development only; delete when the backend is live |

## 2. Who can do what

| Action `type` | Role | Allowed from status | Moves to |
|---|---|---|---|
| `start_review` | admin | submitted | under_review |
| `mark_incomplete` | admin | under_review | incomplete |
| `mark_duplicate` | admin | under_review | duplicate |
| `assign` (needs `orgId`) | admin | under_review | assigned. The organization must handle the report's category |
| `reassign` (needs `orgId`) | admin | assigned, in_progress, returned | assigned. Must be a different organization that handles the report's category. Records a note |
| `change_category` (needs `category` and `reason`) | admin | submitted, under_review, assigned, in_progress, returned (not while a resolution awaits review) | unchanged, unless the assigned organization does not handle the new category. Then the organization is removed, the status goes back to under_review, and a second note says so. Needs a different category and a reason of at least 5 characters |
| `start_work` | provider | assigned | in_progress |
| resolution endpoint | provider | in_progress, returned | resolution_submitted |
| `approve` | admin | resolution_submitted | closed |
| `return` (needs `reason`) | admin | resolution_submitted | returned |
| `note` (needs `text`) | admin or provider | any | unchanged |
| `set_visibility` (needs `hidePhoto`, `hideLocation`; optional `hideEvidence`) | admin | any | unchanged. Adds an internal note recording the change |

Wrong role gives 403. Right role at the wrong step gives 409. A provider acting on another organization's report gives 404.

## 3. Rules the backend must enforce

These cannot be left to the frontend. Write a test for each one.

1. **Organization scoping.** A provider's queries are filtered by their `orgId` on the server, in every endpoint.
2. **Public view allow-list.** `PublicReportView` is its own serializer with only the listed fields. Never build it by filtering the staff one.
3. **Tracking code.** Generate with a secure random source. Store only a hash (HMAC with a server secret). Compare in constant time. Never return it after creation, and never include it in `StaffReport`.
4. **No probing.** Wrong Report ID and wrong code give the same 404 and similar timing.
5. **Rate limits.** Submit, track, feedback, chat and login are limited per IP (suggested start: 10 requests per minute; tune later).
6. **Uploads.** JPG, PNG or WebP, 5 MB maximum, checked by file content. Store outside the code folder, and serve staff views through short-lived signed URLs.
7. **History and audit.** Every successful action writes a status-history row and an audit record (who, what, when).
8. **Closed means approved.** Only `approve` can set `closed`, only from `resolution_submitted`, only by an admin.
9. **Feedback.** Only on a closed report, once per report.
10. **Secrets.** Keys and database credentials come from environment variables, never from the repository.
11. **Public issues.** `GET /public/issues` lists only reviewed reports (not submitted, incomplete or duplicate ones) and uses its own allow-list serializer. It returns the citizen's photo and coordinates, and for solved issues the provider's repair photo, (shown as a "View location on map" link) but never tracking codes, internal notes, organizations or staff names. The report form tells citizens that photo and location become public after review.
14. **Category and organization always agree.** An assigned organization must handle the report's category. `assign` and `reassign` reject a mismatch with 400 and a message on `orgId`, and `change_category` takes the report back to review when the current organization no longer fits.
13. **Reporter's category.** Store `originalCategory` when the report is created and never overwrite it. Restoring it is an ordinary `change_category` back to that value. Citizens only see `categoryChanged`, never the reason.
12. **Approved resolution.** The resolution text is public (on the tracking page and the public list) only after the administrator has approved and closed the report.

## 3b. Changes from the mock (the frontend must adapt)

- `StaffReport` has **no** `trackingCode` (the mock stored it).
- Photo and evidence are real files with signed URLs (`photoUrl`, `evidenceUrl`), not just file names.
- `weekly` returns `weekEnding` dates; the frontend formats the labels.
- The public issues page needs the new `GET /public/issues` endpoint. The parked backend does not have it yet.
- Dashboard figures come from the server. Filters become query parameters (`days`, `category`, `orgId`).

## 4. Decisions to confirm (working assumptions)

| Decision | Assumed here | Why it matters |
|---|---|---|
| Authentication | JWT access and refresh tokens | Django REST Framework can also use sessions; JWT is simpler for a separate frontend |
| Tracking secret | Random `XXXX-XXXX` code | The proposal says "secure tracking method" without defining it |
| Status list | The nine statuses in `Status` | Replace after requirements gathering if stakeholders use different steps |
| Overdue threshold | 7 days | Returned as `overdueDays`; should become a setting |
| Photo and location are public | Shown on the public issues page after review | Exact coordinates and photos can reveal a home or people. The administrator can hide either one per report with the `set_visibility` action |
| Which reports are public | Only after administrator review | Stops spam or personal details from appearing before anyone checks them. Showing every submission at once is a one-line change |
| Admin screens | Organization and user endpoints are specified, screens are not built | Needed to cover "staff and organization management" in the proposal |

## 5. Suggested build order for the backend

1. Project, database connection, `Organization`, user model with role and `orgId`, login.
2. `Report`, status history, `POST /public/reports`, `POST /public/reports/track`.
3. Staff list and detail with organization scoping, then the actions and resolution endpoints.
4. Feedback, audit records, file storage.
5. Dashboard stats and map points.
6. Admin organization and user endpoints.
7. Chat endpoint (Phase 8, optional).
