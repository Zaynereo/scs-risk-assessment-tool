import { API_BASE, adminFetch } from '../api.js';
import { showSuccess, showError } from '../notifications.js';
import { initLangTabs, getActiveLang, onLangChange, clearLangChangeListeners } from '../langTabs.js';
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
const KEY_DESCRIPTIONS = {
    landing: {
        landingTitle: { label: 'Main Title', hint: 'Large heading on the landing page (hidden if logo is shown)' },
        landingSubtitle: { label: 'Subtitle', hint: 'Text below the title/logo on the landing page' },
        genderPrompt: { label: 'Gender Prompt', hint: 'Text above the Male/Female buttons' },
        male: { label: '"Male" Button', hint: 'Label on the Male gender button' },
        female: { label: '"Female" Button', hint: 'Label on the Female gender button' }
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
        back: { label: '"Back" Button', hint: 'Back navigation button' },
        assessmentSubtitle: { label: 'Assessment Subtitle', hint: 'Instruction text on the onboarding screen' }
    },
    game: {
        swipeNo: { label: '"No" Swipe Label', hint: 'Text shown on the left/no swipe side' },
        swipeYes: { label: '"Yes" Swipe Label', hint: 'Text shown on the right/yes swipe side' },
        binIt: { label: '"Bin It" Label', hint: 'Instruction below the No swipe zone' },
        pinIt: { label: '"Pin It" Label', hint: 'Instruction below the Yes swipe zone' },
        feedbackYes: { label: 'Yes Feedback', hint: 'Reaction text when user swipes Yes (e.g. "Aiyo!")' },
        feedbackNo: { label: 'No Feedback', hint: 'Reaction text when user swipes No (e.g. "Steady!")' },
        continueButton: { label: '"Continue" Button', hint: 'Button on the explanation card after each question swipe' },
        highImportance: { label: '"High Importance" Badge', hint: 'Badge for high-weight questions in explanation card' },
        mediumImportance: { label: '"Medium Importance" Badge', hint: 'Badge for medium-weight questions in explanation card' },
        lowImportance: { label: '"Low Importance" Badge', hint: 'Badge for low-weight questions in explanation card' }
    },
    results: {
        resultsHeading: { label: 'Results Title', hint: 'Main heading on the results screen' },
        riskFactorsHeading: { label: 'Risk Factors Title', hint: 'Heading above the risk factor list' },
        recommendationsHeading: { label: 'Recommendations Title', hint: 'Heading above the recommendations' },
        lowRisk: { label: '"LOW RISK" Badge', hint: 'Risk level badge text' },
        mediumRisk: { label: '"MEDIUM RISK" Badge', hint: 'Risk level badge text' },
        highRisk: { label: '"HIGH RISK" Badge', hint: 'Risk level badge text' },
        riskScore: { label: '"Risk Score" Label', hint: 'Label next to the percentage score' },
        bookScreening: { label: 'Book Screening Button', hint: 'Call-to-action button for booking' },
        contactLabel: { label: 'Email Prompt', hint: 'Text describing what the user will receive via email' },
        emailPlaceholder: { label: 'Email Placeholder', hint: 'Placeholder inside the email input' },
        submit: { label: '"Send Results" Button', hint: 'Button to submit email and results' },
        playAgain: { label: '"Start New Quiz" Button', hint: 'Button to reset and start a fresh quiz (e.g. for the next participant)' },
        disclaimer: { label: 'Disclaimer', hint: 'Legal disclaimer at the bottom (supports HTML: <strong>)' },
        noIssues: { label: '"No Issues" Label', hint: 'Shown in risk factors when no issues found' },
        lowRiskBadge: { label: '"Low Risk" Factor Badge', hint: 'Badge next to low-risk factors' },
        someRisk: { label: '"Some Risk" Factor Badge', hint: 'Badge next to moderate-risk factors' },
        highRiskBadge: { label: '"High Risk" Factor Badge', hint: 'Badge next to high-risk factors' },
        factorsIdentified: { label: '"Factors Identified" Label', hint: 'e.g. "3 factor(s) identified"' },
        riskScorePercent: { label: '"Risk Score" (lowercase)', hint: 'Used in the per-cancer breakdown' },
        summaryLow: { label: 'Low Risk Summary', hint: 'Summary text for low-risk result. Use {cancer} as placeholder.' },
        summaryMedium: { label: 'Medium Risk Summary', hint: 'Summary text for medium-risk result' },
        summaryHigh: { label: 'High Risk Summary', hint: 'Summary text for high-risk result' },
        highRiskCta: { label: 'High Risk Call-to-Action', hint: 'Prominent message shown for high-risk results' },
        cancerBreakdownHeading: { label: 'Cancer Breakdown Title', hint: 'Heading for the per-cancer risk section' }
    },
    common: {
        loading: { label: 'Loading Text', hint: 'Shown while assessments are loading' },
        loadError: { label: 'Load Error Message', hint: 'Shown when assessments fail to load' },
        reloadPage: { label: '"Reload Page" Button', hint: 'Button to retry loading' },
        validEmailError: { label: 'Email Validation Error', hint: 'Shown when an invalid email is entered' },
        sendingText: { label: '"Sending..." Text', hint: 'Button text while email is being sent' },
        resultsSentSuccess: { label: 'Email Sent Success', hint: 'Toast message after email is sent' },
        familyGenetics: { label: '"Family & Genetics" Label', hint: 'Category name in risk breakdown' },
        ageFactor: { label: '"Age Factor" Label', hint: 'Category name in risk breakdown' },
        ethnicityFactor: { label: '"Ethnicity Factor" Label', hint: 'Category name in risk breakdown' }
    }
};

