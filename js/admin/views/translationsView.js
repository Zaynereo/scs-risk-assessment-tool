import { API_BASE, adminFetch } from '../api.js';
import { showSuccess, showError } from '../notifications.js';

const SCREEN_GROUPS = {
    landing: 'Landing Screen',
    cancerSelection: 'Cancer Selection Screen',
    onboarding: 'Onboarding Screen',
    game: 'Game Screen',
    results: 'Results Screen',
    common: 'Common / Shared'
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

        renderForm(form);
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

    // UI Translations sections
    for (const [group, label] of Object.entries(SCREEN_GROUPS)) {
        const keys = translationsData[group];
        if (!keys) continue;
        html += `<details class="translations-section" open>
            <summary class="translations-section-header">${esc(label)}</summary>
            <div class="translations-section-body">`;

        for (const [key, langs] of Object.entries(keys)) {
            html += renderLangFields(`trans-${group}-${key}`, key, langs);
        }
        html += `</div></details>`;
    }

    html += `<div style="margin-top: 16px;">
        <button type="button" class="btn btn-primary" id="save-translations-btn">Save Translations</button>
    </div>`;

    // Recommendations section
    html += `<hr style="margin: 32px 0;">
        <h3 style="margin-bottom: 16px;">Recommendations</h3>
        <p style="color: var(--color-light-text); margin-bottom: 16px;">
            Edit the recommendation titles and action items shown on the results screen.
        </p>`;

    for (const [category, rec] of Object.entries(recommendationsData)) {
        html += `<details class="translations-section">
            <summary class="translations-section-header">${esc(rec.title?.en || category)}</summary>
            <div class="translations-section-body">`;
        html += `<label style="font-weight:600; margin-bottom:8px; display:block;">Title</label>`;
        html += renderLangFields(`rec-${category}-title`, 'title', rec.title || {});

        if (Array.isArray(rec.actions)) {
            rec.actions.forEach((action, i) => {
                html += `<label style="font-weight:600; margin-bottom:8px; display:block; margin-top:12px;">Action ${i + 1}</label>`;
                html += renderLangFields(`rec-${category}-action-${i}`, `action ${i + 1}`, action);
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

function renderLangFields(prefix, label, langObj) {
    let html = `<div class="form-group" style="margin-bottom: 12px;">
        <label style="font-size: 0.85rem; color: var(--color-light-text);">${esc(label)}</label>
        <div class="lang-fields-grid">`;
    for (const lang of LANGS) {
        const val = (langObj && langObj[lang]) || '';
        const isLong = val.length > 60;
        if (isLong) {
            html += `<div class="lang-field">
                <textarea id="${esc(prefix)}-${lang}" rows="3">${esc(val)}</textarea>
                <span class="lang-label">${LANG_LABELS[lang]}</span>
            </div>`;
        } else {
            html += `<div class="lang-field">
                <input type="text" id="${esc(prefix)}-${lang}" value="${esc(val)}">
                <span class="lang-label">${LANG_LABELS[lang]}</span>
            </div>`;
        }
    }
    html += `</div></div>`;
    return html;
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

function esc(str) {
    if (typeof str !== 'string') return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
