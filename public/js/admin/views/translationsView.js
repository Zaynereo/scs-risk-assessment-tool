import { API_BASE, adminFetch } from '../api.js';
import { showSuccess, showError } from '../notifications.js';
import { initLangTabs, getActiveLang, onLangChange, clearLangChangeListeners, validateEnglishFields } from '../langTabs.js';
import { escapeHtml as esc } from '../../utils/escapeHtml.js';

const SCREEN_GROUPS = {
    landing: 'Landing Screen',
    cancerSelection: 'Cancer Selection Screen',
    onboarding: 'Onboarding Screen',
    game: 'Game Screen',
    results: 'Results Screen',
    common: 'Common / Shared'
};

// Human-readable descriptions for every translation key + where it appears
// on the participant screen. Keep this map aligned with participant usage —
// any key here must be rendered somewhere in public/index.html / public/js/
// (excluding admin-only code).
const KEY_DESCRIPTIONS = {
    landing: {
        landingTitle: { label: 'Main Title', hint: 'Large heading on the landing page (hidden if logo is shown)' },
        landingSubtitle: { label: 'Subtitle', hint: 'Text below the title/logo on the landing page' },
        genderPrompt: { label: 'Gender Prompt', hint: 'Text above the Male/Female buttons' },
        male: { label: '"Male" Button', hint: 'Label on the Male gender button' },
        female: { label: '"Female" Button', hint: 'Label on the Female gender button' },
        partnerCredit: { label: 'Partner Credit Label', hint: 'Text shown above the partner logo strip on the landing page (e.g. "Supported by:"). Hidden when no partner logos are configured.' }
    },
    cancerSelection: {
        cancerSelectionTitle: { label: 'Page Title', hint: 'Heading on the assessment selection screen' },
        cancerSelectionSubtitle: { label: 'Page Subtitle', hint: 'Instruction text below the title' },
        startAssessment: { label: '"Start" Button', hint: 'Button on each assessment card' },
        noAssessmentsForGender: { label: 'No Assessments Message', hint: 'Shown when no assessments match the selected gender' }
    },
    onboarding: {
        ageLabel: { label: 'Age Question', hint: 'Label for the age input field' },
        ethnicityLabel: { label: 'Ethnicity Question', hint: 'Label for the ethnicity selector' },
        chinese: { label: '"Chinese" Option', hint: 'Ethnicity radio button label' },
        malay: { label: '"Malay" Option', hint: 'Ethnicity radio button label' },
        indian: { label: '"Indian" Option', hint: 'Ethnicity radio button label' },
        caucasian: { label: '"Caucasian" Option', hint: 'Ethnicity radio button label' },
        others: { label: '"Others" Option', hint: 'Ethnicity radio button label' },
        ethnicityPlaceholder: { label: '"Others" Placeholder', hint: 'Placeholder text inside the "Others" text input' },
        familyYes: { label: '"Yes" Option', hint: 'Family history Yes radio button' },
        familyNo: { label: '"No" Option', hint: 'Family history No radio button' },
        familyUnknown: { label: '"Don\'t Know" Option', hint: 'Family history Don\'t Know radio button' },
        assessmentSubtitle: { label: 'Assessment Subtitle', hint: 'Instruction text on the onboarding screen' }
    },
    game: {
        swipeNo: { label: '"No" Swipe Label', hint: 'Text shown on the left/no swipe side' },
        swipeYes: { label: '"Yes" Swipe Label', hint: 'Text shown on the right/yes swipe side' },
        binIt: { label: '"Bin It" Label', hint: 'Instruction below the No swipe zone' },
        pinIt: { label: '"Pin It" Label', hint: 'Instruction below the Yes swipe zone' },
        feedbackYes: { label: 'Yes Feedback', hint: 'Reaction text when user swipes Yes (e.g. "Aiyo!")' },
        feedbackNo: { label: 'No Feedback', hint: 'Reaction text when user swipes No (e.g. "Steady!")' },
        undoButton: { label: '"Undo" Button', hint: 'Button on the explanation card after each question swipe' },
        continueButton: { label: '"Continue" Button', hint: 'Button on the explanation card after each question swipe' },
        progressTemplate: { label: 'Progress Counter', hint: 'Progress text above the question card. Use {current} and {total} as placeholders (e.g. "{current} / {total}" or "Question {current} of {total}")' },
        exitButton: { label: '"Exit" Button', hint: 'Exit button on the game screen that opens the confirm-leave modal' },
        exitModalTitle: { label: 'Exit Modal Title', hint: 'Heading inside the "leave assessment" confirmation modal' },
        exitModalMessage: { label: 'Exit Modal Message', hint: 'Warning text inside the exit modal (e.g. "Your progress will not be saved")' },
        exitModalStay: { label: '"Stay" Button', hint: 'Button inside the exit modal that cancels and returns to the quiz' },
        exitModalLeave: { label: '"Leave" Button', hint: 'Button inside the exit modal that confirms exiting the quiz' }
    },
    results: {
        resultsHeading: { label: 'Results Title', hint: 'Main heading on the results screen and at the top of the emailed report' },
        riskFactorsHeading: { label: 'Risk Factors Title', hint: 'Heading above the risk factor list. Shown on the results screen AND in the emailed report.' },
        recommendationsHeading: { label: 'Recommendations Title', hint: 'Heading above the recommendations. Shown on the results screen AND in the emailed report.' },
        riskScore: { label: '"Risk Score" Label', hint: 'Label next to the percentage score (results screen only)' },
        bookScreening: { label: 'Book Screening Button', hint: 'Call-to-action button for booking. Shown on the results screen AND in the emailed report.' },
        bookHealthierSG: { label: 'HealthierSG Booking Button', hint: 'Call-to-action button for HealthierSG screening booking. Shown on the results screen AND in the emailed report.' },
        contactLabel: { label: 'Email Prompt', hint: 'Text describing what the user will receive via email (results screen only)' },
        emailPlaceholder: { label: 'Email Placeholder', hint: 'Placeholder inside the email input (results screen only)' },
        submit: { label: '"Send Results" Button', hint: 'Button to submit email and results (results screen only)' },
        playAgain: { label: '"Start New Quiz" Button', hint: 'Button to reset and start a fresh quiz (e.g. for the next participant) — results screen only' },
        returnHome: { label: '"Return to Home" Button', hint: 'Button on the results screen that returns the participant to the landing screen (results screen only)' },
        disclaimer: { label: 'Disclaimer', hint: 'Legal disclaimer at the bottom (plain text only). Shown on the results screen AND in the emailed report.' },
        factorsIdentified: { label: '"Factors Identified" Label', hint: 'e.g. "3 factor(s) identified" (results screen only)' },
        summaryLow: { label: 'Low Risk Summary', hint: 'Summary text for low-risk result. Use {cancer} as placeholder. Shown on the results screen AND in the emailed report.' },
        summaryMedium: { label: 'Medium Risk Summary', hint: 'Summary text for medium-risk result. Shown on the results screen AND in the emailed report.' },
        summaryHigh: { label: 'High Risk Summary', hint: 'Summary text for high-risk result. Shown on the results screen AND in the emailed report.' },
        highRiskCta: { label: 'High Risk Call-to-Action', hint: 'Prominent message shown for high-risk results (results screen only)' },
        cancerBreakdownHeading: { label: 'Cancer Breakdown Title', hint: 'Heading for the per-cancer risk section. Shown on the results screen AND in the emailed report.' },
        healthyLifestyle: { label: 'Healthy Lifestyle Message', hint: 'Shown in the cancer breakdown when no cancer type crosses the 30% risk threshold in a generic assessment. Shown on the results screen AND in the emailed report.' },
        categoryDiet: { label: '"Diet & Nutrition" Category', hint: 'Risk breakdown category label. Shown on the results screen AND in the emailed report.' },
        categoryLifestyle: { label: '"Lifestyle" Category', hint: 'Risk breakdown category label. Shown on the results screen AND in the emailed report.' },
        categoryMedical: { label: '"Medical History" Category', hint: 'Risk breakdown category label. Shown on the results screen AND in the emailed report.' },
        categoryFamily: { label: '"Family & Genetics" Category', hint: 'Risk breakdown category label. Shown on the results screen AND in the emailed report.' },
        // ── Emailed report only ─────────────────────────────────────────────
        emailSubject: { label: 'Email Subject (specific)', hint: 'Subject line of the emailed report for a specific-cancer quiz. Use {type} as placeholder for the cancer name (e.g. "Your {type} Cancer Risk Assessment Results").' },
        emailSubjectGeneric: { label: 'Email Subject (generic)', hint: 'Subject line of the emailed report for a generic quiz (no {type} placeholder)' },
        yourInformation: { label: 'Email: "Your Information" Heading', hint: 'Heading above the participant info table in the emailed report (shows age, gender, ethnicity, etc.)' },
        assessmentTypeLabel: { label: 'Email: Assessment Type Row Label', hint: 'Row label in the emailed "Your Information" table — the value is the cancer type' },
        ageLabel: { label: 'Email: Age Row Label', hint: 'Row label in the emailed "Your Information" table. Note: distinct from the onboarding screen\'s age question label.' },
        genderLabel: { label: 'Email: Gender Row Label', hint: 'Row label in the emailed "Your Information" table' },
        ethnicityLabel: { label: 'Email: Ethnicity Row Label', hint: 'Row label in the emailed "Your Information" table. Note: distinct from the onboarding screen\'s ethnicity question label.' },
        familyHistoryLabel: { label: 'Email: Family History Row Label', hint: 'Row label in the emailed "Your Information" table' },
        riskFactorFallback: { label: 'Email: Empty Risk Category Fallback', hint: 'Text shown inside a risk category in the emailed report when no specific factors were identified' },
        recommendationsFallback: { label: 'Email: No Recommendations Fallback', hint: 'Text shown in the emailed report\'s recommendations section when no recommendations are available'
        }
    },
    common: {
        loading: { label: 'Loading Text', hint: 'Shown while assessments are loading' },
        loadError: { label: 'Load Error Message', hint: 'Shown when assessments fail to load' },
        reloadPage: { label: '"Reload Page" Button', hint: 'Button to retry loading' },
        validEmailError: { label: 'Email Validation Error', hint: 'Shown when an invalid email is entered' },
        sendingText: { label: '"Sending..." Text', hint: 'Button text while email is being sent' },
        resultsSentSuccess: { label: 'Email Sent Success', hint: 'Toast message after email is sent' },
        login: { label: '"Login" Link', hint: 'Admin login link in the landing-page top banner' },
        switchingLanguage: { label: '"Switching Language…" Overlay', hint: 'Text shown in the loading overlay while the app is switching languages' }
    }
};

