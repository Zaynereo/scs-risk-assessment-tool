# SCS Risk Assessment Tool — System Architecture

## Table of Contents

1. [Overview](#1-overview)
2. [Architecture Layers](#2-architecture-layers)
3. [Risk Scoring Algorithm](#3-risk-scoring-algorithm)
4. [API Endpoints](#4-api-endpoints)
5. [Database Schema](#5-database-schema)
6. [Frontend Structure](#6-frontend-structure)
7. [Integration Checklists](#7-integration-checklists)

---

## 1. Overview

### Application Type
Browser-based cancer risk assessment quiz used at events and booths by staff members with public participants.

### Usage Pattern
- **Shared device**: Many different people use the same device sequentially
- **No persistent user accounts**: Participants remain anonymous
- **PDPA consent per participant**: Each participant must accept consent before starting; consent resets on "Play Again"
- **Multi-language support**: English, Chinese (中文), Malay (Bahasa Melayu), Tamil (தமிழ்)

### Technology Stack
- **Backend**: Node.js 18+, Express (ESM modules), JWT authentication
- **Database**: PostgreSQL (via `pg` pool) — primary storage for all data
- **Frontend**: Vanilla HTML/CSS/JavaScript (no framework)
- **Testing**: Node built-in test runner (`node --test`) + supertest
- **Email**: Nodemailer for admin password reset

### Data Storage
- **PostgreSQL**: Primary database for questions, assignments, assessments, admins, settings
- **CSV/JSON files** (`data/` folder): Backups, exports, test fixtures only

---

## 2. Architecture Layers

The system uses a three-layer architecture for quiz content and logic:

### 2.1 Assessments Layer

Each assessment corresponds to a cancer type and stores:

**Display/UX Fields:**
- `id` — Unique identifier (e.g., `colorectal`, `breast`, `lung`, `generic`)
- `icon` — Cancer type icon/image path
- `name_en`, `name_zh`, `name_ms`, `name_ta` — Localized names
- `description_en`, `description_zh`, `description_ms`, `description_ta` — Localized descriptions
- `familyLabel_en`, etc. — Localized family history question labels

**Demographic Risk Configuration:**
- `familyWeight` — Percentage contribution from family history (default: 10)
- `genderFilter` — "all", "male", or "female"
- `ageRiskThreshold` — Age at which age-based risk applies (e.g., 50)
- `ageRiskWeight` — Percentage risk added for age >= threshold
- `ethnicityRisk_chinese`, `ethnicityRisk_malay`, etc. — Risk multipliers per ethnicity

**Risk Thresholds:**
- **Specific Assessments** (colorectal, breast, etc.):
  - LOW: 0-32%
  - MEDIUM: 33-65%
  - HIGH: 66%+
- **Generic Assessment** (per cancer type):
  - LOW: 0-39%
  - MEDIUM: 40-69%
  - HIGH: 70%+

### 2.2 Question Bank Layer (Content-Only)

The Question Bank is a master catalogue of question wordings and explanations, independent of any assessment.

**Fields:**
- `id` — Unique question identifier (e.g., `"38"`, `"q_smoke"`)
- `prompt_en`, `prompt_zh`, `prompt_ms`, `prompt_ta` — Localized question text
- `explanationYes_en`, etc. — Explanation shown when user answers "Yes"
- `explanationNo_en`, etc. — Explanation shown when user answers "No"

**Important:** Question Bank entries do NOT contain:
- Weights
- Yes/No values
- Cancer type assignments
- Minimum age

These belong to the Assignments layer.

### 2.3 Question Assignments Layer (Scoring/Usage)

A Question Assignment describes how a bank question is used in a specific assessment.

**Fields:**
- `questionId` — Foreign key into Question Bank
- `assessmentId` — Which assessment this belongs to (e.g., `colorectal`, `generic`)
- `targetCancerType` — Which cancer this contributes to in scoring
- `weight` — Percentage contribution (0-100)
- `yesValue` — Value (0-100) when answered "Yes" (default: 100)
- `noValue` — Value (0-100) when answered "No" (default: 0)
- `category` — Risk category (Diet & Nutrition, Lifestyle, Medical History, Family & Genetics)
- `minAge` — Optional minimum age to show this assignment

**Behavior:**

**Specific Assessments** (e.g., `colorectal`):
- `assessmentId` = cancer type ID
- `targetCancerType` = same as `assessmentId`
- All assignments contribute to single cancer's risk score
- Sum of weights ≈ 100% (minus demographic weights)

**Generic Assessment** (`assessmentId = 'generic'`):
- `targetCancerType` varies per assignment (e.g., `lung`, `breast`, `colorectal`)
- Same `questionId` can appear multiple times with different `targetCancerType`
- Scoring aggregates contributions per cancer type for triage display

### 2.4 Design Patterns and Scenarios

**Multi-cancer lifestyle factors** (smoking, alcohol, obesity):
- Modelled as single Question Bank entry with multiple assignments
- Each assignment can have different weight and category
- Example: "Do you smoke?" appears once in bank, but has assignments for lung (22%), cervical (10%), prostate (8%), colorectal (5%)

**Symptoms tied to one cancer:**
- Bank question with assignments only for that cancer's specific assessment
- Optionally also assigned to generic assessment with same `targetCancerType`

**Generic-only screening questions:**
- Bank entries with assignments only for `assessmentId = 'generic'`
- Used for triage prompts too broad for individual cancer assessments

**Age-based logic (no duplicate questions):**
- Age collected on onboarding screen
- Configured via `ageRiskThreshold` and `ageRiskWeight` on assessment
- No separate "Are you over 50?" question needed
- Backend automatically applies age-based risk from `userData.age`

---

## 3. Risk Scoring Algorithm

### 3.1 Question Contribution Formula

For each question:

```javascript
contribution = weight × (answerValue / 100)
```

Where:
- `weight` — Percentage contribution of question to total risk (e.g., 10 = 10%)
- `answerValue` — `yesValue` (default 100) if answered "Yes", `noValue` (default 0) if "No"

### 3.2 Demographic Factors

**Family History:**
```javascript
if (userData.familyHistory === 'Yes') {
    totalScore += assessmentConfig.familyWeight;  // default: 10
    categoryRisks['Family & Genetics'] += assessmentConfig.familyWeight;
}
```

**Age:**
```javascript
if (userData.age >= assessmentConfig.ageRiskThreshold && assessmentConfig.ageRiskWeight > 0) {
    totalScore += assessmentConfig.ageRiskWeight;
    categoryRisks['Medical History'] += assessmentConfig.ageRiskWeight;
}
```

**Ethnicity:**
```javascript
const ethnicity = userData.ethnicity.toLowerCase();
const ethnicityWeight = parseFloat(assessmentConfig.ethnicityRisk[ethnicity]) || 0;
if (ethnicityWeight > 0) {
    totalScore += ethnicityWeight;
    categoryRisks['Medical History'] += ethnicityWeight;
}
```

### 3.3 Score Clamping and Risk Level

```javascript
// Clamp to 0-100
totalScore = Math.max(0, Math.min(100, totalScore));

// Determine risk level (Specific Assessments)
let riskLevel = 'LOW';
if (totalScore >= 66) riskLevel = 'HIGH';
else if (totalScore >= 33) riskLevel = 'MEDIUM';
```

### 3.4 Generic Assessment (Multiple Cancer Types)

When `assessmentType === 'generic'`:

```javascript
// Track scores by cancer type
const cancerTypeScores = {};

// Each question contribution added to its targetCancerType
if (assessmentType === 'generic' && answer.cancerType) {
    const cancerType = answer.cancerType.toLowerCase();
    cancerTypeScores[cancerType].score += contribution;
    cancerTypeScores[cancerType].categories[category] += contribution;
}

// Per-cancer risk levels (lower thresholds than specific assessments)
if (score >= 70) cancerRiskLevel = 'HIGH';
else if (score >= 40) cancerRiskLevel = 'MEDIUM';
else cancerRiskLevel = 'LOW';
```

### 3.5 Output Structure

```javascript
{
    totalScore: 72,                    // 0-100, rounded
    riskLevel: 'HIGH',                 // 'LOW' | 'MEDIUM' | 'HIGH'
    categoryRisks: {
        'Diet & Nutrition': 15,
        'Lifestyle': 25,
        'Medical History': 22,
        'Family & Genetics': 10
    },
    demographicContributions: {
        familyHistory: 10,
        age: 5,
        ethnicity: 2
    },
    recommendations: [                 // Generated from category risks
        { title: 'Improve Your Diet', actions: [...] },
        { title: 'Get Active & Healthy', actions: [...] }
    ],
    cancerTypeScores: {                // Generic assessment only
        lung: { score: 65, riskLevel: 'MEDIUM', categories: {...} },
        breast: { score: 30, riskLevel: 'LOW', categories: {...} }
    }
}
```

**Implementation:** `controllers/riskCalculator.js`

---

## 4. API Endpoints

### 4.1 Public Endpoints (No Authentication)

| Method | Path | Description | Query Params |
|--------|------|-------------|--------------|
| GET | `/api/questions/cancer-types` | List all cancer types | `lang` (en/zh/ms/ta) |
| GET | `/api/questions/cancer-types/:id` | Get specific cancer type | `lang` |
| GET | `/api/questions/by-assessment` | Get questions for assessment | `assessmentId`, `age`, `lang` |
| POST | `/api/assessments` | Submit assessment | Body: `userData`, `answers` |
| POST | `/api/assessments/send-results` | Email results to user | Body: `contact`, `riskScore`, etc. |
| GET | `/api/assessments/stats` | Get aggregate statistics | `startDate`, `endDate` |
| GET | `/api/theme` | Get theme configuration | — |
| GET | `/api/pdpa` | Get PDPA consent config | — |
| GET | `/api/translations` | Get UI translations | — |
| GET | `/api/recommendations` | Get recommendations data | — |

### 4.2 Admin Endpoints (JWT Authentication Required)

**Authentication:**
| Method | Path | Description | Body |
|--------|------|-------------|------|
| POST | `/api/admin/login` | Admin login | `{ email, password }` |
| POST | `/api/admin/forgot-password` | Request password reset | `{ email }` |
| POST | `/api/admin/reset-password` | Reset password with token | `{ token, newPassword }` |
| GET | `/api/admin/me` | Get current admin user | — |
| POST | `/api/admin/change-password` | Change password (logged in) | `{ currentPassword, newPassword }` |

**Cancer Types:**
| Method | Path | Description | Body |
|--------|------|-------------|------|
| GET | `/api/admin/cancer-types` | Get all cancer types | — |
| GET | `/api/admin/cancer-types/:id` | Get specific cancer type | — |
| PUT | `/api/admin/cancer-types/:id` | Update cancer type | Cancer type fields |
| POST | `/api/admin/cancer-types` | Create cancer type | Cancer type fields |
| DELETE | `/api/admin/cancer-types/:id` | Delete cancer type | — |

**Question Bank:**
| Method | Path | Description | Body |
|--------|------|-------------|------|
| GET | `/api/admin/question-bank` | Get all bank entries | — |
| POST | `/api/admin/question-bank` | Create bank entry | `{ id, prompt_*, explanation*_*, sources }` |
| PUT | `/api/admin/question-bank/:id` | Update bank entry | `{ prompt_*, explanation*_* }` |
| DELETE | `/api/admin/question-bank/:id` | Delete bank entry | — |

**Assignments:**
| Method | Path | Description | Body |
|--------|------|-------------|------|
| GET | `/api/admin/assessments/:id/assignments` | Get assignments | — |
| PUT | `/api/admin/assessments/:id/assignments` | Update assignments | Array of assignments |

**Admin Users (Super Admin Only):**
| Method | Path | Description | Body |
|--------|------|-------------|------|
| GET | `/api/admin/users` | Get all admins | — |
| POST | `/api/admin/users` | Create admin | `{ email, name, role, requirePasswordReset }` |
| PUT | `/api/admin/users/:id` | Update admin | `{ email, name, role }` |
| DELETE | `/api/admin/users/:id` | Delete admin | — |

**Settings:**
| Method | Path | Description | Body |
|--------|------|-------------|------|
| GET | `/api/admin/appearance` | Get theme | — |
| PUT | `/api/admin/appearance` | Update theme | Theme object |
| GET | `/api/admin/pdpa` | Get PDPA config | — |
| PUT | `/api/admin/pdpa` | Update PDPA | `{ enabled, content_* }` |
| GET | `/api/admin/translations` | Get translations | — |
| PUT | `/api/admin/translations` | Update translations | Translation object |

**Implementation:** `routes/admin/index.js` (main router), `routes/admin/*.js` (sub-routers)

---

## 5. Database Schema

### 5.1 Tables

**`admins`** — Admin user accounts
```sql
id              UUID PRIMARY KEY
email           TEXT UNIQUE NOT NULL
password        TEXT NOT NULL (bcrypt hashed)
role            TEXT NOT NULL ('admin' | 'super_admin')
name            TEXT
require_password_reset  BOOLEAN DEFAULT false
created_at      TIMESTAMPTZ DEFAULT NOW()
updated_at      TIMESTAMPTZ DEFAULT NOW()
```

**`cancer_types`** — Assessment configurations
```sql
id                  TEXT PRIMARY KEY
name_en             TEXT
name_zh             TEXT
name_ms             TEXT
name_ta             TEXT
description_en      TEXT
description_zh      TEXT
description_ms      TEXT
description_ta      TEXT
family_label_en     TEXT
family_label_zh     TEXT
family_label_ms     TEXT
family_label_ta     TEXT
icon                TEXT
family_weight       NUMERIC DEFAULT 10
gender_filter       TEXT DEFAULT 'all'
age_risk_threshold  INTEGER DEFAULT 50
age_risk_weight     NUMERIC DEFAULT 0
ethnicity_risk_chinese    NUMERIC DEFAULT 0
ethnicity_risk_malay      NUMERIC DEFAULT 0
ethnicity_risk_indian     NUMERIC DEFAULT 0
ethnicity_risk_caucasian  NUMERIC DEFAULT 0
ethnicity_risk_others     NUMERIC DEFAULT 0
visible             BOOLEAN DEFAULT true
created_at          TIMESTAMPTZ DEFAULT NOW()
updated_at          TIMESTAMPTZ DEFAULT NOW()
```

**`questions`** — Question Bank entries
```sql
id                  TEXT PRIMARY KEY
prompt_en           TEXT
prompt_zh           TEXT
prompt_ms           TEXT
prompt_ta           TEXT
explanationyes_en   TEXT
explanationyes_zh   TEXT
explanationyes_ms   TEXT
explanationyes_ta   TEXT
explanationno_en    TEXT
explanationno_zh    TEXT
explanationno_ms    TEXT
explanationno_ta    TEXT
created_at          TIMESTAMPTZ DEFAULT NOW()
updated_at          TIMESTAMPTZ DEFAULT NOW()
```

**`question_assignments`** — Question-to-assessment mappings
```sql
id                  SERIAL PRIMARY KEY
questionid          TEXT REFERENCES questions(id)
assessmentid        TEXT NOT NULL
targetcancertype    TEXT NOT NULL
weight              NUMERIC NOT NULL
yesvalue            NUMERIC DEFAULT 100
novalue             NUMERIC DEFAULT 0
category            TEXT
minage              INTEGER
created_at          TIMESTAMPTZ DEFAULT NOW()
updated_at          TIMESTAMPTZ DEFAULT NOW()
```

**`settings`** — App settings (theme, PDPA, translations, recommendations)
```sql
key         TEXT PRIMARY KEY
value       JSONB NOT NULL
updated_at  TIMESTAMPTZ DEFAULT NOW()
```

**`assessments`** — Assessment results (anonymous)
```sql
id                  UUID PRIMARY KEY
age                 INTEGER
gender              TEXT
family_history      BOOLEAN
assessment_type     TEXT NOT NULL
risk_score          NUMERIC NOT NULL
risk_level          TEXT NOT NULL
category_risks      JSONB NOT NULL
questions_answers   JSONB NOT NULL
created_at          TIMESTAMPTZ DEFAULT NOW()
```

**`password_reset_tokens`** — Password reset tokens
```sql
id          SERIAL PRIMARY KEY
email       TEXT NOT NULL
token       TEXT UNIQUE NOT NULL
expires_at  TIMESTAMPTZ NOT NULL
created_at  TIMESTAMPTZ DEFAULT NOW()
```

### 5.2 Indexes

```sql
CREATE INDEX idx_question_assignments_assessment ON question_assignments(assessmentid);
CREATE INDEX idx_question_assignments_question ON question_assignments(questionid);
CREATE INDEX idx_assessments_type ON assessments(assessment_type);
CREATE INDEX idx_assessments_created ON assessments(created_at DESC);
CREATE INDEX idx_reset_tokens_token ON password_reset_tokens(token);
```

---

## 6. Frontend Structure

### 6.1 Participant App

**Entry Point:** `public/index.html`

**Core JavaScript Modules:**
| File | Responsibility |
|------|----------------|
| `js/main.js` | Main application class, screen management, event listeners |
| `js/gameState.js` | Session state (answers, current question, consent status) |
| `js/assessmentConfig.js` | Assessment loading, caching, language management |
| `js/questionLoader.js` | Fetch questions from API |
| `js/uiController.js` | UI updates (screens, mascot, results rendering) |
| `js/mascotController.js` | Mascot state and animations |
| `js/themeLoader.js` | Load and apply theme configuration |
| `js/translationService.js` | Translation lookup and application |
| `js/constants.js` | Risk thresholds, category constants |
| `js/apiService.js` | API client utilities |
| `js/utils/escapeHtml.js` | XSS prevention helper |

**CSS Files:**
| File | Responsibility |
|------|----------------|
| `css/variables.css` | CSS custom properties (colors, spacing) |
| `css/base.css` | Base styles, resets |
| `css/utilities.css` | Utility classes |
| `css/layout.css` | Layout components |
| `css/landing.css` | Landing screen styles |
| `css/onboarding.css` | Onboarding form styles |
| `css/game.css` | Quiz game screen styles |
| `css/results.css` | Results screen styles |
| `css/mascot.css` | Mascot styles |

### 6.2 Admin App

**Entry Point:** `public/admin.html`

**Core JavaScript Modules:**
| File | Responsibility |
|------|----------------|
| `js/admin/app.js` | Admin app initialization, current user loading |
| `js/admin/router.js` | Tab routing and view switching |
| `js/admin/api.js` | API client with JWT auth |
| `js/admin/state.js` | Admin state (current user, caches) |
| `js/admin/notifications.js` | Success/error toast notifications |
| `js/admin/langTabs.js` | Multi-language tab switching |
| `js/admin/assetPickerUtils.js` | Asset picker modal utilities |
| `js/admin/assetStaging.js` | Asset upload staging |

**View Controllers:**
| File | Responsibility |
|------|----------------|
| `js/admin/views/contentView.js` | Content Management tab (cancer types) |
| `js/admin/views/questionBankView.js` | Question Bank tab |
| `js/admin/views/assessmentsView.js` | Assessments tab (statistics table) |
| `js/admin/views/statisticsView.js` | Statistics tab (analytics dashboard) |
| `js/admin/views/appearanceView.js` | Appearance tab (theme config) |
| `js/admin/views/pdpaView.js` | PDPA tab |
| `js/admin/views/translationsView.js` | Translations tab |
| `js/admin/views/adminUsersView.js` | Admin Management tab (super admin only) |

---

## 7. Integration Checklists

### 7.1 Participant Flow (Happy Path)

**Test Case:** Complete assessment from start to finish

1. **Landing:**
   - Navigate to `http://localhost:3000`
   - Wait for mascot and gender buttons to appear
   - Select language (EN/中文/BM/தமிழ்) — text updates

2. **Gender Selection:**
   - Click "Male" or "Female"
   - Screen transitions to cancer selection
   - Cards filtered by gender

3. **Cancer Selection:**
   - Click cancer type card or "Start Assessment" button
   - Screen transitions to onboarding

4. **Onboarding:**
   - Enter age (e.g., 35)
   - Select ethnicity (e.g., Chinese)
   - Toggle family history (e.g., No)
   - Click "Start Assessment"
   - Screen transitions to quiz

5. **Quiz:**
   - Answer each question (Yes/No)
   - Wait for explanation panel (~3 seconds)
   - Progress bar updates
   - After final question, results load

6. **Results:**
   - Risk score and level displayed
   - Category breakdown shown
   - Recommendations expandable
   - "Book screening" button visible

**Expected:** No errors, smooth transitions, correct risk calculation

### 7.2 Admin Login Flow

**Test Case:** Admin login and password change

1. Navigate to `http://localhost:3000/admin`
2. Redirect to `/login.html`
3. Enter email (`admin@scs.com`)
4. Enter password
5. Click "Sign In"
6. Redirect to `/admin.html`
7. Verify profile email and role displayed in header

**Expected:** Successful login, token stored in localStorage

### 7.3 Content Management Flow

**Test Case:** Edit cancer type configuration

1. Login to admin panel
2. Content Management tab active by default
3. Click "Edit" on Colorectal Cancer card
4. Modal opens with configuration fields
5. Change family weight (e.g., 10 → 12)
6. Change age risk threshold (e.g., 50 → 45)
7. Click "Save Changes"
8. Green success notification appears
9. Modal closes
10. Card updates with new values

**Expected:** Changes saved to database, visible to participants immediately

### 7.4 Question Bank Flow

**Test Case:** Edit question text

1. Click "Question Bank" in sidebar
2. Table loads with all questions
3. Click "Edit" on a question
4. Modal opens with multi-language fields
5. Switch to Chinese tab (中文)
6. Edit Chinese prompt text
7. Click "Save Changes"
8. Green success notification appears
9. Table row updates

**Expected:** Question text updated, translations preserved

### 7.5 Statistics Flow

**Test Case:** Filter statistics by date range

1. Click "Statistics" in sidebar
2. Dashboard loads with 7 sections
3. Click "Last 7 days" preset button
4. All sections re-render with filtered data
5. Select custom range: From `2026-03-01` To `2026-03-10`
6. Click "Apply"
7. Data re-fetches with date filter
8. Click "Refresh" to reload

**Expected:** Date filter applies to all sections, data updates correctly

### 7.6 Language Switching (Mid-Flow)

**Test Case:** Change language during quiz

1. Start assessment in English
2. Complete onboarding
3. During quiz, click language selector
4. Switch to Chinese (中文)
5. Question prompt updates to Chinese
6. Explanation panel shows Chinese text
7. Complete quiz
8. Results page in Chinese

**Expected:** Language persists through flow, all text updates correctly

### 7.7 Play Again (Next Participant)

**Test Case:** Reset for next participant

1. Complete assessment, view results
2. Click "Play Again" or "Start Over"
3. Screen returns to landing
4. Select different gender
5. Complete new assessment
6. Verify previous participant's data cleared

**Expected:** Session cleared, PDPA consent reset, new participant starts fresh

### 7.8 API Failure Handling

**Test Case:** Backend unavailable

1. Stop backend server
2. Refresh participant page
3. Verify fallback assessments load
4. Error message displayed
5. Admin panel shows connection error

**Expected:** Graceful degradation, user-friendly error messages

---

## Appendix: File References

| Component | Primary File | Supporting Files |
|-----------|--------------|------------------|
| Risk Calculator | `controllers/riskCalculator.js` | — |
| Question Model | `models/questionModel.js` | — |
| Assessment Model | `models/assessmentModel.js` | — |
| Cancer Type Model | `models/cancerTypeModel.js` | — |
| Admin Model | `models/adminModel.js` | — |
| Settings Model | `models/settingsModel.js` | — |
| Questions Routes | `routes/questions.js` | — |
| Assessments Routes | `routes/assessments.js` | — |
| Admin Routes | `routes/admin/index.js` | `routes/admin/*.js` |
| Participant App | `public/index.html` | `public/js/*.js` |
| Admin App | `public/admin.html` | `public/js/admin/*.js` |
| Database Config | `config/db.js` | — |
| Server Entry | `server.js` | — |

---

## Appendix: Risk Threshold Constants

**Specific Assessments:**
```javascript
// public/js/constants.js
LOW: { threshold: 0, max: 33 }      // 0-32.9%
MEDIUM: { threshold: 33, max: 66 }  // 33-65.9%
HIGH: { threshold: 66, max: 100 }   // 66-100%
```

**Generic Assessment (per cancer type):**
```javascript
// controllers/riskCalculator.js lines 165-166
if (score >= 70) cancerRiskLevel = 'HIGH';
else if (score >= 40) cancerRiskLevel = 'MEDIUM';
// else LOW
```

---

## Appendix: Weight Validation

**Quiz Weight Target Calculation:**
```javascript
// controllers/riskCalculator.js
function getQuizWeightTarget(cancerType) {
    const familyWeight = parseFloat(cancerType.familyWeight) || 0;
    const ageWeight = parseFloat(cancerType.ageRiskWeight) || 0;
    const maxEthWeight = Math.max(
        parseFloat(cancerType.ethnicityRisk_chinese) || 0,
        parseFloat(cancerType.ethnicityRisk_malay) || 0,
        // ... etc
    );
    return 100 - familyWeight - ageWeight - maxEthWeight;
}
```

**Generic Assessment Validity:**
```javascript
function computeGenericWeightValidity(assignments, cancerType) {
    const quizTarget = getQuizWeightTarget(cancerType);
    const weightByTarget = {};
    
    for (const a of assignments) {
        const target = (a.targetCancerType || '').toLowerCase().trim();
        if (!target) continue;
        if (!weightByTarget[target]) weightByTarget[target] = { totalWeight: 0 };
        weightByTarget[target].totalWeight += parseFloat(a.weight) || 0;
    }
    
    // Check each target cancer type sums to quiz target
    for (const target of Object.keys(weightByTarget)) {
        const sum = weightByTarget[target].totalWeight;
        weightByTarget[target].isValid = Math.round(sum * 100) === Math.round(quizTarget * 100);
    }
    
    return { weightByTarget, isValid, quizTarget };
}
```
