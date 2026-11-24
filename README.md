# ReachInbox Full-Stack Email Scheduler

A production-grade, persistent full-stack email scheduler service and SaaS dashboard built for the ReachInbox hiring assignment.

This system accepts email send requests via REST APIs or a dashboard, schedules them for target future timestamps using **BullMQ + Redis** delayed jobs (**no cron jobs**), dispatches emails via fake SMTP (**Ethereal Email**), persists state and event timelines in **PostgreSQL** via **Prisma ORM**, survives server and process restarts without dropping jobs, and provides a Next.js (App Router) user interface.

---

## 1. System Architecture & Component Responsibilities

```
                                  ┌───────────────────────────┐
                                  │   Next.js 14 Frontend     │
                                  │   (App Router + Tailwind) │
                                  └─────────────┬─────────────┘
                                                │ REST API (Fetch)
                                                ▼
                                  ┌───────────────────────────┐
                                  │    Express.js Backend     │
                                  │ (Zod, Logging, Routes)    │
                                  └──────┬─────────────┬──────┘
                                         │             │
                  1. Persist SCHEDULED   │             │ 2. Enqueue delayed job
                     with UUID jobId     │             │    (delay = scheduledAt - now)
                                         ▼             ▼
                           ┌─────────────────┐   ┌─────────────────┐
                           │   PostgreSQL    │   │  Redis (AOF)    │
                           │   Source of     │   │  BullMQ Queue   │
                           │     Truth       │   │  'email-queue'  │
                           └────────┬────────┘   └────────┬────────┘
                                    │                     │
                    Load & update   │                     │ Job matures & fires
                    status / events │                     │
                                    │    ┌───────────┐    │
                                    └────┤  BullMQ   │◄───┘
                                         │  Worker   │
                                         └─────┬─────┘
                                               │ Send via Nodemailer
                                               ▼
                                      ┌─────────────────┐
                                      │  Ethereal SMTP  │
                                      │ (Fake Inbox /   │
                                      │   Web Preview)  │
                                      └─────────────────┘
```

### Separation of Responsibilities

- **PostgreSQL**: Durable source of truth for email records, business statuses (`SCHEDULED`, `PROCESSING`, `SENT`, `FAILED`, `CANCELLED`), timestamps, and immutable audit event logs.
- **Redis (BullMQ)**: High-performance delayed job scheduler. Holds job timing metadata in persistent Redis memory (with AOF enabled) and fires jobs precisely when due.
- **Worker Process**: Consumes delayed jobs, validates database state before sending (ensuring idempotency and preventing duplicate transmissions), sends email over SMTP, and updates PostgreSQL with delivery timestamps and Ethereal preview links.
- **Ethereal Email**: Fake SMTP inbox used for development and testing. Generates public web preview URLs for sent emails without contacting real recipients.
- **Next.js Frontend**: SaaS dashboard providing statistics, an email compose modal with timezone detection, scheduled queue view, and sent email delivery history. The browser **never** connects directly to PostgreSQL or Redis.

---

## 2. Technology Stack

### Frontend
- **Framework**: Next.js 14 (App Router)
- **UI & Styling**: React 18, Tailwind CSS, Lucide Icons, clsx, tailwind-merge
- **Language**: TypeScript
- **Communication**: Native Fetch API via centralized `frontend/lib/api.ts`

### Backend
- **Server**: Node.js 22, Express.js 4
- **Language**: TypeScript (with CommonJS / `tsc` compilation and `tsx` hot-reloading)
- **Database Access**: Prisma ORM 5 with committed PostgreSQL migrations
- **Queue & Scheduler**: BullMQ 5 with Redis (`ioredis`)
- **Email Delivery**: Nodemailer 6 configured for Ethereal SMTP
- **Validation**: Zod 3 (for environment variables and API payloads)
- **Logging**: Pino 9 with structured redaction (`pino-pretty` in development)
- **Testing**: Vitest 2, Supertest 7, `@vitest/coverage-v8`

### Local Infrastructure
- **PostgreSQL 16**: Containerized with named volume `reachinbox_postgres_data`
- **Redis 7**: Containerized with Append-Only File (`--appendonly yes`) and named volume `reachinbox_redis_data`
- **Docker Compose**: Multi-container local orchestration with healthchecks

---

## 3. Windows Development Prerequisites

1. **Node.js**: v18+ (tested on Node.js v22.15.0 and npm 11.3.0)
2. **Git**: Installed and available in PATH
3. **Docker Desktop for Windows**: Running with WSL2 or Hyper-V backend (required for local PostgreSQL and Redis containers)
4. **PowerShell**: Windows PowerShell 5.1+ or PowerShell 7+

