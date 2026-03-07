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

// Preview templates for each screen group
const PREVIEW_TEMPLATES = {
    landing: (get) => `
        <div class="tp-preview-screen">
            <div style="font-size: 1rem; font-weight: 700; text-align: center; margin-bottom: 4px;">${esc(get('landingTitle'))}</div>
            <div style="font-size: 0.75rem; text-align: center; color: var(--color-light-text); margin-bottom: 8px;">${esc(get('landingSubtitle'))}</div>
            <div style="font-size: 0.75rem; text-align: center; margin-bottom: 6px;">${esc(get('genderPrompt'))}</div>
            <div style="display: flex; gap: 8px; justify-content: center;">
                <span class="tp-card-btn">${esc(get('male'))}</span>
                <span class="tp-card-btn">${esc(get('female'))}</span>
            </div>
        </div>`,
    cancerSelection: (get) => `
        <div class="tp-preview-screen">
            <div style="font-size: 0.9rem; font-weight: 700; text-align: center; margin-bottom: 4px;">${esc(get('cancerSelectionTitle'))}</div>
            <div style="font-size: 0.7rem; text-align: center; color: var(--color-light-text); margin-bottom: 8px;">${esc(get('cancerSelectionSubtitle'))}</div>
            <div style="display: flex; gap: 6px; justify-content: center; flex-wrap: wrap;">
                <div style="border: 1px solid #e0e0e0; border-radius: 8px; padding: 8px 12px; text-align: center; font-size: 0.7rem;">
                    <div style="width: 24px; height: 24px; background: #f0f0f0; border-radius: 4px; margin: 0 auto 4px;"></div>
                    Assessment
                    <div class="tp-card-btn" style="margin-top: 4px; font-size: 0.6rem;">${esc(get('startAssessment'))}</div>
                </div>
            </div>
        </div>`,
    onboarding: (get) => `
        <div class="tp-preview-screen">
            <div style="font-size: 0.75rem; margin-bottom: 4px;">${esc(get('ageLabel'))}</div>
            <div style="height: 20px; border: 1px solid #ddd; border-radius: 4px; margin-bottom: 6px;"></div>
            <div style="font-size: 0.75rem; margin-bottom: 4px;">${esc(get('ethnicityLabel'))}</div>
            <div style="display: flex; gap: 4px; flex-wrap: wrap; margin-bottom: 6px; font-size: 0.65rem;">
                <span style="padding: 2px 6px; border: 1px solid #ddd; border-radius: 4px;">${esc(get('chinese'))}</span>
                <span style="padding: 2px 6px; border: 1px solid #ddd; border-radius: 4px;">${esc(get('malay'))}</span>
                <span style="padding: 2px 6px; border: 1px solid #ddd; border-radius: 4px;">${esc(get('indian'))}</span>
            </div>
            <div style="font-size: 0.75rem; margin-bottom: 4px;">Family history?</div>
            <div style="display: flex; gap: 4px; font-size: 0.65rem; margin-bottom: 6px;">
                <span style="padding: 2px 6px; border: 1px solid #ddd; border-radius: 4px;">${esc(get('familyYes'))}</span>
                <span style="padding: 2px 6px; border: 1px solid #ddd; border-radius: 4px;">${esc(get('familyNo'))}</span>
                <span style="padding: 2px 6px; border: 1px solid #ddd; border-radius: 4px;">${esc(get('familyUnknown'))}</span>
            </div>
            <div style="display: flex; gap: 6px; justify-content: center;">
                <span class="tp-card-btn" style="background: #6c757d;">${esc(get('back'))}</span>
                <span class="tp-card-btn">${esc(get('startAssessment', 'cancerSelection') || 'Start')}</span>
            </div>
        </div>`,
    game: (get) => `
        <div class="tp-preview-screen">
            <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
                <div style="text-align: center; font-size: 0.65rem;">
                    <div>${esc(get('swipeNo'))}</div>
                    <div style="color: var(--color-light-text);">${esc(get('binIt'))}</div>
                </div>
                <div style="border: 1px solid #e0e0e0; border-radius: 8px; padding: 8px 12px; flex: 1; margin: 0 8px; text-align: center; font-size: 0.7rem;">
                    Sample question?
                </div>
                <div style="text-align: center; font-size: 0.65rem;">
                    <div>${esc(get('swipeYes'))}</div>
                    <div style="color: var(--color-light-text);">${esc(get('pinIt'))}</div>
                </div>
            </div>
            <div style="display: flex; gap: 8px; justify-content: center; font-size: 0.7rem;">
                <span style="color: #f44336; font-weight: 600;">${esc(get('feedbackYes'))}</span>
                <span style="color: #2e7d32; font-weight: 600;">${esc(get('feedbackNo'))}</span>
            </div>
        </div>`,
    results: (get) => `
        <div class="tp-preview-screen">
            <div style="font-size: 0.9rem; font-weight: 700; text-align: center; margin-bottom: 2px;">${esc(get('resultsHeading'))}</div>
            <div style="font-size: 0.8rem; font-weight: 700; text-align: center; color: var(--color-primary); margin-bottom: 4px;">${esc(get('mediumRisk'))}</div>
            <div style="font-size: 0.65rem; text-align: center; color: var(--color-light-text); margin-bottom: 6px;">${esc(get('riskScore'))}: 45%</div>
            <div style="font-size: 0.7rem; font-weight: 600; margin-bottom: 2px;">${esc(get('riskFactorsHeading'))}</div>
            <div style="font-size: 0.6rem; color: var(--color-light-text); margin-bottom: 4px;">2 ${esc(get('factorsIdentified'))}</div>
            <div style="font-size: 0.7rem; font-weight: 600; margin-bottom: 2px;">${esc(get('recommendationsHeading'))}</div>
            <div style="display: flex; gap: 4px; margin-top: 6px; justify-content: center; flex-wrap: wrap;">
                <span class="tp-card-btn" style="font-size: 0.55rem;">${esc(get('playAgain'))}</span>
                <span class="tp-card-btn" style="font-size: 0.55rem;">${esc(get('submit'))}</span>
            </div>
        </div>`,
    common: () => `<div class="tp-preview-screen" style="text-align: center; color: var(--color-light-text); font-size: 0.75rem; padding: 12px;">These labels appear across multiple screens (loading states, error messages, risk factor categories).</div>`
};

