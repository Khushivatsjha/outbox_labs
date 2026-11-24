# ReachInbox Full-Stack Email Scheduler

## Antigravity Master Build Specification

**Purpose:** Build the ReachInbox Hiring Assignment as a working
full-stack email scheduler and dashboard.

**Instructions for Antigravity:** Treat this document as the project
specification. Read it fully before coding. Implement the frontend,
backend, database, queue worker, local infrastructure, tests,
documentation, and final implementation report in the currently opened
workspace.

------------------------------------------------------------------------

## 1. Product context and assignment requirements

ReachInbox.ai is a product of Outbox Labs focused on cold-email
outreach.

The assignment asks for a **production-grade email scheduler service +
dashboard** that:

1.  Accepts email send requests through APIs.
2.  Schedules emails to be sent at a specific time.
3.  Uses **BullMQ + Redis** as a persistent job scheduler. **Do not use
    cron jobs.**
4.  Sends emails using fake SMTP via **Ethereal Email**.
5.  Survives server restarts without losing scheduled jobs.
6.  Exposes a frontend dashboard that allows users to:
    -   Schedule new emails.
    -   View scheduled emails.
    -   View sent emails.

These six points are the core acceptance criteria. Do not claim a
feature is complete unless it is implemented and tested.

## 2. Technology stack --- use this stack

Use the following stack consistently. Do not silently replace a required
technology.

### Frontend

-   Next.js (App Router)
-   React
-   TypeScript
-   Tailwind CSS
-   Native HTML form controls or a small accessible component library if
    useful
-   Fetch API for communication with the backend

### Backend