// Preview variants — each corresponds to one iframe preview. Most map 1-to-1
// with a form group, but `results` has TWO variants (screen + email) since
// the same keys render on both the participant results screen and the
// emailed report. `dbGroup` tells the preview which group's keys to read.
const PREVIEW_VARIANTS = [
    { id: 'landing',         label: 'Landing',         dbGroup: 'landing' },
    { id: 'cancerSelection', label: 'Cancer Selection',dbGroup: 'cancerSelection' },
    { id: 'onboarding',      label: 'Onboarding',      dbGroup: 'onboarding' },
    { id: 'game',            label: 'Game',            dbGroup: 'game' },
    { id: 'results',         label: 'Results Screen',  dbGroup: 'results' },
    { id: 'emailReport',     label: 'Email Report',    dbGroup: 'results' },
    { id: 'common',          label: 'Common',          dbGroup: 'common' }
];
const VARIANTS_FOR_GROUP = PREVIEW_VARIANTS.reduce((acc, v) => {
    (acc[v.dbGroup] ||= []).push(v);
    return acc;
}, {});

// ════════════════════════════════════════════════════════════════════════
// IFRAME PREVIEW BUILDERS — each builder returns a full HTML document that
// mirrors the real participant screen or email 1-to-1. The sticky-preview
// iframe loads the doc via `srcdoc`, pulling the real participant CSS.
// ════════════════════════════════════════════════════════════════════════

const BASE_CSS_LINKS = `
    <link rel="stylesheet" href="/css/variables.css">
    <link rel="stylesheet" href="/css/base.css">
    <link rel="stylesheet" href="/css/utilities.css">
    <link rel="stylesheet" href="/css/layout.css">
`;

