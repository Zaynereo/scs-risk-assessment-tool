# Contributing to SCS Risk Assessment Tool

Thank you for contributing to the SCS Risk Assessment Tool! This document is the single reference for developers working on this project. It covers environment setup, development workflow, code standards, and everything you need to get started.

---

## Table of Contents

- [Getting Started](#getting-started)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Development Workflow](#development-workflow)
- [Code Standards and Conventions](#code-standards-and-conventions)
- [Security Checklist](#security-checklist)
- [Risk Scoring Reference](#risk-scoring-reference)
- [Common Commands](#common-commands)
- [Commit and PR Guidelines](#commit-and-pr-guidelines)
- [Documentation](#documentation)

---

## Getting Started

### Prerequisites

- **Node.js** >= 18 and **npm** (bundled with Node)
- **PostgreSQL** database (local installation or hosted, e.g. Supabase)
- **SMTP account** for admin password reset emails (e.g. Resend, Gmail App Password)

### Clone and Install

```bash
git clone <repo-url>
cd scs-risk-assessment-tool
npm install
```

### Environment Setup

Copy the example file and fill in your values:

```bash
cp .env.example .env
```

**Never commit real secrets to version control.**

| Variable | Description | Required |
|---|---|---|
| `JWT_SECRET` | Secret key for signing JWT tokens. Server will not start without this. | Yes |
| `PORT` | Port the server listens on. Defaults to `3000`. | No |
| `DATABASE_URL` | PostgreSQL connection string (e.g. `postgresql://user:pass@host:port/dbname`) | Yes |
| `EMAIL_HOST` | SMTP server hostname (e.g. `smtp.resend.com`) | Yes |
| `EMAIL_PORT` | SMTP server port (typically `587`) | Yes |
| `EMAIL_USER` | SMTP username (e.g. `resend`) | Yes |
| `EMAIL_PASSWORD` | SMTP password or API key | Yes |
| `EMAIL_FROM` | Sender address for outgoing emails (e.g. `Singapore Cancer Society <noreply@example.com>`) | Yes |

### Database Initialisation

Run the seed scripts to load the initial question bank and UI translations:

```bash
npm run seed:questions
npm run seed:translations
```

> **WARNING — DESTRUCTIVE OPERATION**
> The seed scripts **delete all existing rows** from their respective tables before inserting from source files. They are intended for **initial setup only**. Running them after admins have made changes will **permanently overwrite** those changes.
> Always take a backup ("Download Backup" in the Admin Question Bank tab) before re-seeding.

The question seed reads from:
- `data/question_bank.csv`
- `data/assignments.csv`

### Start the Development Server

```bash
npm run dev
```

This starts the server with `nodemon` for automatic restarts on file changes.

| URL | Description |
|---|---|
| `http://localhost:3000/` | Participant quiz app |
| `http://localhost:3000/admin` | Admin panel |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js >= 18 |
| Framework | Express (ESM modules) |
| Database | PostgreSQL (`pg` pool) |
| Authentication | JWT (JSON Web Tokens) |
| Frontend | Vanilla HTML / CSS / JavaScript (no framework) |
| Email | Nodemailer (SMTP) |
| Testing | Node.js built-in test runner (`node --test`) + `supertest` |

---

## Project Structure

```
scs-risk-assessment-tool/
├── server.js                    # Express entrypoint
├── config/
│   └── db.js                    # PostgreSQL pool config
├── routes/
│   ├── questions.js             # Public questions API
│   ├── assessments.js           # Public assessments API
│   └── admin/
│       ├── index.js             # Admin router
│       ├── auth.js              # Login/forgot/reset
│       ├── cancerTypes.js       # Cancer type CRUD
│       ├── questions.js         # Question bank CRUD
│       ├── adminUsers.js        # Admin user management
│       ├── appearance.js        # Theme config
│       ├── pdpa.js              # PDPA settings
│       └── translations.js      # UI translations
├── models/
│   ├── questionModel.js         # Questions + assignments
│   ├── assessmentModel.js       # Assessment results
│   ├── cancerTypeModel.js       # Cancer type config
│   ├── adminModel.js            # Admin users
│   └── settingsModel.js         # Theme, PDPA, translations
├── controllers/
│   └── riskCalculator.js        # Scoring algorithm
├── middleware/
│   └── auth.js                  # JWT authentication
├── services/
│   └── emailService.js          # Password reset emails
├── utils/
│   └── csv.js                   # CSV parsing utilities
├── public/
│   ├── index.html               # Participant app
│   ├── admin.html               # Admin panel
│   ├── login.html               # Admin login
│   ├── js/
│   │   ├── main.js              # Participant app logic
│   │   ├── gameState.js         # Session state
│   │   ├── assessmentConfig.js  # Assessment loading
│   │   ├── questionLoader.js    # Question fetching
│   │   ├── uiController.js      # UI updates
│   │   ├── constants.js         # Risk thresholds
│   │   └── admin/
│   │       ├── app.js           # Admin app init
│   │       ├── router.js        # Tab routing
│   │       ├── api.js           # API client
│   │       └── views/*.js       # View controllers
│   └── css/                     # Stylesheets
├── tests/                       # Test suite
├── data/                        # CSV/JSON backups, exports, fixtures
└── docs/
    ├── ARCHITECTURE.md          # System architecture & API reference
    ├── USER_MANUAL.md           # Step-by-step user & admin instructions
    └── generic-assessment-questions-and-weightage.md  # Clinical rationale
```

### Key Files

| File | Purpose |
|---|---|
| `server.js` | Express entrypoint — mounts routes, serves static files |
| `controllers/riskCalculator.js` | Risk scoring algorithm implementation |
| `public/js/constants.js` | Risk level thresholds (LOW, MEDIUM, HIGH) |
| `public/js/main.js` | Participant app entry point (`RiskAssessmentApp` class) |
| `public/js/admin/app.js` | Admin SPA entry point |
| `middleware/auth.js` | JWT authentication and role-based access control |
| `docs/ARCHITECTURE.md` | Full architecture deep dive — API endpoints, database schema, integration checklists |
| `docs/USER_MANUAL.md` | Detailed step-by-step instructions for participants and admin users |

### Architecture Patterns

- **Backend**: Follows a `routes/ → controllers/ → models/` pattern with middleware for authentication and rate limiting.
- **Frontend**: Vanilla JavaScript modules loaded from `public/js/`. The participant app uses a class-based architecture (`RiskAssessmentApp`). The admin panel is a single-page application with tab-based routing (`public/js/admin/`).
- **Static serving**: Only the `public/` directory is served via `express.static()`. Backend files (`server.js`, `.env`, `data/`) are not accessible via HTTP.

For a comprehensive architecture reference including API endpoints, database schema, and integration checklists, see [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

---

## Development Workflow

### Test-Driven Development (TDD)

**TDD is required for this project.** All backend logic must have tests written first or alongside the implementation.

- **Backend routes, models, and controllers**: Must have corresponding tests.
- **Frontend JS utilities**: Must be tested if they contain logic (not just DOM manipulation).
- **All tests must pass (0 failures) before opening a PR or merging.**

### Running Tests

```bash
npm test
```

This runs `node --test --test-concurrency=1`. Concurrency is set to 1 to prevent race conditions with file-based fixtures and shared database state.

### Test Structure

- Test files live in `tests/` and are named `<feature>.test.js`, matching the module they test.
- Fixtures are stored in `tests/fixtures/`.
- Coverage areas include:
  - Public and admin API endpoints
  - Risk calculator and scoring logic
  - CSV utility functions
  - Frontend integrity checks
  - Model operations
  - Authentication and security

### Running in Production

```bash
npm start
```

Set `NODE_ENV=production` and configure a process manager (e.g. PM2) or hosting platform. Static assets are served from `public/` only.

---

## Code Standards and Conventions

### Naming

| Element | Convention | Example |
|---|---|---|
| CSS classes | lowercase kebab-case, component-prefixed | `ct-card`, `tp-header`, `stats-chart` |
| JavaScript variables and functions | camelCase, descriptive | `initializedContainers`, `loadQuestions` |
| HTML IDs | kebab-case, component-prefixed | `ct-translation-preview`, `stats-export-btn` |
| Test files | `<feature>.test.js` | `admin-auth.test.js`, `csv-utils.test.js` |

### General Guidelines

- **Modules**: Use ESM syntax (`import` / `export`), not CommonJS (`require`).
- **File organisation**: Follow existing patterns — place route handlers in `routes/`, data access in `models/`, business logic in `controllers/`, and admin view controllers in `public/js/admin/views/`.
- **Separation of concerns**: HTML for structure, CSS for styling, JavaScript for behaviour. Do not mix inline styles or inline scripts.
- **Descriptive names**: Prefer clarity over brevity (e.g. `initializedContainers` not `initSet`).

---

## Security Checklist

**Before any PR, verify the following.** This is mandatory — the app handles personal health data in a shared-device context.

- [ ] **No XSS**: All dynamic text is rendered with escaping (use the `esc()` helper). Never use `innerHTML` with unescaped input.
- [ ] **Input validation**: Validate all dataset attributes, URL parameters, and form fields against an allowlist before DOM use.
- [ ] **No injection**: No string concatenation into SQL queries, shell commands, or file paths with user input. Use parameterised queries.
- [ ] **OWASP Top 10**: Check for command injection, XSS, broken authentication, and sensitive data exposure.
- [ ] **PDPA compliance**: Never log or persist personally identifiable information beyond what the assessment workflow strictly requires.

### Shared-Device Considerations

This app runs on a shared tablet or laptop at health events. Multiple participants use the same device sequentially.

- Avoid storing unnecessary data in `localStorage` or `sessionStorage`.
- PDPA consent is per-participant session and resets with each "Play Again" action (`sessionStorage` is cleared).
- Ensure no participant data leaks between sessions.

---

## Risk Scoring Reference

This section is for developers working on the assessment scoring logic.

### Question Contribution

```
contribution = weight × (answerValue / 100)
```

### Risk Level Thresholds

**Specific Assessments** (single cancer type):

| Level | Score Range |
|---|---|
| LOW | 0–32% (score < 33) |
| MEDIUM | 33–65% (33 ≤ score < 66) |
| HIGH | 66%+ (score ≥ 66) |

**Generic Assessment** (per cancer type):

| Level | Score Range |
|---|---|
| LOW | 0–39% (score < 40) |
| MEDIUM | 40–69% (40 ≤ score < 70) |
| HIGH | 70%+ (score ≥ 70) |

### Weight Budget System

The total risk budget for each assessment must equal exactly **100%**:

```
quiz questions + family history weight + age risk weight + max ethnicity bonus = 100%
```

- **Quiz weight target** = `100 - familyWeight - ageRiskWeight - maxEthnicityBonus`
- **Ethnicity values** are in direct percentage format (0 = 0%, 2 = 2%, 4 = 4%) — they are not multipliers.
- **Validation** requires exact sums (uses `Math.round(x * 100)` for floating-point safety).

Key files:
- `controllers/riskCalculator.js` — backend scoring implementation
- `public/js/constants.js` — frontend risk level thresholds

For clinical rationale behind question weightage, see [`docs/generic-assessment-questions-and-weightage.md`](docs/generic-assessment-questions-and-weightage.md).

---

## Common Commands

| Command | Description |
|---|---|
| `npm install` | Install project dependencies |
| `npm run dev` | Start development server with auto-restart (nodemon) |
| `npm start` | Start production server |
| `npm test` | Run the full test suite (must pass before any PR) |
| `npm run seed:questions` | Seed question bank from CSV — **DESTRUCTIVE**, initial setup only |
| `npm run seed:translations` | Seed UI translations |

---

## Commit and PR Guidelines

### Commit Messages

Use [Conventional Commits](https://www.conventionalcommits.org/) format:

| Prefix | Use For |
|---|---|
| `feat:` | New features |
| `fix:` | Bug fixes |
| `chore:` | Maintenance tasks, dependency updates |
| `docs:` | Documentation changes |
| `test:` | Adding or updating tests |
| `refactor:` | Code restructuring without behaviour change |

Example: `feat: add multilingual support to PDPA consent screen`

### Pull Request Checklist

Before opening a PR:

- [ ] All tests pass (`npm test` with 0 failures)
- [ ] Security checklist verified (see [Security Checklist](#security-checklist))
- [ ] Code follows existing conventions (see [Code Standards](#code-standards-and-conventions))
- [ ] File layout matches existing patterns
- [ ] PR title is descriptive and under 70 characters
- [ ] PR description includes context and what was changed

### General Guidelines

- Keep PRs focused — one feature or fix per PR when possible.
- Write descriptive PR titles and include context in the description.
- Match existing patterns in file layout, naming, and separation of concerns.

---

## Documentation

| Document | Description |
|---|---|
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | System architecture, API endpoints, database schema, integration checklists |
| [`docs/USER_MANUAL.md`](docs/USER_MANUAL.md) | Step-by-step instructions for participants and admin users |
| [`docs/generic-assessment-questions-and-weightage.md`](docs/generic-assessment-questions-and-weightage.md) | Clinical rationale for question weights (Singapore Cancer Society sources) |
| [`CLAUDE.md`](CLAUDE.md) | AI-assisted development context and quick reference |
