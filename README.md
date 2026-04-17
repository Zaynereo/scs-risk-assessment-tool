# SCS Risk Assessment Tool

A browser-based cancer risk assessment app for the Singapore Cancer Society, used at public health events and booths.

---

## Overview

The SCS Risk Assessment Tool is an interactive quiz that assesses cancer risk and provides personalised health recommendations. It is designed for **Singapore Cancer Society staff** at public health events, where **participants** take turns on a **shared device** (tablet or laptop).

Each participant:
1. Accepts a **PDPA consent** notice before starting.
2. Completes one or more cancer risk assessments (specific or generic).
3. Receives tailored recommendations based on their answers.

Staff tap **"Play Again"** to reset the app for the next participant — each person must give fresh consent.

The app supports **four languages**: English, Chinese (中文), Malay, and Tamil (தமிழ்).

---

## Key Features

### For Participants
- Multilingual quiz interface (English, Chinese, Malay, Tamil)
- PDPA consent required per session for privacy protection
- Gamified assessment with animated mascot and swipe-based questions
- Personalised health recommendations and screening booking links (SCS + HealthierSG)
- Generic assessment with per-cancer risk breakdown

### For Admins (`/admin`)
- Question bank management with cancer type assignments and per-question explanation toggles
- Cancer type editor with demographic risk settings, gender filtering, and weight budget validation
- Theme and appearance customisation (logos, mascots, backgrounds, partner logos, music)
- PDPA content editing with four-language translation support
- Assessment records with filtering, sorting, and CSV export
- Analytics dashboard with KPI cards, risk distribution, and cohort explorer
- Admin user management with role-based access (Admin / Super Admin)
- Backup and restore for questions and admin accounts

---

## Quick Start

### Prerequisites

- **Node.js** >= 18
- **PostgreSQL** database (local or hosted, e.g. Supabase)
- **Resend account** for admin password reset and assessment result emails

### Setup

```bash
git clone <repo-url>
cd scs-risk-assessment-tool
npm install
cp .env.example .env        # Fill in your values (see CONTRIBUTING.md for details)
npm run seed:questions       # Load initial question bank (DESTRUCTIVE — initial setup only)
npm run seed:translations    # Load initial UI translations
npm run dev                  # Start development server
```

| URL | Description |
|-----|-------------|
| `http://localhost:3000/` | Participant quiz app |
| `http://localhost:3000/admin` | Admin panel |

See [CONTRIBUTING.md](CONTRIBUTING.md) for the full environment variable reference, database initialisation details, and development workflow.

---

## Common Commands

| Command | Description |
|---------|-------------|
| `npm install` | Install project dependencies |
| `npm run dev` | Start development server with auto-restart (nodemon) |
| `npm start` | Start production server |
| `npm test` | Run the full test suite (31 files, must pass before any PR) |
| `npm run seed:questions` | Seed question bank from CSV — **DESTRUCTIVE**, initial setup only |
| `npm run seed:translations` | Seed UI translations from JSON |
| `npm run dump:translations` | Export live UI translations to JSON backup |

---

## Testing

The test suite uses **fully isolated in-memory mocks** — no `.env` file, database connection, or external service is required to run tests.

- **Database**: All integration tests use an in-memory mock pool (`tests/helpers/mockPool.js`) that pattern-matches SQL queries against fixture data. No real PostgreSQL connection is made.
- **Email**: Email service tests mock `global.fetch` to prevent real Resend API calls. Test-only placeholder values are used for all environment variables.
- **Authentication**: JWT tokens are generated with a hardcoded test-only secret (`test-only-secret-not-for-production`). No real `JWT_SECRET` is needed.
- **Fixtures**: Test data lives in `tests/fixtures/` (JSON and CSV files with synthetic data only — no real credentials or PII).

```bash
npm test    # Runs all 31 test files with --test-concurrency=1
```

All tests must pass with 0 failures before merging.

---

## Project Structure

```
scs-risk-assessment-tool/
├── server.js              # Express entrypoint
├── config/db.js           # PostgreSQL pool configuration
├── routes/                # API route handlers (public + admin)
├── controllers/           # Business logic (risk scoring)
├── models/                # Data access layer (PostgreSQL queries)
├── middleware/             # JWT authentication, role-based access
├── services/              # Email service (Resend HTTP API)
├── utils/                 # Shared utilities (CSV parsing, env validation)
├── public/                # Static frontend (HTML/CSS/JS, served by Express)
│   ├── js/                # Participant app modules
│   ├── js/admin/          # Admin SPA modules
│   ├── css/               # Stylesheets
│   └── assets/            # Images, mascots, backgrounds, music
├── tests/                 # Test suite (31 files, fully mocked)
│   ├── fixtures/          # Synthetic test data (JSON/CSV)
│   └── helpers/           # Mock pool, setup/teardown utilities
├── data/                  # CSV/JSON seed files and backups
├── scripts/               # Maintenance scripts (seeding, migrations)
└── docs/                  # Documentation and guides
```

---

## Usage

### At an Event (Participant Flow)
1. Open the app on the shared device and hand it to the participant.
2. The participant reads and accepts the PDPA consent notice.
3. They select their gender, choose a cancer type (or the generic assessment), and complete the quiz.
4. Personalised recommendations and screening booking links are displayed.
5. Staff tap **"Play Again"** to reset for the next participant.

### Admin Panel
Log in at `/admin` to manage questions, customise the app's appearance, edit PDPA content, and view assessment statistics.

For detailed step-by-step instructions, see the [User Manual](docs/USER_MANUAL.md).

---

## Documentation

| Document | Description |
|----------|-------------|
| [CONTRIBUTING.md](CONTRIBUTING.md) | Developer setup, environment variables, code standards, and PR guidelines |
| [Architecture](docs/ARCHITECTURE.md) | System architecture, API endpoints, database schema, and integration checklists |
| [User Manual](docs/USER_MANUAL.md) | Step-by-step instructions for participants and admins |
| [Question Rationale](docs/generic-assessment-questions-and-weightage.md) | Clinical rationale for assessment questions and weightage |
| [Deployment Guide](docs/Render_Deployment_Guide.md) | Render hosting deployment steps |
| [Database Setup](docs/Supabase_Setup_Guide.md) | Supabase PostgreSQL setup guide |
| [Email Setup](docs/Resend_Setup_Guide.md) | Resend email service configuration |

---

## Contributing

Contributions are welcome. Read [CONTRIBUTING.md](CONTRIBUTING.md) for development setup, coding standards, security requirements, and PR guidelines.

---

## Contact / Support

- **Project context**: School project for SIT CSC2101 — Professional Software Development and Team Project -- Team D1 (Tan Bing Kun Terence, Kwek Li Xuan, Andi Tan Kim Eng, Habib Noor Bin Shahul Hameed)