// Inline styles from index.html's <style> block — kept in sync so the
// top banner, gender selector, back pill, etc. render the same in the
// preview iframe as they do on the participant device.
const INLINE_INDEX_STYLES = `
    html, body { width: 100%; min-height: 100vh; margin: 0; padding: 0; overflow-x: hidden; }
    main.screen { width: 100%; min-height: 100vh; padding-bottom: 60px; box-sizing: border-box; }
    .top-banner { position: fixed; top: 0; left: 0; width: 100%; height: 70px; background: #fff; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 8px rgba(0,0,0,0.1); z-index: 10005; }
    .banner-logo { max-height: 45px; width: auto; }
    #screen-landing .landing-logo { margin-top: 100px; }
    .admin-btn { position: absolute; left: 20px; padding: 8px 12px; background: transparent; color: #666; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 0.85rem; }
    .gender-selector-container { margin: 2rem 0; text-align: center; }
    .gender-selector-container p { margin-bottom: 1rem; color: #666; font-size: 1rem; }
    .gender-selector { display: flex; gap: 2rem; justify-content: center; flex-wrap: nowrap; }
    .gender-btn { display: flex; flex-direction: column; align-items: center; padding: 1.25rem 2rem; border: 2px solid #e0e0e0; border-radius: 12px; min-width: 120px; color: #333; }
    .gender-btn[data-gender="Male"] { background: rgba(33, 150, 243, 0.1); border-color: #90CAF9; }
    .gender-btn[data-gender="Female"] { background: rgba(233, 30, 99, 0.1); border-color: #F8BBD0; }
    .gender-btn .gender-mascot-icon { width: 80px; height: 80px; object-fit: contain; margin-bottom: 0.5rem; }
    .gender-btn span:not(.gender-mascot-icon) { font-weight: 600; font-size: 1rem; }
    .cancer-selection-title-row { display: flex; align-items: center; justify-content: space-between; gap: 1rem; margin-bottom: 0.5rem; }
    .cancer-selection-title-row .back-wrap { flex-shrink: 0; width: 2.5rem; }
    .cancer-selection-title-row .title-wrap { flex: 1; min-width: 0; text-align: center; padding: 0 0.5rem; }
    .cancer-selection-title-row .title-wrap h1 { margin: 0; }
    .cancer-selection-title-row .title-spacer { flex-shrink: 0; width: 2.5rem; }
    .back-pill { width: 2.5rem; height: 2.5rem; border-radius: 50%; border: 1px solid var(--color-primary); background: rgba(255,255,255,0.9); color: var(--color-primary); font-size: 1.25rem; display: inline-flex; align-items: center; justify-content: center; }
    /* Preview-only: disable interactions so nothing in the iframe can be
       accidentally clicked or typed into */
    body { pointer-events: none; user-select: none; }
`;

