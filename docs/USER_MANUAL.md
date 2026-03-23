# SCS Risk Assessment Tool — User Instruction Manual

## Table of Contents

- **Part A: Participant (Public User) Flow**
  - A1. Starting the Assessment
  - A2. Language Selection
  - A3. Gender Selection
  - A4. Cancer Type Selection
  - A5. Onboarding (Personal Details)
  - A6. Answering Questions
  - A7. Viewing Results
  - A8. Results Actions for Shared Devices

- **Part B: Admin User Flow**
  - B1. Admin Login
  - B2. Forgot Password
  - B3. Content Management Tab
  - B4. Question Bank Tab
  - B5. Assessments Tab
  - B6. Statistics Tab
  - B7. Appearance Tab
  - B8. PDPA Tab
  - B9. Translations Tab
  - B10. Admin Management Tab (Super Admin Only)
  - B11. Change Password
  - B12. Logout

---

# Part A: Participant (Public User) Flow

## A1. Starting the Assessment

**Step 1:** Open your web browser (Chrome, Firefox, Safari, Edge)

**Step 2:** Navigate to the assessment URL:
- Development: `http://localhost:3000`
- Production: (deployed URL provided by event staff)

**Step 3:** Wait for the landing page to load completely (~2-3 seconds)
- You will see a logo at the top with a pulsing animation
- A mascot character appears in the center
- Two large buttons appear: "Male" and "Female"
- If PDPA is enabled by admin settings, a consent modal appears before participants can proceed

**Expected State:**
- Top-right corner shows language selector pill (EN | 中文 | BM | தமிழ்)
- Top-right corner shows sound toggle button (speaker icon)
- Center of screen displays mascot and gender selection buttons
- On smaller screens, use the ☰ menu to access language and sound controls

---

## A2. Language Selection

**Step 1:** Locate the language selector pill in the top-right corner of the screen
- On smaller screens, open the ☰ menu first

**Step 2:** Click one of the four language options:
- **EN** — English
- **中文** — Chinese (简体中文)
- **BM** — Bahasa Melayu
- **தமிழ்** — Tamil

**Step 3:** Wait ~200ms for all text to update

**Expected Behavior:**
- Selected language button becomes highlighted (darker background)
- All visible text updates to the selected language
- Language preference is saved for the current session
- If you reload the page, your selected language is restored

---

## A3. Gender Selection

**Step 1:** Review the two gender options on the landing screen:
- **Male** button (left side)
- **Female** button (right side)

**Step 2:** Click the button that matches your gender

**Step 3:** Wait for screen transition (~300ms)

**Expected Behavior:**
- Screen transitions to "Choose Your Assessment" page
- Your gender selection is stored in session storage
- Cancer type cards are filtered based on each cancer type's configured **Gender Filter** and visibility settings in Admin
- The exact list shown may differ by deployment and admin configuration

---

## A4. Cancer Type Selection

**Step 1:** Review the available cancer type cards displayed in a grid

**Step 2:** Each card shows:
- Cancer type icon (illustration)
- Cancer type name (e.g., "Colorectal Cancer")
- Brief description (1-2 sentences)
- "Start Assessment" button at the bottom of each card

**Step 3:** Select your assessment using one of these methods:
- **Method A:** Click directly on any cancer type card
- **Method B:** Click the "Start Assessment" button on a specific card

**Step 4:** Wait for screen transition (~300ms)

**Expected Behavior:**
- Screen transitions to "Personal Details" (onboarding) page
- Selected cancer type is stored in application state
- Back button (←) appears at top-left to return to cancer selection

---

## A5. Onboarding (Personal Details)

**Step 1:** You will see a form with three fields:

**Field 1: Age**
- Click the "Age" input field
- Type your age as a number (e.g., "35")
- Valid range in current UI: 18-100

**Field 2: Ethnicity**
- Select one ethnicity option from the radio button group
- Select one option from the list:
  - Chinese
  - Malay
  - Indian
  - Caucasian
  - Others
- If you select **Others**, an input field appears for free-text specification

**Field 3: Family History**
- Select one option in the "Family History of Cancer" radio button group
- Select either:
  - **Yes** — if your parent, sibling, or child has had cancer
  - **No** — if no immediate family member has had cancer