---

## 4. Repository Structure

```
reachinbox-scheduler/
├── frontend/                     # Next.js 14 App Router dashboard
│   ├── app/
│   │   ├── layout.tsx            # Root layout with sidebar navigation
│   │   ├── page.tsx              # Main dashboard overview & stats
│   │   ├── globals.css           # Tailwind base styles
│   │   ├── scheduled/page.tsx    # Scheduled emails view
│   │   └── sent/page.tsx         # Sent emails & Ethereal preview view
│   ├── components/
│   │   ├── app-sidebar.tsx       # Sidebar with brand logo & navigation
│   │   ├── dashboard-header.tsx  # Top header with live health badge
│   │   ├── dashboard-stats.tsx   # Aggregated KPI metric cards
│   │   ├── email-compose-form.tsx# Schedule modal with tz conversion
│   │   ├── email-table.tsx       # Reusable data table with pagination
│   │   ├── email-detail-modal.tsx# Audit event log viewer
│   │   └── status-badge.tsx      # Color-coded status indicators
│   ├── lib/
│   │   ├── api.ts                # Centralized backend HTTP client
│   │   ├── date.ts               # Local timezone & ISO formatting
│   │   └── types.ts              # Shared TypeScript interfaces
│   ├── .env.example              # Frontend environment template
│   └── package.json
├── backend/                      # Express API & BullMQ worker
│   ├── prisma/
│   │   ├── schema.prisma         # PostgreSQL schema (Email, EmailEvent)
│   │   └── migrations/
│   │       └── 20261124000000_init/migration.sql # Initial SQL migration
│   ├── src/
│   │   ├── config/env.ts         # Zod environment variable parsing
│   │   ├── db/prisma.ts          # PrismaClient singleton
│   │   ├── middleware/
│   │   │   ├── error-handler.ts  # Centralized error handler
│   │   │   └── not-found.ts      # 404 response handler
│   │   ├── modules/emails/
│   │   │   ├── email.routes.ts   # Express route definitions
│   │   │   ├── email.controller.ts # Route controllers
│   │   │   ├── email.service.ts  # Business logic & queue coordination
│   │   │   ├── email.repository.ts # Database operations
│   │   │   └── email.validation.ts # Zod request validators
│   │   ├── queue/
│   │   │   ├── redis.ts          # ioredis connection options
│   │   │   ├── email.queue.ts    # BullMQ Queue instance
│   │   │   └── queue-recovery.ts # Server startup reconciliation routine
│   │   ├── worker/
│   │   │   ├── email.worker.ts   # BullMQ Worker consumer
│   │   │   ├── email-sender.ts   # Nodemailer transport & preview URL
│   │   │   └── ethereal-helper.ts# Ethereal account generator script
│   │   ├── utils/
│   │   │   ├── async-handler.ts  # Async Express wrapper
│   │   │   └── logger.ts         # Pino logger with secrets redaction
│   │   ├── app.ts                # Express app configuration
│   │   └── server.ts             # Server entry point & graceful shutdown
│   ├── tests/                    # Vitest unit & integration test suites
│   ├── .env.example              # Backend environment template
│   └── package.json
├── docker-compose.yml            # Local PostgreSQL and Redis services
├── package.json                  # Monorepo root workspaces configuration
├── README.md                     # Project documentation
└── IMPLEMENTATION_REPORT.md      # Detailed handoff report
```

---

## 5. Quick Start Instructions

### Step 1: Install Dependencies
From the repository root, install dependencies for all workspaces:
```powershell
npm install
```

### Step 2: Configure Environment Variables
Copy the provided `.env.example` templates into `.env`:

**Backend:**
```powershell
Copy-Item backend\.env.example backend\.env
```

**Frontend:**
```powershell
Copy-Item frontend\.env.example frontend\.env
```

### Step 3: Start PostgreSQL & Redis with Docker Compose
Ensure Docker Desktop is running, then run:
```powershell
docker compose up -d
```
Check status:
```powershell
docker compose ps
```

### Step 4: Run Prisma Database Migrations & Generate Client
Generate Prisma Client:
```powershell
npm run prisma:generate --workspace=backend
```
Apply migrations to PostgreSQL:
```powershell
npm run prisma:migrate --workspace=backend
```

