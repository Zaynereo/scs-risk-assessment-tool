# SCS Risk Assessment Tool

## Overview

The **SCS Risk Assessment Tool** is a browser-based cancer risk assessment quiz used at events and booths by **staff members** with **public participants**.  
It is designed for a **shared device** scenario where many people sequentially complete a short quiz on the same tablet/laptop, with no persistent user accounts.

Each participant:

- Reviews and accepts a **PDPA consent** notice before starting
- Completes one or more cancer risk assessments (e.g. breast, colorectal, cervical)
- Receives a set of recommendations based on their answers

The tool stores **assessment results and configuration only**; participants remain anonymous.

## Key Features

- **Participant-facing quiz**
  - Multi-language support (EN / ZH / MS / TA)
  - PDPA consent screen (must be accepted per participant)
  - Simple game-like flow with clear call‑to‑action buttons
  - "Play Again" flow that resets state so the next participant must give consent again

- **Admin panel** (`/admin`)
  - Manage question bank and cancer type assignments
  - Configure PDPA text and translations
  - Theme and appearance editor (colours, logos, assets)
  - Recommendations and content configuration
  - Assessments snapshot and statistics view
  - Backup & restore of question bank and configurations

- **Backend API**
  - Node.js + Express REST API
  - JWT‑protected admin routes
  - PostgreSQL storage for questions, assignments, assessments and admin data
  - File‑based snapshots and CSV utilities for import/export
  - Email service for admin password reset

## Tech Stack

- **Backend**: Node.js, Express (ESM modules)
- **Database**: PostgreSQL (via `pg`)
- **Auth**: JWT-based admin authentication
- **Frontend**: Vanilla HTML/CSS/JS served statically from `public/`
- **Email**: SMTP via `nodemailer`
- **Testing**: Node built‑in test runner (`node --test`) + `supertest`

## Repository Layout (High Level)

- `server.js` – Express app and HTTP server entrypoint
- `public/` – Static frontend:
  - Participant app (`index.html`, `js/main.js`, `js/questionLoader.js`, etc.)
  - Admin SPA (`admin.html`, `js/admin/*`)
- `routes/` – Express route handlers (public, assessments, questions, admin)
- `models/` – Data access and domain models (questions, cancer types, settings, assessments, admins)
- `controllers/` – Backend logic such as the risk calculator
- `middleware/` – Shared Express middleware (e.g. JWT auth)
- `services/` – External services (e.g. `emailService.js`)
- `utils/` – Shared utilities (`csv.js`, escaping helpers, etc.)
- `data/` – CSV/JSON data files and snapshots
- `scripts/` – One‑off scripts (e.g. `seed-questions.js`)
- `tests/` – Automated test suite (API, models, utilities, frontend integrity)

For internal development standards and security checklist, see `CLAUDE.md`.

## Prerequisites

- **Node.js** ≥ 18 (recommended)
- **npm** (comes with Node)
- **PostgreSQL** database (local or hosted, e.g. Supabase)
- An SMTP account for sending admin password reset emails

## Setup & Installation

1. **Clone the repository**

   ```bash
   git clone <repo-url>
   cd scs-risk-assessment-tool
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Create your `.env` file**

   Create a `.env` file in the project root (do **not** commit this file).  
   At minimum, you will need:

   ```ini
   # JWT Secret
   JWT_SECRET=replace-with-a-long-random-secret
   PORT=3000

   # Email (SMTP) configuration
   EMAIL_HOST=smtp.example.com
   EMAIL_PORT=587
   EMAIL_USER=your-email@example.com
   EMAIL_PASSWORD=your-app-password-or-smtp-password
   EMAIL_FROM=SCS Risk Assessment <your-email@example.com>

   # Database configuration
   DATABASE_URL=postgresql://user:password@host:port/database
   ```

   - **Never** commit real secrets or passwords into version control.
   - In non‑test environments, `JWT_SECRET` is required; the server will refuse to start without it.

## Running the Application

### Development mode

Runs the server with `nodemon` so that changes to backend files restart the process automatically.

```bash
npm run dev
```

By default:

- API and frontend are served at `http://localhost:3000`
- Participant app is served from `public/` (e.g. `http://localhost:3000/`)
- Admin panel is at `http://localhost:3000/admin`