**Step 2:** Review your entries for accuracy

**Step 3:** Click the "Start Assessment" button at the bottom of the form

**Step 4:** Wait for screen transition (~500ms)

**Expected Behavior:**
- If age is below minimum for selected cancer type, a warning may appear
- Screen transitions to first question of the quiz
- Your answers are stored in application state

---

## A6. Answering Questions

**Step 1:** A question card appears with:
- Question text (statement format, e.g., "I eat red meat more than 3 times per week")
- Swipe directions: **left = No** and **right = Yes** (drag on desktop or swipe on touch devices)

**Step 2:** Read the question carefully

**Step 3:** Select your answer:
- Swipe/drag the card **right** if the statement applies to you (**Yes**)
- Swipe/drag the card **left** if the statement does not apply to you (**No**)

**Step 4:** Wait for the explanation panel to appear (~300ms)

**Step 5:** Review the explanation panel which shows:
- Question importance badge (Low / Medium / High Importance; text may vary by translations)
- Explanation text explaining why this factor affects cancer risk
- Action buttons: **Undo** and **Continue**

**Step 6:** Click **Continue** to load the next question (or **Undo** to return to the previous question)

**Step 7:** Repeat Steps 1-6 for each question

**Expected Behavior:**
- Progress bar at top shows completion percentage
- Typical quiz length: 8-15 questions depending on cancer type
- After the final question, results screen loads automatically

---

## A7. Viewing Results

**Step 1:** After completing all questions, the results screen loads automatically

**Step 2:** Review your results:

**Section 1: Risk Score (Single-Cancer Assessments)**
- Large circular progress indicator showing your risk score (0-100%)
- Risk level badge below the score:
  - **LOW RISK** (yellow) — Score 0-32%
  - **MEDIUM RISK** (orange) — Score 33-65%
  - **HIGH RISK** (red) — Score 66%+

**Section 1A: Generic Assessment Display (when Generic is selected)**
- Main circular score and category breakdown may be replaced by a **per-cancer breakdown** list
- Each cancer row shows its own score and risk badge
- Per-cancer thresholds in current implementation:
  - **LOW RISK** — Score 0-39%
  - **MEDIUM RISK** — Score 40-69%
  - **HIGH RISK** — Score 70%+

**Section 2: Summary Statement**
- One sentence summarizing your risk level
- Examples:
  - LOW: "Your risk level is low. Keep up the healthy habits!"
  - MEDIUM: "Your risk level is moderate. There's room for improvement."
  - HIGH: "Your risk level is high. Consider speaking to a doctor."

**Section 3: Category Breakdown**
- Four risk categories displayed with badges:
  - Diet & Nutrition
  - Lifestyle
  - Medical History
  - Family & Genetics
- Each category shows: No Issues / Low / Some / High risk

**Section 4: What You Can Do (Recommendations)**
- Expandable sections with actionable recommendations
- Click each section to expand and view details
- Categories may include:
  - Improve Your Diet
  - Get Active & Healthy
  - Schedule Screening
  - Reduce Risk Behaviors

**Section 5: Book Your Cancer Screening**
- "Book Your Cancer Screening Appointment" button at the bottom
- For HIGH risk users, this button is visually emphasized
- A call-to-action message appears above the button for HIGH risk users

**Step 3:** (Optional) Click "Book Your Cancer Screening Appointment" to view next steps

**Step 4:** (Optional) Enter your email to receive results via email
- Click "Email me these results"
- Enter your email address
- Click "Send"
- For Generic assessments, the email summary may present an overall risk summary that differs from the highest per-cancer badge shown on screen

---

## A8. Results Actions for Shared Devices

**For Staff:** When the next participant needs to use the same device:

**Step 1:** Locate the two results actions:
- **Play Again?**
- **Return to Home Screen**

**Step 2:** Choose the correct action:
- Use **Return to Home Screen** for a new participant on the same device
- Use **Play Again?** only when keeping the current participant context is intended

**Expected Behavior (Return to Home Screen):**
- Screen returns to the landing page
- Gender selection is cleared (next participant must choose gender again)
- PDPA consent is reset (next participant must accept again, when PDPA is enabled)
- Language selection is preserved