### Step 5: (Optional) Generate Ethereal Test Credentials
You can generate free test credentials in one command:
```powershell
npx tsx backend/src/worker/ethereal-helper.ts
```
Add the outputted `ETHEREAL_USER` and `ETHEREAL_PASS` into `backend/.env`. (If left blank, the worker automatically generates an ephemeral test account on the fly).

---

## 6. Running the Applications

### Run Everything Concurrently in Development
```powershell
# In Terminal 1: Backend API (with in-process BullMQ worker)
npm run dev:backend

# In Terminal 2: Next.js Frontend Dashboard
npm run dev:frontend
```

Alternatively, to run the BullMQ worker as an independent, standalone process:
```powershell
# Set in backend/.env: START_WORKER=false
# In Terminal 1: API
npm run dev:backend

# In Terminal 2: Dedicated Worker
npm run dev:worker

# In Terminal 3: Frontend
npm run dev:frontend
```

- **Frontend Dashboard**: [http://localhost:3000](http://localhost:3000)
- **Backend API**: [http://localhost:5000](http://localhost:5000)
- **API Health Check**: [http://localhost:5000/api/health](http://localhost:5000/api/health)

---

## 7. API Reference

All requests and responses use JSON.

### 1. Health Summary
`GET /api/health`

**Response (`200 OK` or `207 Multi-Status`):**
```json
{
  "status": "healthy",
  "service": "reachinbox-scheduler-api",
  "timestamp": "2026-11-24T21:30:00.000Z",
  "dependencies": {
    "database": "healthy",
    "redis": "healthy",
    "smtp": "configured"
  },
  "environment": "development"
}
```

### 2. Schedule Email
`POST /api/emails`

**Request Body:**
```json
{
  "from": "sender@reachinbox.test",
  "to": "lead@targetcompany.com",
  "subject": "Quick demo of our email scheduler",
  "body": "Hi there,\n\nI scheduled this email to show how BullMQ delayed dispatches work.",
  "scheduledAt": "2026-11-25T14:30:00.000Z"
}
```

**Response (`201 Created`):**
```json
{
  "success": true,
  "message": "Email successfully scheduled",
  "data": {
    "id": "e8381bf4-f7b2-4d1a-85b4-d5fa6cf89d42",
    "fromEmail": "sender@reachinbox.test",
    "toEmail": "lead@targetcompany.com",
    "subject": "Quick demo of our email scheduler",
    "body": "Hi there...",
    "scheduledAt": "2026-11-25T14:30:00.000Z",
    "status": "SCHEDULED",
    "queueJobId": "e8381bf4-f7b2-4d1a-85b4-d5fa6cf89d42",
    "sentAt": null,
    "etherealPreviewUrl": null,
    "lastError": null,
    "createdAt": "2026-11-24T21:30:00.000Z",
    "updatedAt": "2026-11-24T21:30:00.000Z"
  }
}
```

### 3. List Emails
`GET /api/emails?status=SCHEDULED&page=1&limit=20&search=demo`

**Response (`200 OK`):**
```json
{
  "success": true,
  "data": {
    "emails": [ ... ],
    "pagination": {
      "total": 1,
      "page": 1,
      "limit": 20,
      "totalPages": 1
    }
  }
}
```

### 4. Dashboard Stats
`GET /api/emails/stats`

**Response (`200 OK`):**
```json
{
  "success": true,
  "data": {
    "total": 12,
    "scheduled": 4,
    "processing": 0,
    "sent": 7,
    "failed": 1,
    "cancelled": 0
  }
}
```

### 5. Get Single Email
`GET /api/emails/:id`

**Response (`200 OK`):**
```json
{
  "success": true,
  "data": {
    "id": "e8381bf4-f7b2-4d1a-85b4-d5fa6cf89d42",
    "fromEmail": "sender@reachinbox.test",
    "toEmail": "lead@targetcompany.com",
    "subject": "...",
    "status": "SENT",
    "sentAt": "2026-11-25T14:30:01.000Z",
    "etherealPreviewUrl": "https://ethereal.email/message/WaQK6...",
    "events": [
      { "eventType": "CREATED", "message": "Email record created in database" },
      { "eventType": "QUEUED", "message": "Email registered in BullMQ delayed queue" },
      { "eventType": "PROCESSING", "message": "Worker processing email on attempt 1" },
      { "eventType": "SENT", "message": "Email successfully sent via Ethereal SMTP" }
    ]
  }
}
```

### 6. Cancel Scheduled Email
`POST /api/emails/:id/cancel` or `DELETE /api/emails/:id`

**Response (`200 OK`):**
```json
{
  "success": true,
  "message": "Email successfully cancelled",
  "data": {
    "id": "e8381bf4-f7b2-4d1a-85b4-d5fa6cf89d42",
    "status": "CANCELLED"
  }
}
```

---

## 8. How BullMQ Delayed Scheduling & Restart Recovery Work

### 8.1 Delayed Scheduling (No Cron Jobs)
1. When `POST /api/emails` arrives, the system verifies that no duplicate email with identical sender (`from`), recipient (`to`), `subject`, and `body` is currently scheduled, processing, or sent. If a duplicate exists, it rejects the request with HTTP 409 to prevent duplicate sending.
2. The backend calculates the millisecond delay:
   $$\text{delay} = \max(0, \text{scheduledAt.getTime}() - \text{Date.now}())$$
3. A job is added to the BullMQ `email-queue` using the email's UUID as the deterministic `jobId`:
   ```ts
   await emailQueue.add('send-email', { emailId }, { delay, jobId: emailId });
   ```
4. Redis stores this job under BullMQ's delayed zset. BullMQ internal timers monitor this set and promote the job to `active` when the delay expires.
5. When the worker consumes the job, it performs an additional check: if an identical email has already been sent to this recipient, the worker marks the email as failed due to duplicate detection and aborts transmission.

### 8.2 Restart Resilience & Startup Reconciliation
If the backend process crashes or restarts while jobs are waiting in the queue:
- **Redis Persistence**: Redis is configured with `--appendonly yes` and a named Docker volume (`reachinbox_redis_data`), so pending jobs remain intact in Redis.
- **Startup Reconciliation**: On server launch, `reconcileScheduledEmails()` runs:
  1. Queries all records in PostgreSQL where `status = 'SCHEDULED'`.
  2. Calls `emailQueue.getJob(email.id)`.
  3. If the job is found in Redis, no action is taken.
  4. If the job is missing (e.g., if Redis was flushed or restored from older backup), it recalculates the remaining delay and re-enqueues the job with its deterministic ID.
  5. Records a `REQUEUED` event in PostgreSQL.
- **Idempotency**: Running the reconciliation multiple times creates **zero** duplicate jobs because of the deterministic `jobId`.

---

## 9. Running Tests

Run the full suite of automated unit and integration tests:
```powershell
npm test
```

Run test suite with code coverage:
```powershell
npm run test:coverage --workspace=backend
```

### Test Coverage Highlights
- **Validation Tests (`validation.test.ts`)**: RFC-compliant email checks, future timestamp requirement, past date rejection, length limits, UUID validations.
- **Service Tests (`service.test.ts`)**: Database writes, BullMQ queue registrations, audit event emissions, graceful queue failure resilience, cancellation logic.
- **API Tests (`api.test.ts`)**: Health summary, 400 validation error formatting, 201 creation, 200 pagination, statistics aggregation, 404 handling.
- **Worker Delivery Tests (`queue-and-worker.test.ts`)**: Ethereal mail dispatch, preview URL capture, status transition to `PROCESSING` and `SENT`, idempotency check (skipping already `SENT` records to guarantee no duplicate sending), retry backoff triggering on failure.
- **Recovery Tests (`queue-recovery.test.ts`)**: Missing job detection, re-enqueuing with deterministic ID, idempotency across multiple consecutive executions.

---

## 10. Troubleshooting

| Symptom | Cause | Solution |
| :--- | :--- | :--- |
| **`connect ECONNREFUSED 127.0.0.1:5432`** | PostgreSQL container is stopped | Start containers: `docker compose up -d` |
| **`connect ECONNREFUSED 127.0.0.1:6379`** | Redis container is stopped | Start containers: `docker compose up -d` |
| **Prisma `P1001: Can't reach database server`** | Invalid database URL or DB starting up | Verify `DATABASE_URL` in `backend/.env` matches `docker-compose.yml` |
| **CORS Blocked in Browser** | Frontend origin does not match `FRONTEND_ORIGIN` | Set `FRONTEND_ORIGIN=http://localhost:3000` in `backend/.env` |
| **Docker permission denied on Windows** | Docker Desktop not running or user not in `docker-users` group | Start Docker Desktop as Administrator |

---

## 11. Important Testing Notice

> [!NOTE]
> **Ethereal Email is a fake SMTP testing service.**
> Emails sent through this application are captured by Ethereal and are **never delivered to real email recipients**. To view sent emails, click the **"View test email"** link in the Sent view or the email details modal to open the simulated message directly in your browser.
