# CivicShield frontend

React + TypeScript + Tailwind CSS. Runs on a mock API (browser localStorage) until the Django backend exists.

    npm install
    npm run dev

Demo report: ID `CS-2026-0001`, tracking code `DEMO-1234`.

All data access goes through `src/api/client.ts`. When the backend is ready, replace the bodies of
those functions with real `fetch` calls that follow the API contract; screens do not change.

## Tests

    npm test

Runs 66 automated checks: citizen reporting and tracking, the whole staff workflow (assign, work, evidence,
approve, feedback), provider access limits, organization and account management, photo upload, the public issues page, dashboard figures, the
summary, and the chatbot. Run it after every change. The map itself is not covered (it needs a real browser).