**Expected Behavior (Play Again?):**
- Screen returns to cancer type selection (not landing page)
- Gender selection is preserved
- PDPA consent is preserved
- Onboarding form and quiz answers are reset for a new run

---

# Part B: Admin User Flow

## B1. Admin Login

**Step 1:** Open your web browser

**Step 2:** Navigate to the admin URL:
- Development: `http://localhost:3000/admin`
- Production: (deployed admin URL)

**Step 3:** If not logged in, you will be redirected to the login page (`/login.html`)

**Step 4:** Locate the login form with the following fields:

**Field 1: Email Address**
- Click the "Email Address" input field
- Type your admin email (e.g., `admin@scs.com`)

**Field 2: Password**
- Click the "Password" input field
- Type your password
- Password is hidden (shown as dots)

**Step 5:** Click the "Sign In" button

**Step 6:** Wait for authentication (~1-2 seconds)

**Expected Behavior:**
- If credentials are valid: Redirect to `/admin.html`
- If credentials are invalid: Error message appears ("Invalid credentials")
- If account requires password reset: Password change modal appears automatically
- If a valid admin session already exists, opening `/admin` may take you directly to the admin panel

**Troubleshooting:**
- "Forgot your password?" link below the login form
- Click to go to password reset page (see B2)

---

## B2. Forgot Password

**Step 1:** From the login page, click "Forgot your password?" link

**Step 2:** You will be redirected to `/forgotPassword.html`

**Step 3:** Enter your admin email address:
- Click the "Email Address" field
- Type the email associated with your admin account

**Step 4:** Click the "Send Reset Link" button

**Step 5:** Wait for response (~2-5 seconds)

**Expected Behavior:**
- **Success:** A success message is shown for privacy (wording may indicate "If an account exists...")
- **Development Mode:** Reset URL may be shown in server logs depending on configuration
- **Production:** Reset link is sent to the email inbox for that account (if it exists)

**Step 6:** Open the reset link from your email (or development output)

**Step 7:** Enter your new password twice:
- New Password field
- Confirm Password field

**Step 8:** Click "Reset Password"

**Expected Behavior:**
- Password is updated
- Redirect to login page
- Login with new password

---

## B3. Content Management Tab

**Access:** This tab is active by default after login

**Step 1:** After login, you land on the Content Management tab

**Step 2:** View the cancer type cards grid:
- Each card represents a cancer type (Colorectal, Breast, Lung, Liver, Cervical, Prostate)
- Cards show:
  - Cancer type icon
  - Cancer type name
  - Description
  - Configuration status indicators

**Step 3:** To edit a cancer type:
- Click the "Edit" button (pencil icon) on the desired cancer card
- A modal window opens with configuration fields

**Step 4:** Edit cancer type configuration:
- **Name fields:** Enter name in each language (EN, 中文, BM, தமிழ்)
- **Description fields:** Enter description in each language
- **Icon:** Select or upload cancer card icon
- **Family History Label:** Enter label text for family history question
- **Family Weight:** Enter percentage (0-100) for family history risk contribution
- **Gender Filter:** Select "All", "Male", or "Female"
- **Age Risk Threshold:** Enter age threshold (e.g., 50)
- **Age Risk Weight:** Enter percentage for age-based risk
- **Ethnicity Risk:** Enter risk percentage for each ethnicity:
  - Chinese
  - Malay
  - Indian
  - Caucasian
  - Others

**Step 5:** Review changes for accuracy

**Step 6:** Click "Save Changes" button

**Expected Behavior:**
- Green success notification appears at top
- Modal closes
- Cancer card updates with new configuration
- Changes are immediately visible to participants

---

## B4. Question Bank Tab

**Access:** Click "Question Bank" in the left sidebar (Content group)

**Step 1:** View the Question Bank table with columns:
- **Prompt (EN):** Question text in English
- **Category:** Risk category (Diet & Nutrition, Lifestyle, Medical History, Family & Genetics)
- **Used In:** Number of assessments using this question
- **Actions:** Edit and Delete buttons

**Step 2:** To edit a question:
- Click the "Edit" button (pencil icon) in the Actions column
- A modal window opens