/**
 * Higher-fidelity preview templates for each screen group.
 * Each template receives a `get(key, overrideGroup?)` function that returns
 * the live value of a translation key for the active language.
 * All output uses esc() for XSS safety and .tp-* CSS classes (no inline styles).
 */
const PREVIEW_TEMPLATES = {
    landing: (get) => `
        <div class="tp-preview-screen">
            <div class="tp-landing-title">${esc(get('landingTitle'))}</div>
            <div class="tp-landing-subtitle">${esc(get('landingSubtitle'))}</div>
            <div class="tp-gender-prompt">${esc(get('genderPrompt'))}</div>
            <div class="tp-gender-cards">
                <div class="tp-gender-card">
                    <div class="tp-gender-card-icon">&#128104;</div>
                    <div class="tp-gender-card-label">${esc(get('male'))}</div>
                </div>
                <div class="tp-gender-card">
                    <div class="tp-gender-card-icon">&#128105;</div>
                    <div class="tp-gender-card-label">${esc(get('female'))}</div>
                </div>
            </div>
        </div>`,

    cancerSelection: (get) => `
        <div class="tp-preview-screen">
            <div class="tp-cancer-header">
                <div class="tp-cancer-title">${esc(get('cancerSelectionTitle'))}</div>
                <div class="tp-cancer-subtitle">${esc(get('cancerSelectionSubtitle'))}</div>
            </div>
            <div class="tp-cancer-card">
                <div class="tp-card-icon">
                    <div class="tp-gender-card-icon">&#127973;</div>
                </div>
                <div class="tp-card-name">Sample Assessment</div>
                <div class="tp-card-btn">${esc(get('startAssessment'))}</div>
            </div>
            <div class="tp-no-assessments">${esc(get('noAssessmentsForGender'))}</div>
        </div>`,

    onboarding: (get) => `
        <div class="tp-preview-screen">
            <div class="tp-onboarding-container">
                <div class="tp-section-label">${esc(get('assessmentSubtitle'))}</div>
                <div class="tp-section-label">${esc(get('ageLabel'))}</div>
                <div class="tp-input">40</div>
                <div class="tp-section-label">${esc(get('ethnicityLabel'))}</div>
                <div class="tp-chip-group">
                    <span class="tp-chip tp-chip-selected">${esc(get('chinese'))}</span>
                    <span class="tp-chip">${esc(get('malay'))}</span>
                    <span class="tp-chip">${esc(get('indian'))}</span>
                    <span class="tp-chip">${esc(get('caucasian'))}</span>
                    <span class="tp-chip">${esc(get('others'))}</span>
                </div>
                <div class="tp-input">${esc(get('ethnicityPlaceholder'))}</div>
                <div class="tp-section-label">Family history?</div>
                <div class="tp-traffic-group">
                    <div class="tp-traffic-btn tp-traffic-btn-yes">${esc(get('familyYes'))}</div>
                    <div class="tp-traffic-btn tp-traffic-btn-no">${esc(get('familyNo'))}</div>
                    <div class="tp-traffic-btn tp-traffic-btn-unknown">${esc(get('familyUnknown'))}</div>
                </div>
                <div class="tp-form-actions">
                    <span class="tp-card-btn-secondary">${esc(get('back'))}</span>
                    <span class="tp-card-btn">${esc(get('startAssessment', 'cancerSelection') || 'Start')}</span>
                </div>
            </div>
        </div>`,

    game: (get) => `
        <div class="tp-preview-screen">
            <div class="tp-game-layout">
                <div class="tp-swipe-row">
                    <div class="tp-swipe-indicator tp-swipe-indicator-left">
                        <div>${esc(get('swipeNo'))}</div>
                        <div class="tp-swipe-sublabel">${esc(get('binIt'))}</div>
                    </div>
                    <div class="tp-question-card">Sample question?</div>
                    <div class="tp-swipe-indicator tp-swipe-indicator-right">
                        <div>${esc(get('swipeYes'))}</div>
                        <div class="tp-swipe-sublabel">${esc(get('pinIt'))}</div>
                    </div>
                </div>
                <div class="tp-feedback-row">
                    <span class="tp-feedback-yes">${esc(get('feedbackYes'))}</span>
                    <span class="tp-feedback-no">${esc(get('feedbackNo'))}</span>
                </div>
                <div class="tp-explanation-card">
                    <div class="tp-badge tp-badge-high">${esc(get('highImportance'))}</div>
                    <div class="tp-explanation-text">Explanation text appears here after swiping...</div>
                    <div class="tp-continue-btn">${esc(get('continueButton'))}</div>
                </div>
                <div class="tp-feedback-row">
                    <span class="tp-badge tp-badge-medium">${esc(get('mediumImportance'))}</span>
                    <span class="tp-badge tp-badge-low">${esc(get('lowImportance'))}</span>
                </div>
            </div>
        </div>`,

    results: (get) => `
        <div class="tp-preview-screen">
            <div class="tp-results-heading">${esc(get('resultsHeading'))}</div>
            <div class="tp-risk-pill tp-risk-pill-medium">
                <span>${esc(get('mediumRisk'))}</span>
            </div>
            <div class="tp-summary-text">${esc(get('summaryMedium'))}</div>
            <div class="tp-high-risk-cta">${esc(get('highRiskCta'))}</div>
            <div class="tp-score-container">
                <div class="tp-score-label">${esc(get('riskScore'))}</div>
                <div class="tp-score-value">45%</div>
            </div>
            <div class="tp-section-heading">${esc(get('cancerBreakdownHeading'))}</div>
            <div class="tp-risk-category">
                <div class="tp-category-header">
                    <span class="tp-category-name">Sample Cancer</span>
                    <span class="tp-category-badge tp-category-badge-medium">${esc(get('someRisk'))}</span>
                </div>
                <div class="tp-gauge-bar"><div class="tp-gauge-fill tp-gauge-fill-medium"></div></div>
            </div>
            <div class="tp-section-heading">${esc(get('riskFactorsHeading'))}</div>
            <div class="tp-risk-category">
                <div class="tp-category-header">
                    <span class="tp-category-name">${esc(get('factorsIdentified', 'results'))}</span>
                    <span class="tp-category-badge tp-category-badge-high">${esc(get('highRiskBadge'))}</span>
                </div>
                <div class="tp-gauge-bar"><div class="tp-gauge-fill tp-gauge-fill-high" style="width: 70%;"></div></div>
            </div>
            <div class="tp-risk-category">
                <div class="tp-category-header">
                    <span class="tp-category-name">${esc(get('noIssues'))}</span>
                    <span class="tp-category-badge tp-category-badge-low">${esc(get('lowRiskBadge'))}</span>
                </div>
                <div class="tp-gauge-bar"><div class="tp-gauge-fill tp-gauge-fill-low" style="width: 20%;"></div></div>
            </div>
            <div class="tp-section-heading">${esc(get('recommendationsHeading'))}</div>
            <div class="tp-accordion-item">
                <div class="tp-accordion-header">
                    <span>Recommendation Category</span>
                    <span class="tp-accordion-icon">+</span>
                </div>
            </div>
            <div class="tp-card-btn tp-card-btn-block">${esc(get('bookScreening'))}</div>
            <div class="tp-email-form">
                <div class="tp-email-label">${esc(get('contactLabel'))}</div>
                <div class="tp-email-input">${esc(get('emailPlaceholder'))}</div>
                <div class="tp-card-btn tp-card-btn-block">${esc(get('submit'))}</div>
            </div>
            <div class="tp-btn-row">
                <span class="tp-card-btn-secondary">${esc(get('playAgain'))}</span>
            </div>
            <div class="tp-disclaimer">${esc(get('disclaimer'))}</div>
            <div class="tp-risk-pill tp-risk-pill-low"><span>${esc(get('lowRisk'))}</span></div>
            <div class="tp-risk-pill tp-risk-pill-high"><span>${esc(get('highRisk'))}</span></div>
            <div class="tp-summary-text">${esc(get('summaryLow'))}</div>
            <div class="tp-summary-text">${esc(get('summaryHigh'))}</div>
            <div class="tp-score-label">${esc(get('riskScorePercent'))}</div>
        </div>`,

    common: (get) => `
        <div class="tp-preview-screen">
            <div class="tp-common-group">
                <div class="tp-common-group-title">Status Messages</div>
                <div class="tp-common-item">
                    <span class="tp-common-icon">&#9203;</span>
                    <span>${esc(get('loading'))}</span>
                </div>
                <div class="tp-common-item">
                    <span class="tp-common-icon">&#9888;</span>
                    <span>${esc(get('loadError'))}</span>
                </div>
                <div class="tp-common-item">
                    <span class="tp-common-icon">&#128260;</span>
                    <span class="tp-card-btn-secondary">${esc(get('reloadPage'))}</span>
                </div>
            </div>
            <div class="tp-common-group">
                <div class="tp-common-group-title">Email &amp; Validation</div>
                <div class="tp-common-item">
                    <span class="tp-common-icon">&#9888;</span>
                    <span>${esc(get('validEmailError'))}</span>
                </div>
                <div class="tp-common-item">
                    <span class="tp-common-icon">&#9203;</span>
                    <span>${esc(get('sendingText'))}</span>
                </div>
                <div class="tp-common-item">
                    <span class="tp-common-icon">&#9989;</span>
                    <span>${esc(get('resultsSentSuccess'))}</span>
                </div>
            </div>
            <div class="tp-common-group">
                <div class="tp-common-group-title">Risk Factor Categories</div>
                <div class="tp-common-item">
                    <span class="tp-common-icon">&#128106;</span>
                    <span>${esc(get('familyGenetics'))}</span>
                </div>
                <div class="tp-common-item">
                    <span class="tp-common-icon">&#128197;</span>
                    <span>${esc(get('ageFactor'))}</span>
                </div>
                <div class="tp-common-item">
                    <span class="tp-common-icon">&#127758;</span>
                    <span>${esc(get('ethnicityFactor'))}</span>
                </div>
            </div>
        </div>`
};