const LANGS = ['en', 'zh', 'ms', 'ta'];
const LANG_LABELS = { en: 'EN', zh: '中文', ms: 'BM', ta: 'தமிழ்' };

let translationsData = null;
let recommendationsData = null;

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
    let html = '';

    for (const [group, groupLabel] of Object.entries(SCREEN_GROUPS)) {
        const keys = translationsData[group];
        if (!keys) continue;
        const descriptions = KEY_DESCRIPTIONS[group] || {};

        html += `<details class="translations-section" open>
            <summary class="translations-section-header">${esc(groupLabel)}</summary>
            <div class="translations-section-body">
                <div class="translation-preview" id="trans-preview-${esc(group)}">
                    <h4>Live Preview: ${esc(groupLabel)}</h4>
                    <p class="tp-hint">Shows how these texts appear in the quiz</p>
                    <div id="trans-preview-${esc(group)}-content"></div>
                </div>`;

        for (const [key, langs] of Object.entries(keys)) {
            const desc = descriptions[key] || {};
            const label = desc.label || key;
            const hint = desc.hint || '';
            html += renderLangFields(`trans-${group}-${key}`, label, hint, langs);
        }
        html += `</div></details>`;
    }

    html += `<div style="margin-top: 16px;">
        <button type="button" class="btn btn-primary" id="save-translations-btn">Save Translations</button>
    </div>`;

    html += `<hr style="margin: 32px 0;">
        <h3 style="margin-bottom: 16px;">Recommendations</h3>
        <p style="color: var(--color-light-text); margin-bottom: 16px;">
            Edit the recommendation titles and action items shown on the results screen.
        </p>`;

    for (const [category, rec] of Object.entries(recommendationsData)) {
        html += `<details class="translations-section">
            <summary class="translations-section-header">${esc(rec.title?.en || category)}</summary>
            <div class="translations-section-body">`;
        html += renderLangFields(`rec-${category}-title`, 'Category Title', 'Heading shown above the recommendation actions', rec.title || {});

        if (Array.isArray(rec.actions)) {
            rec.actions.forEach((action, i) => {
                html += renderLangFields(`rec-${category}-action-${i}`, `Action ${i + 1}`, 'A specific recommendation action item', action);
            });
        }
        html += `</div></details>`;
    }

    html += `<div style="margin-top: 16px;">
        <button type="button" class="btn btn-primary" id="save-recommendations-btn">Save Recommendations</button>
    </div>`;

    container.innerHTML = html;

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
    for (const group of Object.keys(SCREEN_GROUPS)) {
        if (!translationsData[group]) continue;
        updateGroupPreview(group);

        // Bind input listeners for all fields in this group
        for (const key of Object.keys(translationsData[group])) {
            for (const lang of LANGS) {
                const el = document.getElementById(`trans-${group}-${key}-${lang}`);
                if (el) el.addEventListener('input', () => updateGroupPreview(group));
            }
        }
    }

    // Lazy preview: only update expanded <details> sections on lang change
    onLangChange(() => {
        for (const group of Object.keys(SCREEN_GROUPS)) {
            if (!translationsData[group]) continue;
            const section = document.getElementById(`trans-preview-${group}`)?.closest('details');
            if (section && section.open) updateGroupPreview(group);
        }
    });

    // Update preview when a collapsed section is expanded
    for (const group of Object.keys(SCREEN_GROUPS)) {
        if (!translationsData[group]) continue;
        const details = document.getElementById(`trans-preview-${group}`)?.closest('details');
        if (details) {
            details.addEventListener('toggle', () => {
                if (details.open) updateGroupPreview(group);
            });
        }
    }
}

function updateGroupPreview(group) {
    const contentEl = document.getElementById(`trans-preview-${group}-content`);
    if (!contentEl) return;
    const template = PREVIEW_TEMPLATES[group];
    if (!template) { contentEl.innerHTML = ''; return; }

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