**Step 3:** Edit question content:
- **Question Prompt fields:** Enter question text in each language tab:
  - Click language tab (EN | 中文 | BM | தமிழ்)
  - Type question text in the textarea
- **Explanation (Yes Answer):** Enter explanation shown when user answers "Yes"
  - Use language tabs to enter translations
- **Explanation (No Answer):** Enter explanation shown when user answers "No"
  - Use language tabs to enter translations

**Step 4:** Click "Save Changes" button

**Expected Behavior:**
- Green success notification appears
- Modal closes
- Table row updates with new content

**Step 5:** (Optional) Download backup:
- Click "Download Backup" button at top of page
- CSV file downloads with all question bank data

---

## B5. Assessments Tab

**Access:** Click "Assessments" in the left sidebar (Analytics group)

**Step 1:** View the assessments records table:
- **Age**
- **Gender**
- **Assessment Type**
- **Family History**
- **Risk Score**
- **Risk Level**
- **Questions** (count answered)
- **Date**

**Step 2:** (Optional) Filter records using the filter bar:
- Gender
- Age min/max
- Risk level
- Date from/to
- Use "Clear Filters" to reset filters

**Step 3:** Sort by clicking a table header (e.g., Risk Score, Date)

**Step 4:** (Optional) Click "Export CSV" to download assessments data

**Expected Behavior:**
- Data loads from database on tab open
- Click "Refresh" button to reload latest data
- Filters and sorting update visible rows in the table
- For aggregated trends by assessment type and advanced analytics, use the **Statistics** tab

---

## B6. Statistics Tab

**Access:** Click "Statistics" in the left sidebar (Analytics group)

**Step 1:** View the analytics dashboard with 9 sections:

**Section 1: KPI Summary Cards (4 cards in a row)**
- **Total Assessments:** Count of assessments in selected date range
- **Risk Distribution:** Three mini-stat blocks showing:
  - LOW count and percentage (green)
  - MED count and percentage (amber)
  - HIGH count and percentage (red)
- **Avg Risk Score:** Mean risk score across all assessments (shown as percentage)
- **Top Assessment:** Most frequently completed cancer type with count

**Section 2: Risk Level Distribution (3 horizontal bars)**
- Three horizontal progress bars (LOW, MEDIUM, HIGH)
- Each bar shows: label | filled bar | count (percentage)
- Colors: green (LOW), amber (MEDIUM), red (HIGH)

**Section 3: By Assessment Type Table**
- Columns: Type | Count | Avg Risk | LOW | MEDIUM | HIGH | Distribution
- Distribution column shows segmented bar (green/amber/red)
- Sorted by Count (descending)

**Section 4: Age Analysis**
- Summary table with age brackets:
  - Under 20
  - 20–29
  - 30–39
  - 40–49
  - 50–59
  - 60+
- Columns: Age Group | Count | Avg Risk | LOW | MEDIUM | HIGH
- Collapsible detail: Click "Show individual ages" to see per-age breakdown

**Section 5: Demographics (2 tables side-by-side)**
- **Gender table:** Gender | Count | Avg Risk | LOW | MEDIUM | HIGH
- **Family History table:** Family History | Count | Avg Risk | LOW | MEDIUM | HIGH

**Section 6: Risk Category Breakdown**
- Horizontal bars for each category:
  - Diet & Nutrition
  - Lifestyle
  - Medical History
  - Family & Genetics
- Shows average contribution per assessment
- Sorted by average contribution (descending)

**Section 7: Top Risk Questions**
- Table with top 10 questions by "Yes" rate
- Columns: Question | Category | Yes Rate | Avg Contribution
- Long question text is visually clipped with ellipsis in the table for readability

**Section 8: Age × Cancer Type Risk**
- Matrix-style view of average risk by age band and assessment type
- Includes an optional expandable section for individual ages

**Section 9: Cohort Explorer**
- Interactive cohort slicer for custom segment analysis
- Supports combining demographics/risk filters with summary metrics

**Step 2:** To filter by date range:

**Method A: Preset Buttons**
- Click one of the preset buttons above the dashboard:
  - **All time** (default) — No date filter
  - **Today** — Current date only
  - **Last 7 days** — Past 7 days including today
  - **Last 30 days** — Past 30 days including today