const LANGS = ['en', 'zh', 'ms', 'ta'];
const LANG_LABELS = { en: 'EN', zh: '中文', ms: 'BM', ta: 'தமிழ்' };

let translationsData = null;
let recommendationsData = null;
let activePreviewGroup = null;

export async function loadTranslations() {
    const loading = document.getElementById('translations-loading');
    const form = document.getElementById('translations-form-container');
    const errEl = document.getElementById('translations-error');
    loading.style.display = 'block';
    form.style.display = 'none';
    errEl.style.display = 'none';

    try {
        const [transRes, recRes] = await Promise.all([
            adminFetch(`${API_BASE}/admin/translations`),
            adminFetch(`${API_BASE}/admin/recommendations`)
        ]);
        const transResult = await transRes.json();
        const recResult = await recRes.json();
        if (!transResult.success) throw new Error(transResult.error);
        if (!recResult.success) throw new Error(recResult.error);

        translationsData = transResult.data || {};
        recommendationsData = recResult.data || {};

        clearLangChangeListeners();
        activePreviewGroup = null;
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

function renderForm(container) {
    /* Two-column layout: form on left, sticky preview on right */
    let formHtml = '';
    let groupKeys = Object.keys(SCREEN_GROUPS);

    for (const [group, groupLabel] of Object.entries(SCREEN_GROUPS)) {
        const keys = translationsData[group];
        if (!keys) continue;
        const descriptions = KEY_DESCRIPTIONS[group] || {};

        formHtml += `<details class="translations-section" data-group="${esc(group)}">
            <summary class="translations-section-header">${esc(groupLabel)}</summary>
            <div class="translations-section-body">`;

        for (const [key, langs] of Object.entries(keys)) {
            const desc = descriptions[key] || {};
            const label = desc.label || key;
            const hint = desc.hint || '';
            formHtml += renderLangFields(`trans-${group}-${key}`, label, hint, langs);
        }
        formHtml += `</div></details>`;
    }

    formHtml += `<div style="margin-top: 16px;">
        <button type="button" class="btn btn-primary" id="save-translations-btn">Save Translations</button>
    </div>`;

    formHtml += `<hr style="margin: 32px 0;">
        <h3 style="margin-bottom: 16px;">Recommendations</h3>
        <p style="color: var(--color-light-text); margin-bottom: 16px;">
            Edit the recommendation titles and action items shown on the results screen.
        </p>`;

    for (const [category, rec] of Object.entries(recommendationsData)) {
        formHtml += `<details class="translations-section">
            <summary class="translations-section-header">${esc(rec.title?.en || category)}</summary>
            <div class="translations-section-body">`;
        formHtml += renderLangFields(`rec-${category}-title`, 'Category Title', 'Heading shown above the recommendation actions', rec.title || {});

        if (Array.isArray(rec.actions)) {
            rec.actions.forEach((action, i) => {
                formHtml += renderLangFields(`rec-${category}-action-${i}`, `Action ${i + 1}`, 'A specific recommendation action item', action);
            });
        }
        formHtml += `</div></details>`;
    }

    formHtml += `<div style="margin-top: 16px;">
        <button type="button" class="btn btn-primary" id="save-recommendations-btn">Save Recommendations</button>
    </div>`;

    /* Build two-column wrapper */
    const firstGroup = groupKeys.find(g => translationsData[g]) || 'landing';
    container.innerHTML = `
        <div class="translations-tab-inner">
            <div class="translations-tab-main">${formHtml}</div>
            <aside class="translations-preview-col">
                <div class="translations-preview-sticky">
                    <div class="translations-preview-card">
                        <h4 id="translations-preview-title">Live Preview: ${esc(SCREEN_GROUPS[firstGroup])}</h4>
                        <p class="tp-hint">Shows how these texts appear in the quiz</p>
                        <div id="translations-preview-content"></div>
                    </div>
                </div>
            </aside>
        </div>`;

    document.getElementById('save-translations-btn').onclick = saveTranslations;
    document.getElementById('save-recommendations-btn').onclick = saveRecommendations;
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

function bindTranslationPreviews() {
    const groupKeys = Object.keys(SCREEN_GROUPS);

    /* Set initial active group to first available */
    const firstGroup = groupKeys.find(g => translationsData[g]) || 'landing';
    activePreviewGroup = firstGroup;
    updateStickyPreview(firstGroup);

    /* Bind input listeners — update preview on any field change */
    for (const group of groupKeys) {
        if (!translationsData[group]) continue;
        for (const key of Object.keys(translationsData[group])) {
            for (const lang of LANGS) {
                const el = document.getElementById(`trans-${group}-${key}-${lang}`);
                if (el) el.addEventListener('input', () => {
                    if (activePreviewGroup === group) {
                        updateStickyPreview(group);
                    }
                });
            }
        }
    }

    /* Track which <details> section is opened — switch preview to that group */
    for (const group of groupKeys) {
        if (!translationsData[group]) continue;
        const detailsEl = document.querySelector(`.translations-section[data-group="${group}"]`);
        if (detailsEl) {
            detailsEl.addEventListener('toggle', () => {
                if (detailsEl.open) {
                    activePreviewGroup = group;
                    updateStickyPreview(group);
                }
            });
        }
    }

    /* Update preview when language tab changes */
    onLangChange(() => {
        if (activePreviewGroup) {
            updateStickyPreview(activePreviewGroup);
        }
    });
}

/**
 * Renders the active group's preview template into the sticky side panel.
 */
function updateStickyPreview(group) {
    const contentEl = document.getElementById('translations-preview-content');
    const titleEl = document.getElementById('translations-preview-title');
    if (!contentEl) return;

    const template = PREVIEW_TEMPLATES[group];
    if (!template) {
        contentEl.innerHTML = '';
        return;
    }

    if (titleEl) {
        titleEl.textContent = `Live Preview: ${SCREEN_GROUPS[group] || group}`;
    }

    const lang = getActiveLang();
    const get = (key, overrideGroup) => {
        const g = overrideGroup || group;
        const el = document.getElementById(`trans-${g}-${key}-${lang}`);
        if (el) return el.value;
        return translationsData[g]?.[key]?.[lang] || translationsData[g]?.[key]?.en || key;
    };
    contentEl.innerHTML = template(get);
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

async function saveRecommendations() {
    const btn = document.getElementById('save-recommendations-btn');
    btn.disabled = true;
    btn.textContent = 'Saving...';
    try {
        const payload = {};
        for (const [category, rec] of Object.entries(recommendationsData)) {
            payload[category] = {
                title: getLangValues(`rec-${category}-title`),
                actions: Array.isArray(rec.actions)
                    ? rec.actions.map((_, i) => getLangValues(`rec-${category}-action-${i}`))
                    : []
            };
        }
        const res = await adminFetch(`${API_BASE}/admin/recommendations`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const result = await res.json();
        if (!result.success) throw new Error(result.error);
        recommendationsData = result.data;
        showSuccess('Recommendations saved.');
    } catch (err) {
        showError(err.message);
    } finally {
        btn.disabled = false;
        btn.textContent = 'Save Recommendations';
    }
}