function buildPreviewDoc({ cssLinks = '', extraStyles = '', bodyHtml }) {
    return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<base href="/">
${cssLinks}
<style>${extraStyles}</style>
</head>
<body>${bodyHtml}</body>
</html>`;
}

function previewLanding(get) {
    const bodyHtml = `
<main id="screen-landing" class="screen active">
    <div class="top-banner">
        <a href="#" class="admin-btn">${esc(get('login', 'common') || 'Login')}</a>
        <img src="/assets/logos/scslogo.png" alt="SCS Logo" class="banner-logo" onerror="this.style.display='none'">
    </div>
    <div class="hero-section">
        <div class="hero-content">
            <img src="/assets/logos/Game_Logo.png" alt="Logo" class="landing-logo" onerror="this.style.display='none'">
            <h1 style="display:none">${esc(get('landingTitle'))}</h1>
            <p>${esc(get('landingSubtitle'))}</p>
            <div class="gender-selector-container">
                <p>${esc(get('genderPrompt'))}</p>
                <div class="gender-selector">
                    <button type="button" data-gender="Male" class="gender-btn">
                        <img src="/assets/mascots/Idle (1).png" alt="" class="gender-mascot-icon" onerror="this.style.display='none'">
                        <span>${esc(get('male'))}</span>
                    </button>
                    <button type="button" data-gender="Female" class="gender-btn">
                        <img src="/assets/mascots/Idle (2).png" alt="" class="gender-mascot-icon" onerror="this.style.display='none'">
                        <span>${esc(get('female'))}</span>
                    </button>
                </div>
            </div>
            <div class="partner-logo-section" style="margin-top:2rem; text-align:center;">
                <p class="partner-credit">${esc(get('partnerCredit'))}</p>
                <div class="partner-logo-row"><span style="display:inline-block; width:80px; height:40px; background:#eee; border-radius:4px;"></span></div>
            </div>
        </div>
    </div>
</main>`;
    return buildPreviewDoc({
        cssLinks: BASE_CSS_LINKS + '<link rel="stylesheet" href="/css/landing.css">',
        extraStyles: INLINE_INDEX_STYLES,
        bodyHtml
    });
}

function previewCancerSelection(get) {
    const startLabel = esc(get('startAssessment'));
    const bodyHtml = `
<main id="screen-cancer-selection" class="screen active">
    <div class="hero-section">
        <div class="hero-content">
            <div class="cancer-selection-title-row">
                <div class="back-wrap"><button type="button" class="back-pill" aria-label="Back">&larr;</button></div>
                <div class="title-wrap"><h1>${esc(get('cancerSelectionTitle'))}</h1></div>
                <div class="title-spacer" aria-hidden="true"></div>
            </div>
            <p>${esc(get('cancerSelectionSubtitle'))}</p>
            <div class="assessment-cards" style="display:grid; grid-template-columns:repeat(auto-fill, minmax(160px, 1fr)); gap:16px; padding:1rem;">
                <div style="background:#fff; border-radius:12px; padding:16px; text-align:center; box-shadow:0 2px 8px rgba(0,0,0,0.08);">
                    <div style="height:80px; background:#f0f0f0; border-radius:8px; margin-bottom:12px; display:flex; align-items:center; justify-content:center;">&#127973;</div>
                    <div style="font-weight:600; margin-bottom:12px;">Sample Cancer</div>
                    <button style="background:var(--color-primary,#0891B2); color:#fff; border:none; padding:10px 16px; border-radius:6px; font-weight:600; width:100%;">${startLabel}</button>
                </div>
                <div style="background:#fff; border-radius:12px; padding:16px; text-align:center; box-shadow:0 2px 8px rgba(0,0,0,0.08);">
                    <div style="height:80px; background:#f0f0f0; border-radius:8px; margin-bottom:12px; display:flex; align-items:center; justify-content:center;">&#127973;</div>
                    <div style="font-weight:600; margin-bottom:12px;">Generic Assessment</div>
                    <button style="background:var(--color-primary,#0891B2); color:#fff; border:none; padding:10px 16px; border-radius:6px; font-weight:600; width:100%;">${startLabel}</button>
                </div>
            </div>
            <p style="text-align:center; color:#888; font-style:italic; margin-top:1rem;">${esc(get('noAssessmentsForGender'))}</p>
        </div>
    </div>
</main>`;
    return buildPreviewDoc({
        cssLinks: BASE_CSS_LINKS + '<link rel="stylesheet" href="/css/landing.css">',
        extraStyles: INLINE_INDEX_STYLES,
        bodyHtml
    });
}

function previewOnboarding(get) {
    const startLabel = esc(get('startAssessment', 'cancerSelection') || 'Start Assessment');
    const bodyHtml = `
<main id="screen-onboarding" class="screen active">
    <div class="container">
        <div class="cancer-selection-title-row">
            <div class="back-wrap"><button type="button" class="back-pill" aria-label="Back">&larr;</button></div>
            <div class="title-wrap"><h1>Cancer Risk Assessment</h1></div>
            <div class="title-spacer" aria-hidden="true"></div>
        </div>
        <p style="text-align:center; margin-bottom:20px;">${esc(get('assessmentSubtitle'))}</p>
        <form onsubmit="return false;">
            <div class="form-group">
                <label>1. ${esc(get('ageLabel'))} <span class="required">*</span></label>
                <div class="age-selection-container">
                    <input type="number" value="40" min="18" max="100" readonly>
                    <div class="slider-wrapper">
                        <input type="range" value="40" min="18" max="100" class="age-slider" disabled>
                        <div class="slider-labels"><span>18</span><span>100</span></div>
                    </div>
                </div>
            </div>
            <div class="form-group">
                <label>2. ${esc(get('ethnicityLabel'))} <span class="required">*</span></label>
                <div class="radio-group">
                    <input type="radio" id="p-ch" name="eth" checked disabled><label for="p-ch">${esc(get('chinese'))}</label>
                    <input type="radio" id="p-my" name="eth" disabled><label for="p-my">${esc(get('malay'))}</label>
                    <input type="radio" id="p-in" name="eth" disabled><label for="p-in">${esc(get('indian'))}</label>
                    <input type="radio" id="p-ca" name="eth" disabled><label for="p-ca">${esc(get('caucasian'))}</label>
                    <input type="radio" id="p-ot" name="eth" disabled><label for="p-ot">${esc(get('others'))}</label>
                </div>
                <input type="text" placeholder="${esc(get('ethnicityPlaceholder'))}" disabled style="margin-top:8px;">
            </div>
            <div class="form-group">
                <label>3. Has a close relative had this cancer? <span class="required">*</span></label>
                <div class="radio-group">
                    <input type="radio" id="p-fy" name="fh" disabled><label for="p-fy">${esc(get('familyYes'))}</label>
                    <input type="radio" id="p-fn" name="fh" checked disabled><label for="p-fn">${esc(get('familyNo'))}</label>
                    <input type="radio" id="p-fu" name="fh" disabled><label for="p-fu">${esc(get('familyUnknown'))}</label>
                </div>
            </div>
            <div class="form-actions">
                <button type="submit">${startLabel}</button>
            </div>
        </form>
    </div>
</main>`;
    return buildPreviewDoc({
        cssLinks: BASE_CSS_LINKS + '<link rel="stylesheet" href="/css/onboarding.css">',
        extraStyles: INLINE_INDEX_STYLES,
        bodyHtml
    });
}

function previewGame(get) {
    const progress = esc(String(get('progressTemplate') || '').replace('{current}', '3').replace('{total}', '10'));
    const bodyHtml = `
<main id="screen-game" class="screen active">
    <button class="game-exit-btn">${esc(get('exitButton'))}</button>
    <div class="game-header">
        <div id="progress-bar-container"><div id="progress-bar-fill" style="width:30%;"></div></div>
        <span id="progress-bar-text" style="display:inline-block; margin-top:6px; font-size:0.85rem; color:#666;">${progress}</span>
    </div>
    <div class="swipe-indicators">
        <div class="indicator left">
            <div class="pulse-arrow">&larr;</div>
            <span class="label">${esc(get('swipeNo'))}</span>
        </div>
        <div class="indicator right">
            <div class="pulse-arrow">&rarr;</div>
            <span class="label">${esc(get('swipeYes'))}</span>
        </div>
    </div>
    <div class="swipe-targets">
        <div class="target-zone">
            <span class="target-label">${esc(get('binIt'))}</span>
            <img src="/assets/logos/Bin (1).png" alt="" onerror="this.style.display='none'">
        </div>
        <div class="target-zone">
            <span class="target-label">${esc(get('pinIt'))}</span>
            <img src="/assets/logos/Pinboard (1).png" alt="" onerror="this.style.display='none'">
        </div>
    </div>
    <div id="card-container">
        <div id="question-card"><p>Sample question?</p></div>
    </div>
    <div id="feedback-explanation" class="container" style="padding:16px; margin-top:16px; background:#fff; border-radius:12px; box-shadow:0 2px 8px rgba(0,0,0,0.08);">
        <p>Sample explanation appears here after swiping.</p>
        <div style="display:flex; gap:8px; justify-content:center; margin-top:12px;">
            <button style="padding:8px 16px; border-radius:6px; background:#e0e0e0; border:none;">${esc(get('undoButton'))}</button>
            <button style="padding:8px 16px; border-radius:6px; background:var(--color-primary,#0891B2); color:#fff; border:none;">${esc(get('continueButton'))}</button>
        </div>
    </div>
    <div style="margin:16px; padding:16px; background:#fff; border-radius:12px; border:1px solid #ddd;">
        <div style="font-weight:600; font-size:0.75rem; color:#888; text-transform:uppercase; margin-bottom:8px;">Exit Modal</div>
        <h3 style="margin:0 0 8px;">${esc(get('exitModalTitle'))}</h3>
        <p style="margin:0 0 12px; color:#555; font-size:0.9rem;">${esc(get('exitModalMessage'))}</p>
        <div style="display:flex; gap:8px;">
            <button style="flex:1; padding:10px; border:1px solid #ccc; background:#fff; border-radius:6px;">${esc(get('exitModalStay'))}</button>
            <button style="flex:1; padding:10px; background:#e74c3c; color:#fff; border:none; border-radius:6px;">${esc(get('exitModalLeave'))}</button>
        </div>
    </div>
    <div style="margin:16px; padding:12px; background:#fff; border-radius:12px; border:1px solid #ddd; text-align:center;">
        <div style="font-weight:600; font-size:0.75rem; color:#888; text-transform:uppercase; margin-bottom:8px;">Mascot Feedback</div>
        <span style="display:inline-block; padding:6px 14px; background:#e8f5e9; color:#2e7d32; border-radius:16px; margin-right:8px;">${esc(get('feedbackYes'))}</span>
        <span style="display:inline-block; padding:6px 14px; background:#ffebee; color:#c62828; border-radius:16px;">${esc(get('feedbackNo'))}</span>
    </div>
</main>`;
    return buildPreviewDoc({
        cssLinks: BASE_CSS_LINKS + '<link rel="stylesheet" href="/css/game.css">',
        extraStyles: INLINE_INDEX_STYLES,
        bodyHtml
    });
}

function previewResults(get) {
    const factorsLabel = esc(get('factorsIdentified'));
    const bodyHtml = `
<main id="screen-results" class="screen active">
    <div class="container">
        <h2>${esc(get('resultsHeading'))}</h2>
        <p>${esc(get('summaryMedium'))}</p>
        <div class="high-risk-cta" style="padding:12px; background:#fff3e0; border-left:4px solid #e07872; margin:12px 0; border-radius:6px;">
            <p style="margin:0; color:#c0504a;">${esc(get('highRiskCta'))}</p>
        </div>
        <div style="text-align:center; margin:16px 0;">
            <span style="font-size:0.85rem; color:#666;">${esc(get('riskScore'))}</span>
            <div style="font-size:2rem; font-weight:700; color:#e07872;">45%</div>
        </div>
        <div class="cancer-breakdown">
            <h4>${esc(get('cancerBreakdownHeading'))}</h4>
            <div class="cancer-breakdown-container">
                <div style="padding:12px; margin-bottom:8px; background:#fff; border-radius:8px; border:1px solid #e0e0e0;">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;"><span style="font-weight:600;">Sample Cancer</span><span style="font-size:0.8rem; padding:2px 8px; background:#fff3e0; color:#e07872; border-radius:4px;">MEDIUM</span></div>
                    <div style="height:8px; background:#eee; border-radius:4px;"><div style="width:45%; height:100%; background:#e07872; border-radius:4px;"></div></div>
                </div>
            </div>
            <p style="padding:12px; text-align:center; color:#2e7d32; background:#e8f5e9; border-radius:6px; margin-top:12px;">${esc(get('healthyLifestyle'))}</p>
        </div>
        <div class="risk-breakdown">
            <h4>${esc(get('riskFactorsHeading'))}</h4>
            <div class="breakdown-categories">
                <div class="accordion-item"><div class="accordion-header"><span>${esc(get('categoryDiet'))}</span><span class="accordion-header-meta">3 ${factorsLabel}<span class="accordion-icon">+</span></span></div></div>
                <div class="accordion-item"><div class="accordion-header"><span>${esc(get('categoryLifestyle'))}</span><span class="accordion-header-meta">2 ${factorsLabel}<span class="accordion-icon">+</span></span></div></div>
                <div class="accordion-item"><div class="accordion-header"><span>${esc(get('categoryMedical'))}</span><span class="accordion-header-meta">1 ${factorsLabel}<span class="accordion-icon">+</span></span></div></div>
                <div class="accordion-item"><div class="accordion-header"><span>${esc(get('categoryFamily'))}</span><span class="accordion-header-meta">0 ${factorsLabel}<span class="accordion-icon">+</span></span></div></div>
            </div>
        </div>
        <div class="action-sections">
            <h4>${esc(get('recommendationsHeading'))}</h4>
            <div class="accordion-item"><div class="accordion-header"><span>Sample Recommendation Category</span><span class="accordion-icon">+</span></div></div>
        </div>
        <a href="#" class="button" style="display:block; margin-top:16px; text-align:center;">${esc(get('bookScreening'))}</a>
        <a href="#" class="button" style="display:block; margin-top:10px; text-align:center;">${esc(get('bookHealthierSG'))}</a>
        <form style="margin-top:16px;" onsubmit="return false;">
            <label>${esc(get('contactLabel'))}</label>
            <input type="email" placeholder="${esc(get('emailPlaceholder'))}" style="width:100%; padding:10px; margin-top:6px; border-radius:6px; border:1px solid #ccc; box-sizing:border-box;" disabled>
            <button type="submit" class="button" style="margin-top:10px;">${esc(get('submit'))}</button>
        </form>
        <button class="button button-secondary" style="margin-top:16px;">${esc(get('playAgain'))}</button>
        <button class="button button-secondary" style="margin-top:10px;">${esc(get('returnHome'))}</button>
        <p class="disclaimer">${esc(get('disclaimer'))}</p>
    </div>
</main>`;
    return buildPreviewDoc({
        cssLinks: BASE_CSS_LINKS + '<link rel="stylesheet" href="/css/results.css">',
        extraStyles: INLINE_INDEX_STYLES,
        bodyHtml
    });
}

// Mirrors services/emailService.js HTML exactly (inline styles, no external CSS).
function previewEmailReport(get) {
    const summary = esc(String(get('summaryMedium') || '').replace('{cancer}', 'breast cancer'));
    const subjectSpecific = esc(String(get('emailSubject') || '').replace('{type}', 'Breast'));
    const subjectGeneric = esc(get('emailSubjectGeneric'));
    const bodyHtml = `
<div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background: #f4f4f4;">
    <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #e07872 0%, #c0504a 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="margin: 0 0 6px; font-size: 22px;">${esc(get('resultsHeading') || 'Your Health Assessment Summary')}</h1>
            <p style="margin: 0; font-size: 13px; opacity: 0.9;">Singapore Cancer Society</p>
        </div>
        <div style="background: #f9f9f9; padding: 28px; border-radius: 0 0 10px 10px;">
            <div style="background: white; border-radius: 8px; padding: 18px 20px; margin-bottom: 24px; border: 1px solid #e8e8e8;">
                <p style="margin: 0; font-size: 15px; color: #333; line-height: 1.6;">${summary}</p>
            </div>
            <div style="margin-bottom: 28px;">
                <h2 style="font-size: 17px; color: #e07872; border-bottom: 2px solid #e07872; padding-bottom: 8px; margin-bottom: 16px;">${esc(get('riskFactorsHeading'))}</h2>
                <div style="background: white; border-radius: 8px; padding: 14px 16px; margin-bottom: 10px; border: 1px solid #e8e8e8; border-left: 3px solid #e07872;">
                    <div style="font-weight: 600; color: #e07872; margin-bottom: 8px;">${esc(get('categoryLifestyle'))}</div>
                    <ul style="margin: 0; padding-left: 18px;"><li style="margin: 6px 0; color: #555; font-size: 14px;">Sample risk factor</li></ul>
                </div>
                <div style="background: white; border-radius: 8px; padding: 14px 16px; margin-bottom: 10px; border: 1px solid #e8e8e8; border-left: 3px solid #e07872;">
                    <div style="font-weight: 600; color: #e07872; margin-bottom: 8px;">${esc(get('categoryDiet'))}</div>
                    <ul style="margin: 0; padding-left: 18px;"><li style="margin: 6px 0; color: #555; font-size: 14px; font-style: italic;">${esc(get('riskFactorFallback'))}</li></ul>
                </div>
            </div>
            <div style="margin-bottom: 28px;">
                <h2 style="font-size: 17px; color: #e07872; border-bottom: 2px solid #e07872; padding-bottom: 8px; margin-bottom: 16px;">${esc(get('cancerBreakdownHeading'))}</h2>
                <div style="margin-bottom: 16px; background: white; border-radius: 8px; padding: 14px 16px; border: 1px solid #e8e8e8;">
                    <span style="font-weight: 600; font-size: 14px; color: #333;">Sample Cancer</span>
                </div>
                <div style="background: white; border-radius: 8px; padding: 16px; text-align: center; color: #555; border: 1px solid #e8e8e8; font-style: italic;">${esc(get('healthyLifestyle'))}</div>
            </div>
            <div style="margin-bottom: 28px;">
                <h2 style="font-size: 17px; color: #e07872; border-bottom: 2px solid #e07872; padding-bottom: 8px; margin-bottom: 16px;">${esc(get('recommendationsHeading'))}</h2>
                <div style="background: white; border-radius: 8px; padding: 14px 16px; margin-bottom: 10px; border: 1px solid #e8e8e8; border-left: 3px solid #e07872;">
                    <div style="font-weight: 600; color: #e07872; margin-bottom: 8px;">Sample Recommendation</div>
                    <ul style="margin: 0; padding-left: 18px;"><li style="margin: 6px 0; color: #555; font-size: 14px;">Sample action item</li></ul>
                </div>
                <div style="background: white; border-radius: 8px; padding: 14px 16px; border: 1px solid #e8e8e8; border-left: 3px solid #e07872; color: #555; font-size: 14px; font-style: italic;">${esc(get('recommendationsFallback'))}</div>
            </div>
            <div style="margin-bottom: 24px;">
                <a href="#" style="display: block; background: #e07872; color: white; padding: 14px 20px; text-decoration: none; border-radius: 8px; font-weight: bold; text-align: center; margin-bottom: 10px; font-size: 15px;">&#128197; ${esc(get('bookScreening'))}</a>
                <a href="#" style="display: block; background: white; color: #e07872; padding: 14px 20px; text-decoration: none; border-radius: 8px; font-weight: bold; text-align: center; border: 2px solid #e07872; font-size: 15px;">&#127973; ${esc(get('bookHealthierSG'))}</a>
            </div>
            <div style="background: white; border-radius: 8px; padding: 16px 20px; margin-bottom: 24px; border: 1px solid #e8e8e8;">
                <h3 style="margin: 0 0 12px; font-size: 15px; color: #555;">${esc(get('yourInformation'))}</h3>
                <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                    <tr><td style="padding: 4px 0; color: #888; width: 45%;">${esc(get('assessmentTypeLabel'))}</td><td style="color: #333; font-weight: 500;">Breast</td></tr>
                    <tr><td style="padding: 4px 0; color: #888;">${esc(get('ageLabel'))}</td><td style="color: #333; font-weight: 500;">40</td></tr>
                    <tr><td style="padding: 4px 0; color: #888;">${esc(get('genderLabel'))}</td><td style="color: #333; font-weight: 500;">Female</td></tr>
                    <tr><td style="padding: 4px 0; color: #888;">${esc(get('ethnicityLabel'))}</td><td style="color: #333; font-weight: 500;">Chinese</td></tr>
                    <tr><td style="padding: 4px 0; color: #888;">${esc(get('familyHistoryLabel'))}</td><td style="color: #333; font-weight: 500;">No</td></tr>
                </table>
            </div>
            <div style="background: #f5f5f5; border: 1px solid #ddd; padding: 14px 16px; border-radius: 6px; font-size: 12px; color: #777; line-height: 1.5;">${esc(get('disclaimer'))}</div>
        </div>
        <div style="text-align: center; color: #999; font-size: 12px; margin-top: 16px;"><p style="margin: 0;">Singapore Cancer Society</p></div>
        <div style="margin-top: 20px; padding: 12px; background: #f0f8ff; border: 1px dashed #2196f3; border-radius: 6px; font-size: 12px; color: #0277bd;">
            <strong>Subject (specific):</strong> ${subjectSpecific}<br>
            <strong>Subject (generic):</strong> ${subjectGeneric}
        </div>
    </div>
</div>`;
    return buildPreviewDoc({
        cssLinks: '',
        extraStyles: 'body{margin:0; padding:0; background:#f4f4f4; pointer-events:none; user-select:none;}',
        bodyHtml
    });
}

function previewCommon(get) {
    const bodyHtml = `
<div style="padding:20px; font-family: Arial, sans-serif; background:#f5f5f5; min-height:100vh;">
    <h3 style="margin:0 0 12px; color:#555; font-size:0.8rem; text-transform:uppercase; letter-spacing:0.5px;">Landing Banner Link</h3>
    <div style="background:#fff; padding:14px; border-radius:8px; box-shadow:0 2px 8px rgba(0,0,0,0.08); margin-bottom:20px;">
        <a href="#" style="padding:6px 12px; color:#666; text-decoration:none; font-weight:600; font-size:0.85rem;">${esc(get('login'))}</a>
    </div>
    <h3 style="margin:0 0 12px; color:#555; font-size:0.8rem; text-transform:uppercase; letter-spacing:0.5px;">Loading &amp; Error States</h3>
    <div style="background:#fff; padding:12px 16px; border-radius:8px; box-shadow:0 2px 8px rgba(0,0,0,0.08); margin-bottom:8px; color:#555;">
        <span style="display:inline-block; width:10px; height:10px; border-radius:50%; background:#2196f3; margin-right:8px; animation: cpulse 1.5s infinite;"></span>${esc(get('loading'))}
    </div>
    <div style="background:#fff; padding:12px 16px; border-radius:8px; box-shadow:0 2px 8px rgba(0,0,0,0.08); margin-bottom:8px; border-left:3px solid #e74c3c; color:#c62828;">&#9888; ${esc(get('loadError'))}</div>
    <div style="margin-bottom:20px;"><button style="padding:10px 16px; background:#0891B2; color:#fff; border:none; border-radius:6px; font-weight:600;">${esc(get('reloadPage'))}</button></div>
    <h3 style="margin:0 0 12px; color:#555; font-size:0.8rem; text-transform:uppercase; letter-spacing:0.5px;">Language Switch Overlay</h3>
    <div style="background:#000; color:#fff; padding:24px; border-radius:8px; text-align:center; margin-bottom:20px;">
        <div style="display:inline-block; width:24px; height:24px; border:3px solid rgba(255,255,255,0.3); border-top-color:#fff; border-radius:50%; animation: cspin 1s linear infinite; margin-bottom:12px;"></div>
        <div>${esc(get('switchingLanguage'))}</div>
    </div>
    <h3 style="margin:0 0 12px; color:#555; font-size:0.8rem; text-transform:uppercase; letter-spacing:0.5px;">Email Form Feedback</h3>
    <div style="background:#fff; padding:12px 16px; border-radius:8px; box-shadow:0 2px 8px rgba(0,0,0,0.08); margin-bottom:8px; border-left:3px solid #e74c3c; color:#c62828;">${esc(get('validEmailError'))}</div>
    <div style="margin-bottom:8px;"><button style="padding:10px 16px; background:#ccc; color:#555; border:none; border-radius:6px; font-weight:600;" disabled>${esc(get('sendingText'))}</button></div>
    <div style="background:#e8f5e9; color:#2e7d32; padding:12px 16px; border-radius:6px;">&check; ${esc(get('resultsSentSuccess'))}</div>
    <style>@keyframes cpulse { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } } @keyframes cspin { to { transform: rotate(360deg); } }</style>