**Method B: Custom Date Range**
- Click the "From" date picker
- Select start date from calendar
- Click the "To" date picker
- Select end date from calendar
- Click "Apply" button

**Step 3:** Click "Refresh" button to reload data with current filter

**Expected Behavior:**
- All dashboard sections re-query and re-render with filtered data
- Date filter state is preserved until changed
- Filter applies to all sections uniformly

---

## B7. Appearance Tab

**Access:** Click "Appearance" in the left sidebar (Settings group)

**Step 1:** View the theme configuration panels:

**Panel 1: Screen Backgrounds**
- Dropdown to select screen type:
  - Landing
  - Cancer Selection
  - Onboarding
  - Game (Quiz)
  - Results
- Current background preview
- "Choose Background" button
- Opacity slider (0.0 to 1.0)

**Panel 2: Mascot Images**
- Mascot Male (default state)
- Mascot Female (default state)
- Mascot Male Good (positive result)
- Mascot Female Good (positive result)
- Mascot Male Shocked (negative result)
- Mascot Female Shocked (negative result)

**Panel 3: Background Music**
- Music file selector per screen type
- Volume control

**Step 2:** To change a background:
- Select screen type from dropdown
- Click "Choose Background" button
- Asset picker modal opens
- Select from existing assets OR upload new:
  - Click "Upload" tab
  - Drag and drop image file OR click to browse
  - Accepted formats: JPG, PNG, WebP
  - Max file size: 10MB
- Click on desired asset to select
- Click "Confirm" button

**Step 3:** Adjust opacity (optional):
- Drag the opacity slider left (more transparent) or right (more opaque)
- Preview updates in real-time
- Recommended range: 0.3 to 0.7 for readability

**Step 4:** To change a mascot image:
- Click the mascot slot you want to change
- Asset picker modal opens
- Select or upload image
- Click "Confirm"

**Step 5:** Click "Save Theme" button at bottom of page

**Expected Behavior:**
- Green success notification appears
- Changes are saved to database
- Changes are immediately visible to participants on next page load

---

## B8. PDPA Tab

**Access:** Click "PDPA" in the left sidebar (Settings group)

**Step 1:** View the PDPA consent form configuration:

**Panel 1: PDPA Status**
- Toggle switch: "Enable PDPA Consent"
- When enabled, participants must accept PDPA before starting assessment

**Panel 2: PDPA Content (Multi-language)**
- Language tabs: EN | 中文 | BM | தமிழ்
- Title field: PDPA consent form title
- Purpose field: why the data is collected
- Data Collected field: what data is captured
- Checkbox Label field: consent confirmation text
- Agree Button field: button label shown to participants

**Step 2:** To edit PDPA content:
- Click the language tab you want to edit
- Edit the "Title" field
- Edit the "Purpose" field
- Edit the "Data Collected" field
- Edit the "Checkbox Label" field
- Edit the "Agree Button" field

**Step 3:** To enable/disable PDPA:
- Click the "Enable PDPA Consent" toggle switch
- Green = Enabled (participants must accept)
- Gray = Disabled (participants skip consent)

**Step 4:** Click "Save PDPA Settings" button

**Expected Behavior:**
- Green success notification appears
- Settings are saved to database
- If disabled, participants skip consent screen on next visit
- If enabled, participants must accept before starting

---

## B9. Translations Tab

**Access:** Click "Translations" in the left sidebar (Settings group)

**Step 1:** Click "Refresh" to load the latest translations from server

**Step 2:** Review grouped sections (Landing, Cancer Selection, Onboarding, Game, Results, Common)
- Expand a section to view translation keys and descriptions
- Use language tabs (EN / 中文 / BM / தமிழ்) to switch editing language

**Step 3:** Edit translation values directly in the form
- Each key has language-specific input fields
- Changes are previewed in the live preview panel on the right

**Step 4:** Click "Save Translations"

**Expected Behavior:**
- Green success notification appears
- Updated values are saved to database
- Changes are visible to participants on subsequent page load/refresh

**Important Notes:**
- Current admin UI does **not** provide translation import/export buttons in this tab
- Save operation updates the translation object sent by the admin form; review edits carefully before saving

---

## B10. Admin Management Tab (Super Admin Only)