-   Node.js
-   Express.js
-   TypeScript
-   Zod for request/environment validation
-   Prisma ORM for PostgreSQL access
-   Nodemailer for SMTP email delivery
-   BullMQ for delayed jobs and worker processing
-   ioredis (or BullMQ's supported Redis connection configuration) for
    Redis connectivity
-   Pino or a similarly lightweight structured logger

### Data and infrastructure

-   PostgreSQL as the durable application database
-   Redis as BullMQ's queue storage
-   Docker Compose to run PostgreSQL and Redis locally
-   Ethereal Email as the fake SMTP provider
-   npm for package management
-   Git for version control

### Important separation of responsibilities

-   PostgreSQL is the source of truth for email records and their
    current business status.
-   Redis stores BullMQ queue/job state and delayed-job metadata.
-   BullMQ schedules and delivers work to a worker.
-   The worker uses Nodemailer + Ethereal SMTP to send the email.
-   The frontend never connects directly to PostgreSQL or Redis. It only
    calls the Express API.

## 3. Repository structure

Create a clean monorepo in the currently opened Antigravity workspace.
Keep the frontend and backend separated:

``` text
reachinbox-scheduler/
├── frontend/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── globals.css
│   │   └── scheduled/
│   │       └── page.tsx
│   ├── components/
│   │   ├── app-sidebar.tsx
│   │   ├── dashboard-header.tsx
│   │   ├── email-compose-form.tsx
│   │   ├── email-table.tsx
│   │   ├── status-badge.tsx
│   │   └── dashboard-stats.tsx
│   ├── lib/
│   │   ├── api.ts
│   │   ├── date.ts
│   │   └── types.ts
│   ├── public/
│   ├── .env.example
│   └── package.json
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── migrations/
│   ├── src/
│   │   ├── config/
│   │   │   └── env.ts
│   │   ├── db/
│   │   │   └── prisma.ts
│   │   ├── middleware/
│   │   │   ├── error-handler.ts
│   │   │   └── not-found.ts
│   │   ├── modules/
│   │   │   └── emails/
│   │   │       ├── email.routes.ts
│   │   │       ├── email.controller.ts
│   │   │       ├── email.service.ts
│   │   │       ├── email.validation.ts
│   │   │       └── email.repository.ts
│   │   ├── queue/
│   │   │   ├── redis.ts
│   │   │   ├── email.queue.ts
│   │   │   └── queue-recovery.ts
│   │   ├── worker/
│   │   │   ├── email.worker.ts
│   │   │   └── email-sender.ts
│   │   ├── utils/
│   │   │   ├── async-handler.ts
│   │   │   └── logger.ts
│   │   ├── app.ts
│   │   └── server.ts
│   ├── tests/
│   ├── .env.example
│   └── package.json
├── docker-compose.yml
├── .gitignore
├── package.json
├── README.md
└── IMPLEMENTATION_REPORT.md
```

You may adjust the exact file layout if there is a clear engineering
reason, but preserve separation of frontend, API, database, queue, and
worker responsibilities.

Use npm workspaces or clear root scripts so that setup and development
commands are documented and repeatable.

## 4. Frontend requirements

Build a polished, responsive SaaS dashboard. The interface should feel
like a real email productivity product: clean typography, restrained
colors, clear spacing, accessible controls, useful empty states, and
responsive behavior on desktop and mobile.

Do not spend time on decorative animations at the expense of working
functionality.

### 4.1 Main dashboard page

Include: - Product name / logo text: ReachInbox Scheduler. - Sidebar or
top navigation with Dashboard, Scheduled, and Sent. - Dashboard heading
and a clear "Compose email" or "Schedule email" action. - Summary
cards: - Total scheduled emails. - Emails sent. - Failed emails, if
available from the API. - A recent scheduled/sent activity section. -
Loading, error, and empty states.

All counts must come from the backend API. Do not hardcode fake
statistics.

### 4.2 Compose / schedule email form

Create a functional form with these fields: - From email address. - To
email address. - Subject. - Email body. - Scheduled date. - Scheduled
time.

Behavior: - Validate required fields and email formats on the client for
user feedback. - Backend validation remains authoritative. - Prevent
scheduling in the past. - Convert the chosen local date/time into a
valid ISO timestamp before sending it to the API. Clearly display the
timezone or local-time interpretation to the user. - Show a
submitting/loading state. - Prevent accidental double submission. - Show
success feedback after the API confirms that the email was saved and
queued. - Show useful validation/API errors. - Clear or close the form
only after successful scheduling.

Use a textarea for the email body. A rich-text editor is not required.

### 4.3 Scheduled emails view

Display records fetched from the API. Include: - Recipient. - Subject. -
Scheduled date/time in the user's local timezone. - Current status. -
Created date/time. - A useful empty state. - Refresh/reload behavior.

Do not show a record as successfully scheduled unless the backend has
persisted it and successfully registered its queue job (or has a
documented recovery mechanism that guarantees it will be queued).

### 4.4 Sent emails view

Display: - Recipient. - Subject. - Sent timestamp. - Delivery status. -
Ethereal preview URL when available.

Ethereal is a testing inbox, not real delivery to the recipient. Label
the preview link clearly, for example "View test email". Open it safely
in a new tab.

### 4.5 Frontend engineering requirements

-   Use reusable typed components.
-   Keep API calls in `frontend/lib/api.ts`, not scattered across UI
    components.
-   Define shared frontend response/request types.
-   Use accessible labels, keyboard focus states, and semantic HTML.
-   Avoid exposing backend secrets in frontend environment variables.
-   Configure the backend base URL through a public frontend environment
    variable such as `NEXT_PUBLIC_API_BASE_URL`.
-   Do not connect the browser directly to PostgreSQL or Redis.
-   Handle API unavailable/network error states.

## 5. Backend requirements

Build a separate Express application in TypeScript.

### 5.1 Server and configuration

-   Express server with JSON parsing.
-   CORS configured for the local frontend origin through an environment
    variable.
-   A health endpoint: `GET /api/health`.
-   Centralized 404 handling.
-   Centralized error handling.
-   Request validation using Zod.
-   Structured logs without passwords, SMTP credentials, or full
    sensitive message content.
-   Graceful shutdown: stop accepting requests, close BullMQ
    worker/queue/Redis connections, and disconnect Prisma cleanly.
-   Validate required environment variables at startup and print
    actionable errors.

### 5.2 REST API endpoints

Implement and document these endpoints:

  --------------------------------------------------------------------------
  Method                  Endpoint                   Purpose
  ----------------------- -------------------------- -----------------------
  GET                     `/api/health`              API and dependency
                                                     health summary

  POST                    `/api/emails`              Validate, persist, and
                                                     schedule an email

  GET                     `/api/emails`              List emails; support
                                                     status filter and
                                                     pagination

  GET                     `/api/emails/:id`          Get one email

  GET                     `/api/emails/stats`        Return dashboard counts

  GET                     `/api/emails/:id/events`   Return the email's
                                                     event/attempt history
  --------------------------------------------------------------------------

The list endpoint should support a query such as
`?status=SCHEDULED&page=1&limit=20`. Validate query parameters.

For `POST /api/emails`, accept a request shaped like:

``` json
{
  "from": "sender@example.com",
  "to": "recipient@example.com",
  "subject": "A test message",
  "body": "Hello from the scheduler.",
  "scheduledAt": "2026-11-25T10:30:00.000Z"
}
```

Return a clear response containing the created email ID, status,
scheduled time, and queue-registration result. Use appropriate HTTP
status codes.

### 5.3 Email lifecycle and state

Use a documented enum/state model. At minimum support: - `SCHEDULED` -
`PROCESSING` - `SENT` - `FAILED`

If cancellation is implemented, add `CANCELLED` and implement both
database and BullMQ behavior safely. Do not expose a nonfunctional
cancel button.

Update the database status at each meaningful transition. Record failure
details safely (do not store SMTP passwords or secrets).

### 5.4 Validation and correctness

-   Validate sender and recipient email formats.
-   Validate non-empty subject and body.
-   Validate scheduledAt as a valid future timestamp.
-   Set sensible length limits.
-   Reject malformed requests with field-level errors.
-   Use UTC timestamps in storage.
-   Never trust a status supplied by the frontend.
-   Never accept SMTP credentials from API requests.

## 6. PostgreSQL database design

Use PostgreSQL locally through Docker Compose. Use Prisma ORM and
committed Prisma migrations. Do not rely only on Prisma's
development-only `db push` workflow; create and document a migration.

### 6.1 `Email` model

Create an `emails` table/model with fields equivalent to:

-   `id`: UUID primary key.
-   `fromEmail`: sender address.
-   `toEmail`: recipient address.
-   `subject`: subject text.
-   `body`: email body text.
-   `scheduledAt`: timestamp with timezone, stored as UTC.
-   `status`: enum (`SCHEDULED`, `PROCESSING`, `SENT`, `FAILED`,
    optionally `CANCELLED`).
-   `queueJobId`: unique or indexed BullMQ job identifier, nullable
    until registered.
-   `sentAt`: nullable timestamp.
-   `etherealPreviewUrl`: nullable text.
-   `lastError`: nullable safe error summary.
-   `createdAt`: timestamp.
-   `updatedAt`: timestamp.

Add useful indexes for status, scheduled time, and creation time.

### 6.2 `EmailEvent` model

Create an `email_events` table/model for an auditable timeline:

-   `id`: UUID primary key.
-   `emailId`: foreign key to Email.
-   `eventType`: e.g. `CREATED`, `QUEUED`, `PROCESSING`, `SENT`,
    `FAILED`, `REQUEUED`.
-   `message`: short safe explanation.
-   `metadata`: optional JSON for non-secret diagnostic data.
-   `createdAt`: timestamp.

Add an index on `(emailId, createdAt)`.

### 6.3 Database behavior

-   PostgreSQL is the durable source of truth for application records.
-   Use Prisma transactions where multiple database writes must succeed
    or fail together.
-   Ensure foreign keys and indexes are present.
-   Store timestamps in UTC and format for the user only in the
    frontend.
-   Do not store SMTP passwords or Redis passwords in database rows.
-   Include a migration and a seed script only if useful for local
    demonstration.
-   Do not seed fake sent records that could be mistaken for real worker
    output.

## 7. Redis, BullMQ, and delayed scheduling

This is the core of the assignment.

### 7.1 Queue design

-   Create a BullMQ queue named `email-queue`.
-   Create a separate worker process (or clearly separated worker entry
    point) that consumes the queue.
-   When the API receives a valid email request:
    1.  Validate the payload.
    2.  Persist the email row in PostgreSQL with `SCHEDULED` status.
    3.  Add a BullMQ delayed job whose delay is calculated from
        `scheduledAt - current time`.
    4.  Use the email UUID as a deterministic BullMQ `jobId` to prevent
        duplicate jobs for the same email.
    5.  Record a `QUEUED` event.
    6.  Return success only after the application has a reliable
        persisted record and queue registration.

Do not use `setTimeout`, `setInterval`, `node-cron`, OS cron, or polling
loops as the scheduler. BullMQ delayed jobs are required.

### 7.2 Job payload

Keep queue payloads small. Prefer storing only: - `emailId`

The worker should load the authoritative email details from PostgreSQL
when it processes the job. Do not put SMTP credentials in job data.

### 7.3 Worker behavior

When a job is processed: 1. Load the email from PostgreSQL. 2. If it is
already `SENT`, do not send it again. 3. If it is cancelled or otherwise
no longer eligible, safely skip it. 4. Mark it `PROCESSING` and create
an event. 5. Send via Nodemailer configured for Ethereal SMTP. 6. On
success, mark it `SENT`, save `sentAt` and the Ethereal preview URL, and
create a `SENT` event. 7. On failure, record a safe error, create a
`FAILED` event, and allow BullMQ's configured retry policy to operate.
8. Ensure retries do not result in duplicate sends after a successful
send whose database update failed.

Use a clear retry/backoff policy and document it. Do not retry permanent
validation errors indefinitely.

### 7.4 Restart resilience

Scheduled jobs must survive application/server restarts.

Implement and document all of the following: - Run Redis with a named
Docker volume so its data persists across container recreation. -
Configure Redis persistence appropriately for local development (AOF
enabled, with a named volume). - BullMQ jobs must remain in Redis when
the API or worker process restarts. - On backend startup, run a
queue-reconciliation routine: - Find future/pending email records in
PostgreSQL that should be scheduled. - Check whether the corresponding
BullMQ job exists. - Re-add only missing jobs, using deterministic job
IDs. - Do not create duplicates. - Do not requeue already sent or
cancelled emails. - Make recovery idempotent: running it multiple times
must be safe. - Document the difference between restarting the Node
process and deleting Docker volumes. Deleting volumes destroys local
persisted data.

Do not claim restart recovery is proven until it has been tested by
scheduling an email, stopping/restarting the backend/worker, and
verifying that the email is still sent at the scheduled time.

### 7.5 Failure and duplicate-send safety

Implement practical idempotency: - Use deterministic queue job IDs. -
Check database status before sending. - Avoid concurrent processing of
the same email. - Persist state transitions and event history. -
Configure bounded retries with backoff. - Explain the unavoidable
boundary between an external SMTP send and a local database transaction.
Do not claim mathematically guaranteed exactly-once delivery unless the
implementation truly provides it. Aim for safe at-least-once processing
with duplicate prevention and document residual edge cases.

## 8. Ethereal Email integration

Use **Ethereal Email fake SMTP** through Nodemailer.

-   Configure host, port, secure/TLS mode, username, and password
    through backend environment variables.
-   Never hardcode credentials.
-   Never expose SMTP credentials to the frontend.
-   Create a reusable mail transport module.
-   Send the `from`, `to`, `subject`, and `body` stored in PostgreSQL.
-   Capture the Ethereal preview URL using Nodemailer's test-message
    preview functionality where available.
-   Save the preview URL on the email record and show it in the Sent
    view.
-   Explain clearly in the UI and README that Ethereal is for testing
    and does not deliver real mail to normal recipient inboxes.

Provide either: 1. documented steps for creating an Ethereal test
account and setting its credentials, or 2. a safe development-only
helper that creates a test account and prints the credentials locally.

Never commit `.env` or real credentials.

## 9. Docker Compose and local infrastructure

Create `docker-compose.yml` at the repository root with: - PostgreSQL
service. - Redis service. - Named persistent volumes for both. - Health
checks. - Restart policies suitable for local development. - Port
mappings that avoid unnecessary exposure where practical.

Use clear defaults: - PostgreSQL container port: `5432`. - Redis
container port: `6379`.

Use environment variables for database name, user, password, and ports.
Include `.env.example` with placeholders only.

The Redis service must have persistence enabled and a named volume
mounted to its data directory.

Document that Docker Desktop must be running before
`docker compose up -d`.

## 10. Environment variables

Create `.env.example` files and explain which variables belong to the
backend and frontend.

Backend variables should include equivalents of: - `NODE_ENV` - `PORT` -
`FRONTEND_ORIGIN` - `DATABASE_URL` - `REDIS_HOST` - `REDIS_PORT` -
`REDIS_PASSWORD` (optional) - `ETHEREAL_HOST` - `ETHEREAL_PORT` -
`ETHEREAL_SECURE` - `ETHEREAL_USER` - `ETHEREAL_PASS` -
`EMAIL_WORKER_CONCURRENCY` - `EMAIL_MAX_ATTEMPTS`

Frontend variables: - `NEXT_PUBLIC_API_BASE_URL`

Do not invent or commit actual passwords. Ensure `.gitignore` excludes
all `.env` files except `.env.example`.

## 11. Testing requirements

Create meaningful tests. Prefer unit tests for validation/services and
integration tests for API/queue behavior where feasible.

At minimum verify:

1.  Health endpoint returns a healthy response when dependencies are
    available.
2.  Invalid email payload is rejected.
3.  A valid email request is saved in PostgreSQL.
4.  A BullMQ delayed job is created with the correct delay.
5.  The scheduled list API returns the email.
6.  Worker processes a due job and sends through Ethereal.
7.  A successful send updates the email to `SENT` and stores the preview
    URL.
8.  A failed send is recorded and retry behavior is observable.
9.  A job is not sent again if the database already says `SENT`.
10. Restart recovery re-adds a missing pending job without duplicating
    an existing job.

Use test doubles/mocks for unit tests; use actual local Docker services
for integration tests when practical. Clearly distinguish tests that
were run from tests that were merely written.

## 12. API and UI integration

-   Connect every dashboard count and email list to real backend
    endpoints.
-   No hardcoded sample email records in the final app.
-   Provide loading, empty, success, and error states.
-   Ensure the frontend uses the actual API response types.
-   Confirm CORS and API base URL work in the local setup.
-   Add a small visible backend connection/health indicator if
    practical.

## 13. Security and code quality

-   Validate all input on the server.
-   Keep secrets server-side.
-   Use safe error messages in API responses.
-   Avoid logging message bodies or credentials.
-   Use parameterized ORM queries; do not concatenate SQL from user
    input.
-   Add basic request size limits.
-   Keep dependencies minimal.
-   Use TypeScript types; avoid `any` unless justified.
-   Keep business logic out of route handlers.
-   Add comments only where they clarify non-obvious decisions.
-   Do not add authentication unless the assignment explicitly requires
    it; this is a local single-user demonstration and authentication
    would add scope without helping the core criteria.
-   Do not implement unrelated features such as campaigns, contact
    management, AI writing, analytics, or real bulk sending.

## 14. README requirements

Create a complete `README.md` that includes: - Project overview. -
Architecture and component responsibilities. - Tech stack. -
Prerequisites for Windows development. - Installation instructions. -
Docker startup and shutdown commands. - Environment variable setup. -
Database migration commands. - How to start the API. - How to start the
worker. - How to start the frontend. - How to create/configure Ethereal
credentials. - API endpoint documentation with sample
request/response. - How delayed scheduling works. - How restart recovery
works. - How to run tests. - Troubleshooting for Docker, PostgreSQL,
Redis, CORS, and SMTP. - Known limitations and trade-offs. - Clear note
that Ethereal is a fake SMTP testing service.

Use Windows PowerShell-friendly commands where possible.

## 15. Required final handoff report --- do not skip

After implementation, create a separate file at the repository root
named:

`IMPLEMENTATION_REPORT.md`

This file is mandatory. It is the handoff document that the user will
bring back to ChatGPT so the next development/review step can be based
on what was actually built.

The report must be factual and detailed. Include:

1.  **Implementation summary**
    -   What was built.
    -   What remains incomplete.
2.  **Final project tree**
    -   Actual files and folders created.
3.  **Technology and architecture**
    -   Actual framework/library versions where known.
    -   Frontend/backend/worker responsibilities.
    -   How the request flows from UI/API to database, BullMQ, Redis,
        worker, Ethereal, and back to the dashboard.
4.  **Database**
    -   Actual Prisma schema/models.
    -   Tables, fields, enums, indexes, relations.
    -   Migration filenames and whether migrations were successfully
        applied.
5.  **API**
    -   Every implemented endpoint, method, request shape, response
        shape, and status code.
6.  **Queue and worker**
    -   Queue name.
    -   Job name and payload.
    -   Job ID/idempotency strategy.
    -   Delay calculation.
    -   Retry/backoff settings.
    -   Worker concurrency.
    -   Restart-recovery implementation.
7.  **Environment**
    -   All required environment variable names.
    -   Which are required/optional.
    -   Do not include actual secret values.
8.  **Commands**
    -   Exact commands to install, start Docker services, migrate
        database, run API, run worker, run frontend, and run tests.
9.  **Verification evidence**
    -   Tests actually executed and their results.
    -   Build/type-check/lint results.
    -   Manual flows actually verified.
    -   Restart test result.
    -   Ethereal send/preview test result.
    -   If a test could not be run, say so explicitly and explain why.
10. **Known issues and next steps**
    -   Bugs, unfinished work, assumptions, trade-offs, and anything the
        user must configure manually.
11. **Assignment acceptance checklist**
    -   Mark each of the six core assignment requirements as `PASS`,
        `PARTIAL`, or `NOT IMPLEMENTED`.
    -   Include evidence or a short explanation for each status.
12. **Learning notes**
    -   Briefly explain the key code paths and where a beginner should
        look to understand Express, Prisma/PostgreSQL, BullMQ/Redis, the
        worker, and Ethereal.

Never claim a feature or test passed without evidence. Never put
credentials or secret values in this report.

## 16. Antigravity execution instructions

Work autonomously within the currently opened project workspace.

1.  Inspect the workspace before making changes.
2.  Create a concise implementation plan, then implement the complete
    project. Do not stop after creating only the frontend.
3.  Create all required source files, configuration files, migrations,
    tests, README, and `IMPLEMENTATION_REPORT.md`.
4.  Install dependencies using npm.
5.  Do not overwrite unrelated files. If a required file already exists,
    inspect it and preserve useful work.
6.  Do not place real credentials in source files.
7.  Do not silently skip PostgreSQL, Redis, BullMQ, or Ethereal
    integration.
8.  Run available formatting, lint, type-check, build, and test
    commands. Fix issues where possible.
9.  If Docker Desktop or an external credential is unavailable, still
    implement the integration and document exactly what remains for the
    user to do. Do not pretend the service was tested.
10. Do not deploy to paid cloud services or incur costs. The target is a
    local demonstration.
11. Keep the solution appropriately scoped to the assignment. Prioritize
    correctness and reliability over unnecessary features.
12. When finished, provide a concise summary in the Antigravity
    conversation and point the user to `IMPLEMENTATION_REPORT.md`.

### Important: do not stop to ask the user routine coding questions

Choose sensible defaults consistent with this specification. Ask only if
blocked by a decision that cannot safely be made from the requirements.

------------------------------------------------------------------------

## 17. Definition of done

The implementation is ready for review only when:

-   [ ] Frontend starts and displays the dashboard.
-   [ ] User can schedule an email through the UI.
-   [ ] Express API validates and persists the email in PostgreSQL.
-   [ ] BullMQ creates a delayed job in Redis.
-   [ ] Worker sends a due email through Ethereal.
-   [ ] Sent status, timestamp, and preview URL are persisted.
-   [ ] Scheduled and sent dashboard views use live API data.
-   [ ] Restart recovery is implemented and its test status is
    documented.
-   [ ] No cron-based scheduling is used.
-   [ ] README contains reproducible setup instructions.
-   [ ] `IMPLEMENTATION_REPORT.md` contains actual implementation
    details and honest test evidence.

**End of specification.**