</div>`;
    return buildPreviewDoc({
        cssLinks: BASE_CSS_LINKS,
        extraStyles: 'body{margin:0; padding:0; pointer-events:none; user-select:none;}',
        bodyHtml
    });
}

const PREVIEW_BUILDERS = {
    landing: previewLanding,
    cancerSelection: previewCancerSelection,
    onboarding: previewOnboarding,
    game: previewGame,
    results: previewResults,
    emailReport: previewEmailReport,
    common: previewCommon
};

const LANGS = ['en', 'zh', 'ms', 'ta'];
const LANG_LABELS = { en: 'EN', zh: '中文', ms: 'BM', ta: 'தமிழ்' };

let translationsData = null;
let activePreviewGroup = null;
let activePreviewVariant = null; // e.g. 'results' or 'emailReport' (may differ from the open form group)

export async function loadTranslations() {
    const loading = document.getElementById('translations-loading');
    const form = document.getElementById('translations-form-container');
    const errEl = document.getElementById('translations-error');
    loading.style.display = 'block';
    form.style.display = 'none';
    errEl.style.display = 'none';

    try {
        const transRes = await adminFetch(`${API_BASE}/admin/translations`);
        const transResult = await transRes.json();
        if (!transResult.success) throw new Error(transResult.error);

        translationsData = transResult.data || {};

        clearLangChangeListeners();
        activePreviewGroup = null;
        activePreviewVariant = null;
        renderForm(form);
        initLangTabs('#translations-tab');
        bindTranslationPreviews();
        loading.style.display = 'none';
        form.style.display = 'block';
    } catch (err) {
        loading.style.display = 'none';
        errEl.textContent = 'Error: ' + err.message;
        errEl.style.display = 'block';
    }
}

// Optional subsection map. When a screen group has enough keys to feel bloated,
// list ordered subsections here to insert headings inside the <details>. Any
// key not listed in a subsection falls into a trailing "Other" bucket so
// nothing is ever hidden. Only applied when a group has an entry here.
const KEY_SUBSECTIONS = {
    results: [
        { label: 'Results Screen — Main Display', keys: ['resultsHeading', 'riskScore', 'summaryLow', 'summaryMedium', 'summaryHigh', 'highRiskCta'] },
        { label: 'Cancer Breakdown', keys: ['cancerBreakdownHeading', 'healthyLifestyle'] },
        { label: 'Risk Factor Categories', keys: ['riskFactorsHeading', 'factorsIdentified', 'categoryDiet', 'categoryLifestyle', 'categoryMedical', 'categoryFamily'] },
        { label: 'Recommendations', keys: ['recommendationsHeading'] },
        { label: 'Action Buttons', keys: ['bookScreening', 'bookHealthierSG', 'submit', 'playAgain', 'returnHome'] },
        { label: 'Email Form & Disclaimer', keys: ['contactLabel', 'emailPlaceholder', 'disclaimer'] },
        { label: 'Emailed Report — Subject, Info Table & Fallbacks', keys: ['emailSubject', 'emailSubjectGeneric', 'yourInformation', 'assessmentTypeLabel', 'ageLabel', 'genderLabel', 'ethnicityLabel', 'familyHistoryLabel', 'riskFactorFallback', 'recommendationsFallback'] }
    ]
};

function renderKeyFields(group, key, keys, descriptions) {
    const desc = descriptions[key] || {};
    const label = desc.label || key;
    const hint = desc.hint || '';
    const langs = keys[key] || { en: '', zh: '', ms: '', ta: '' };
    return renderLangFields(`trans-${group}-${key}`, label, hint, langs);
}

function renderForm(container) {
    /* Two-column layout: form on left, sticky preview on right */
    let formHtml = '';
    let groupKeys = Object.keys(SCREEN_GROUPS);

    for (const [group, groupLabel] of Object.entries(SCREEN_GROUPS)) {
        let keys = translationsData[group] || {};
        const descriptions = KEY_DESCRIPTIONS[group] || {};

        // Merge keys from descriptions to ensure ALL expected keys are rendered
        // even if they are missing from the server's JSON file.
        const allKeys = Array.from(new Set([...Object.keys(keys), ...Object.keys(descriptions)]));

        if (allKeys.length === 0) continue;

        formHtml += `<details class="translations-section" data-group="${esc(group)}">
            <summary class="translations-section-header">${esc(groupLabel)}</summary>
            <div class="translations-section-body">`;

        const subsections = KEY_SUBSECTIONS[group];
        if (subsections) {
            const seen = new Set();
            for (const sub of subsections) {
                const subKeys = sub.keys.filter(k => allKeys.includes(k));
                if (subKeys.length === 0) continue;
                formHtml += `<h5 class="translations-subsection-heading">${esc(sub.label)}</h5>`;
                for (const key of subKeys) {
                    formHtml += renderKeyFields(group, key, keys, descriptions);
                    seen.add(key);
                }
            }
            // Any keys not assigned to a subsection — render under "Other" so
            // nothing is ever dropped, even if KEY_SUBSECTIONS falls out of sync.
            const orphans = allKeys.filter(k => !seen.has(k));
            if (orphans.length > 0) {
                formHtml += `<h5 class="translations-subsection-heading">Other</h5>`;
                for (const key of orphans) {
                    formHtml += renderKeyFields(group, key, keys, descriptions);
                }
            }
        } else {
            for (const key of allKeys) {
                formHtml += renderKeyFields(group, key, keys, descriptions);
            }
        }
        formHtml += `</div></details>`;
    }

    /* Build two-column wrapper. Preview is an iframe that loads the real
       participant CSS so it renders 1-to-1 with the booth app. */
    container.innerHTML = `
        <div class="translations-tab-inner">
            <div class="translations-tab-main">${formHtml}</div>
            <aside class="translations-preview-col">
                <div class="translations-preview-sticky">
                    <div class="translations-preview-card">
                        <h4 id="translations-preview-title">Live Preview</h4>
                        <p class="tp-hint">Rendered with the real participant CSS — what you see is what the booth shows.</p>
                        <div class="translations-preview-variants" id="translations-preview-variants"></div>
                        <iframe id="translations-preview-frame" class="translations-preview-frame" title="Live preview" sandbox="allow-same-origin"></iframe>
                    </div>
                </div>
            </aside>
        </div>`;

    document.getElementById('save-translations-btn').onclick = saveTranslations;
}

function renderLangFields(prefix, label, hint, langObj) {
    let html = `<div class="form-group" style="margin-bottom: 12px;">
        <label style="font-size: 0.85rem; font-weight: 600; color: var(--color-dark-text);">${esc(label)}</label>`;
    if (hint) html += `<small style="display: block; margin-bottom: 4px; color: var(--color-light-text);">${esc(hint)}</small>`;
    html += `<div class="lang-tabs">`;
    for (const lang of LANGS) {
        html += `<button type="button" class="lang-tab-btn${lang === 'en' ? ' active' : ''}" data-lang="${lang}">${LANG_LABELS[lang]}</button>`;
    }
    html += `</div><div class="lang-fields-grid">`;
    for (const lang of LANGS) {
        const val = (langObj && langObj[lang]) || '';
        const isLong = val.length > 60;
        if (isLong) {
            html += `<div class="lang-field" data-lang="${lang}">
                <textarea id="${esc(prefix)}-${lang}" rows="3">${esc(val)}</textarea>
                <span class="lang-label">${LANG_LABELS[lang]}</span>
            </div>`;
        } else {
            html += `<div class="lang-field" data-lang="${lang}">
                <input type="text" id="${esc(prefix)}-${lang}" value="${esc(val)}">
                <span class="lang-label">${LANG_LABELS[lang]}</span>
            </div>`;
        }
    }
    html += `</div></div>`;
    return html;
}

function renderVariantTabs(group) {
    const container = document.getElementById('translations-preview-variants');
    if (!container) return;
    const variants = VARIANTS_FOR_GROUP[group] || [];
    if (variants.length <= 1) {
        container.textContent = '';
        return;
    }
    const buttonsHtml = variants.map(v => {
        const active = v.id === activePreviewVariant ? ' active' : '';
        return `<button type="button" class="translations-preview-variant-btn${active}" data-variant="${esc(v.id)}">${esc(v.label)}</button>`;
    }).join('');
    // innerHTML is safe here: all dynamic values come from the static
    // PREVIEW_VARIANTS constant and are additionally esc()'d.
    container.innerHTML = buttonsHtml;
    container.querySelectorAll('.translations-preview-variant-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            activePreviewVariant = btn.dataset.variant;
            renderVariantTabs(group);
            updateStickyPreview();
        });
    });
}

function bindTranslationPreviews() {
    const groupKeys = Object.keys(SCREEN_GROUPS);

    /* Set initial active group + variant */
    const firstGroup = groupKeys.find(g => translationsData[g]) || 'landing';
    activePreviewGroup = firstGroup;
    activePreviewVariant = (VARIANTS_FOR_GROUP[firstGroup] || [])[0]?.id || firstGroup;
    renderVariantTabs(firstGroup);
    updateStickyPreview();

    /* Bind input listeners — update preview on any field change in the active group. */
    for (const group of groupKeys) {
        if (!translationsData[group]) continue;
        for (const key of Object.keys(translationsData[group])) {
            for (const lang of LANGS) {
                const el = document.getElementById(`trans-${group}-${key}-${lang}`);
                if (el) el.addEventListener('input', () => {
                    if (activePreviewGroup === group) {
                        updateStickyPreview();
                    }
                });
            }
        }
    }

    /* Track which <details> section is opened — switch preview + variant tabs. */
    for (const group of groupKeys) {
        if (!translationsData[group]) continue;
        const detailsEl = document.querySelector(`.translations-section[data-group="${group}"]`);
        if (detailsEl) {
            detailsEl.addEventListener('toggle', () => {
                if (detailsEl.open) {
                    activePreviewGroup = group;
                    activePreviewVariant = (VARIANTS_FOR_GROUP[group] || [])[0]?.id || group;
                    renderVariantTabs(group);
                    updateStickyPreview();
                }
            });
        }
    }

    /* Update preview when language tab changes */
    onLangChange(() => {
        if (activePreviewVariant) updateStickyPreview();
    });
}

/**
 * Renders the active variant's preview into the sticky iframe. The iframe
 * uses `srcdoc` to host a full HTML document built by the variant's
 * builder — giving true 1-to-1 fidelity with the participant app.
 */
function updateStickyPreview() {
    const frame = document.getElementById('translations-preview-frame');
    const titleEl = document.getElementById('translations-preview-title');
    if (!frame || !activePreviewVariant) return;

    const variant = PREVIEW_VARIANTS.find(v => v.id === activePreviewVariant);
    if (!variant) return;

    const builder = PREVIEW_BUILDERS[variant.id];
    if (!builder) return;

    if (titleEl) titleEl.textContent = `Live Preview: ${variant.label}`;

    const lang = getActiveLang();
    const defaultGroup = variant.dbGroup;
    const get = (key, overrideGroup) => {
        const g = overrideGroup || defaultGroup;
        const el = document.getElementById(`trans-${g}-${key}-${lang}`);
        if (el) return el.value;
        return translationsData[g]?.[key]?.[lang] || translationsData[g]?.[key]?.en || '';
    };

    frame.srcdoc = builder(get);
}

function getLangValues(prefix) {
    const obj = {};
    for (const lang of LANGS) {
        const el = document.getElementById(`${prefix}-${lang}`);
        obj[lang] = el ? el.value : '';
    }
    return obj;
}

async function saveTranslations() {
    const btn = document.getElementById('save-translations-btn');

    // Collect all English field IDs and validate
    const enFieldIds = [];
    for (const [group, keys] of Object.entries(translationsData)) {
        for (const key of Object.keys(keys)) {
            enFieldIds.push(`trans-${group}-${key}-en`);
        }
    }
    const { valid } = validateEnglishFields('#translations-tab', enFieldIds);
    if (!valid) return;

    btn.disabled = true;
    btn.textContent = 'Saving...';
    try {
        const payload = {};
        for (const [group, keys] of Object.entries(translationsData)) {
            payload[group] = {};
            for (const key of Object.keys(keys)) {
                payload[group][key] = getLangValues(`trans-${group}-${key}`);
            }
        }
        const res = await adminFetch(`${API_BASE}/admin/translations`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const result = await res.json();
        if (!result.success) throw new Error(result.error);
        translationsData = result.data;
        showSuccess('Translations saved.');
    } catch (err) {
        showError(err.message);
    } finally {
        btn.disabled = false;
        btn.textContent = 'Save Translations';
    }
}