**Access:** Click "Admin Management" in the left sidebar (Settings group)
**Restriction:** Only visible to users with "Super Admin" role

**Step 1:** View the admin users table:
- **Email:** Admin email address
- **Name:** Admin display name
- **Role:** Admin or Super Admin
- **Created:** Account creation date
- **Actions:** Edit and Delete buttons

**Step 2:** To add a new admin user:
- Click "Add Admin User" button at top-right of table
- A modal window opens

**Step 3:** Fill in the new admin form:
- **Email:** Enter admin email address
- **Name:** Enter admin display name
- **Role:** Select from dropdown:
  - Admin (standard privileges)
  - Super Admin (full privileges including user management)
- **Require Password Reset:** Toggle switch
  - Enabled: User must change password on first login
  - Disabled: User can keep assigned password

**Step 4:** Click "Create Admin" button

**Expected Behavior:**
- Green success notification appears
- Modal closes
- New user appears in table
- If "Require Password Reset" was enabled, temporary password is shown (copy and share securely with new admin)

**Step 5:** To edit an existing admin:
- Click "Edit" button in the user's row
- Modal opens with current values
- Edit fields as needed (email, name, role)
- Click "Save Changes"

**Step 6:** To delete an admin:
- Click "Delete" button (trash icon) in the user's row
- Confirmation dialog appears: "Are you sure you want to delete this admin?"
- Click "Delete" to confirm

**Expected Behavior:**
- Red success notification appears: "Admin user deleted"
- User is removed from table
- Deleted user cannot log in

**Restrictions:**
- Cannot delete the last Super Admin (error appears)
- Cannot demote the last Super Admin (error appears)

---

## B11. Change Password

**Access Method 1:** Click "Change Password" button in top-right header

**Access Method 2:** Automatic prompt on first login (if required by admin)

**Step 1:** A modal window opens with three fields:

**Field 1: Current Password**
- Click the field
- Type your current password

**Field 2: New Password**
- Click the field
- Type your new password
- Requirements:
  - Minimum 8 characters
  - At least one uppercase letter
  - At least one lowercase letter
  - At least one number
  - At least one symbol (e.g., `!@#$%`)

**Field 3: Confirm Password**
- Click the field
- Re-type your new password (must match Field 2)

**Step 2:** Click "Change Password" button

**Expected Behavior:**
- If current password is correct and new passwords match:
  - Green success notification: "Password changed successfully"
  - Modal closes (or remains open if it was a required change)
- If current password is incorrect:
  - Red error notification: "Current password is incorrect"
- If new passwords don't match:
  - Red error notification: "New passwords do not match"
- If new password equals current password:
  - Red error notification: "New password must be different from current password"

**Step 3:** (If required change) Click "X" or "Cancel" to close modal after success

---

## B12. Logout

**Step 1:** Locate the "Logout" button in the top-right header
- Positioned to the right of "Change Password" button
- Red/danger styled button

**Step 2:** Click the "Logout" button

**Expected Behavior:**
- Admin token is cleared from localStorage
- You are redirected to `/login.html`
- You must log in again to access admin panel

**Note:** There is no confirmation dialog — logout is immediate.

---

## Appendix: Keyboard and Input Notes

Current implementation does not provide global participant shortcuts for:
- Sound toggle via `S`
- Language cycle via `L`
- Answer confirmation via `Enter` / `Space`

Use on-screen buttons for all participant interactions.

---

## Appendix: Error Messages and Troubleshooting

| Error Message | Cause | Resolution |
|--------------|-------|------------|
| "Invalid credentials" | Wrong login credentials | Re-enter credentials carefully; check Caps Lock |
| "Admin not found" | Email not in system | Contact super admin to create account |
| "Too many attempts, please try again later" | Rate limit triggered | Wait 15 minutes before trying again |
| "Snapshot not available" | Snapshot file is missing or not readable on server | Check `data/assessments-snapshot.json`, file permissions, and server logs |
| "Network error" | Server unreachable | Check network connection; verify server is running |

---

## Appendix: Support Contact

For technical support or questions about the SCS Risk Assessment Tool:
- Email: (contact provided by event staff)
- Documentation: See `docs/ARCHITECTURE.md` for technical details