### Production mode

```bash
npm start
```

Set `NODE_ENV=production` and configure your process manager / hosting platform as needed.  
Static assets are served from `public/` only (the project root is **not** exposed).

## Testing

This project uses **Node's built-in test runner** (`node --test`) and `supertest`.

- Run the full test suite:

  ```bash
  npm test
  ```

- Tests live under the `tests/` directory and cover:
  - Public and admin API endpoints
  - Risk calculator and weight functions
  - CSV utilities
  - Admin views & frontend integrity checks

The test command runs with `--test-concurrency=1` to avoid data races with file‑based fixtures.

## Database & Data Files

- The main application uses **PostgreSQL**, configured via `DATABASE_URL`.
- Some features use **file-based data** in `data/`:
  - CSVs for initial question bank and assignments
  - Assessments snapshot JSON for the public statistics endpoint

Connection details (host, user, password, SSL settings) are read from `DATABASE_URL`.  
Avoid running destructive scripts (see below) against production data unless you know what you are doing.

## Seeding the Question Bank (Initial Setup Only)

There is a dedicated seed script for loading questions and assignments from CSV into the database:

```bash
npm run seed:questions
```

or equivalently:

```bash
node scripts/seed-questions.js
```

This script:

- Reads `data/question_bank.csv` and `data/assignments.csv`
- **Deletes all existing rows** from `questions` and `question_assignments`
- Inserts the CSV contents into the database

> **WARNING – DESTRUCTIVE OPERATION**  
> The seed script is **for initial setup only**.  
> Running it in an environment where admins are already using the panel will **permanently overwrite** their changes.  
> Always take a backup ("Download Backup" in the Question Bank tab) before considering re‑seeding.

## Typical Usage Flow

### Event / Booth Staff (Participant-Facing App)

1. Open `http://localhost:3000` (or the deployed URL) on the shared device.
2. Hand the device to the participant; they:
   - Read and accept the PDPA consent.
   - Choose the appropriate assessment(s).
   - Answer the questions and view recommendations.
3. After finishing, use the "Play Again" action to reset the flow for the next participant.
   - This clears session‑level consent so the next participant must accept PDPA again.

### Admin Users

1. Navigate to `http://localhost:3000/admin`.
2. Log in with an admin account.
3. Manage:
   - Question bank & assignments
   - PDPA content and translations
   - Theme / appearance and assets
   - Recommendations and assessment settings
   - Export backups or inspect statistics/snapshots

Admin routes are protected by JWT; authentication and rate limiting are applied on login and password‑reset endpoints.

## Security & Privacy Notes

- The app is used in a **shared device** context; avoid storing unnecessary data in local or session storage.
- PDPA consent is **per participant session** and must be re‑accepted when a new person uses the tool.
- Do not log or export personally identifiable information beyond what is strictly required for the assessment workflow.
- When making changes to the codebase, follow the security checklist and coding standards in `CLAUDE.md` (XSS prevention, input validation, OWASP Top 10, PDPA compliance).

## Contributing / Development Notes

- Follow a **Test-Driven Development (TDD)** approach for backend logic.
- All new or modified backend routes, models, and shared frontend utilities should have tests in `tests/`.
- Run `npm test` and ensure **0 failures** before raising a PR or committing.
- Match existing patterns in:
  - File structure (`routes/`, `models/`, `public/js/admin/views/`, etc.)
  - Naming conventions (kebab-case for CSS classes, camelCase for JS)
  - Separation of concerns (HTML for structure, CSS for styling, JS for behaviour).

For deeper architectural details and future feature plans, refer to the documents in `docs/` (e.g. statistics revamp plans).
