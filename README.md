# SCS Risk Assessment Tool

A browser-based cancer risk assessment app for health recommendation, built for the Singapore Cancer Society.

---

## Overview

The SCS Risk Assessment Tool is an interactive quiz that assesses cancer risk and provides personalised health recommendations. It is designed for use by **Singapore Cancer Society staff** at public health events and booths, where **participants** take turns on a **shared device** (tablet or laptop).

Each participant:
1. Accepts a **PDPA consent** notice before starting.
2. Completes one or more cancer risk assessments.
3. Receives tailored recommendations based on their answers.

Staff tap **"Play Again"** to reset the app for the next participant — each person must give fresh consent.

The app supports **four languages**: English, Chinese (中文), Malay, and Tamil (தமிழ்).

<screenshot_of_participant_landing_page>

---

## Key Features

### For Participants
- Multilingual quiz interface (English, Chinese, Malay, Tamil)
- PDPA consent required per session for privacy protection
- Gamified assessment experience with animated mascot
- Personalised health recommendations based on quiz results

<screenshot_of_participant_quiz_in_progress>

<screenshot_of_participant_results_screen>

### For Admins (`/admin`)
- Question bank management with cancer type assignments
- Theme and appearance customisation (colours, logos, backgrounds, mascots)
- PDPA content editing with translation support
- Assessment statistics dashboard
- Backup and restore for questions and configuration
- Multi-language content management

<screenshot_of_admin_panel_dashboard>

---

## Quick Start

### Prerequisites
- **Node.js** >= 18
- **PostgreSQL** database
- **SMTP account** for admin password reset emails

### Setup

```bash
git clone <repo-url>
cd scs-risk-assessment-tool
npm install
cp .env.example .env        # Fill in your values (see CONTRIBUTING.md for details)
npm run seed:questions       # Initial database setup
npm run dev                  # Start development server
```

Open the app:
- **Participant quiz**: [http://localhost:3000/](http://localhost:3000/)
- **Admin panel**: [http://localhost:3000/admin](http://localhost:3000/admin)

See [CONTRIBUTING.md](CONTRIBUTING.md) for the full environment variable reference and detailed setup instructions.

---

## Usage

### At an Event (Participant Flow)
1. Open the app on the shared device and hand it to the participant.
2. The participant reads and accepts the PDPA consent notice.
3. They select and complete the relevant cancer risk assessment(s).
4. Personalised recommendations are displayed at the end.
5. Staff tap **"Play Again"** to reset for the next participant.

### Admin Panel
Log in at `/admin` to manage questions, customise the app's appearance, edit PDPA content, and view assessment statistics.

For detailed step-by-step instructions, see the [User Manual](docs/USER_MANUAL.md).

---

## Documentation

| Document | Description |
|---|---|
| [CONTRIBUTING.md](CONTRIBUTING.md) | Developer setup, code standards, and PR guidelines |
| [Architecture](docs/ARCHITECTURE.md) | System architecture, API reference, and database schema |
| [User Manual](docs/USER_MANUAL.md) | Step-by-step instructions for participants and admins |
| [Question Rationale](docs/generic-assessment-questions-and-weightage.md) | Clinical rationale for assessment questions and weightage |

---

## Contributing

Contributions are welcome! Please read [CONTRIBUTING.md](CONTRIBUTING.md) for development setup, coding standards, security requirements, and PR guidelines.

---

## Contact / Support

- **Project context**: School project for SIT CSC2101 — Professional Software Development and Team Project
