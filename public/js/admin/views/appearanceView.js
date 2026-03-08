import { API_BASE, adminFetch } from '../api.js';
import { showSuccess, showError } from '../notifications.js';
import { fillAssetSelect, updateAssetPickerTrigger, initAssetPickerDropdown } from '../assetPickerUtils.js';
import { escapeHtml } from '../../utils/escapeHtml.js';
import { createAssetStager } from '../assetStaging.js';

let previewCancerTypes = [];
const appearanceStager = createAssetStager();
// Maps blob URL → tempId so we can look up the stager entry from select values
const blobToTempId = new Map();

const THEME_SCREENS = [
    { key: 'landing', label: 'Landing' },
    { key: 'cancerSelection', label: 'Cancer selection' },
    { key: 'onboarding', label: 'Onboarding' },
    { key: 'game', label: 'Game' },
    { key: 'results', label: 'Results' }
];

function getScreenPreviewUI(screenKey) {
    const ct = previewCancerTypes;
    const lang = 'en';
    const getName = c => c[`name_${lang}`] || c.name_en || c.name || c.id;
    const names = ct.slice(0, 3).map(getName);
    const cards = names.length > 0
        ? names.map(n => `<span class="preview-ui-card" style="width: auto; height: auto; padding: 4px 6px; font-size: 0.8em; text-align: center;">${escapeHtml(n)}</span>`).join('')
        : '<span class="preview-ui-card"></span><span class="preview-ui-card"></span><span class="preview-ui-card"></span>';
    const firstName = escapeHtml(names[0] || 'Assessment');
    const firstFamily = escapeHtml((ct[0] && (ct[0][`familyLabel_${lang}`] || ct[0].familyLabel_en)) || 'Family history?');
    const firstQuestion = 'Sample question text here?';

    const uis = {
        landing: `<div class="preview-ui preview-ui-landing"><h2 class="preview-ui-title">Cancer Risk Assessment</h2><p class="preview-ui-sub">Choose your assessment for personalized insights.</p><p class="preview-ui-prompt">Select your gender:</p><div class="preview-ui-gender"><span class="preview-ui-btn">\u2642 Male</span><span class="preview-ui-btn">\u2640 Female</span></div></div>`,
        cancerSelection: `<div class="preview-ui preview-ui-cancer"><span class="preview-ui-back">\u2190</span><h2 class="preview-ui-title">Choose Your Assessment</h2><p class="preview-ui-sub">Select the type of assessment.</p><div class="preview-ui-cards">${cards}</div></div>`,
        onboarding: `<div class="preview-ui preview-ui-onboarding"><h2 class="preview-ui-title">${firstName}</h2><p class="preview-ui-sub">Answer a few questions.</p><p class="preview-ui-label">1. What is your age?</p><p class="preview-ui-label">2. Ethnicity?</p><p class="preview-ui-label">3. ${firstFamily}</p><div class="preview-ui-actions"><span class="preview-ui-btn">Back</span><span class="preview-ui-btn primary">Start</span></div></div>`,
        game: `<div class="preview-ui preview-ui-game"><div class="preview-ui-progress"><div class="preview-ui-progress-fill"></div></div><span class="preview-ui-progress-txt">1 / 10</span><div class="preview-ui-card"><p class="preview-ui-question">${firstQuestion}</p></div><div class="preview-ui-targets"><span>NO</span><span>YES</span></div></div>`,
        results: `<div class="preview-ui preview-ui-results"><h2 class="preview-ui-title">Your Results</h2><h3 class="preview-ui-risk">MEDIUM RISK</h3><p class="preview-ui-summary">Your answers show your risk areas.</p><div class="preview-ui-recs">Recommendations placeholder</div></div>`
    };
    return uis[screenKey] || '';
}

function showMusicFilePreview(selectEl, objectUrl, fileName) {
    const labelEl = document.getElementById('appearance-preview-label');
    const emptyEl = document.getElementById('appearance-preview-empty');
    const imgEl = document.getElementById('appearance-preview-img');
    const screenWrap = document.getElementById('appearance-preview-screen-wrap');
    const audioWrap = document.getElementById('appearance-preview-audio-wrap');
    const audioEl = document.getElementById('appearance-preview-audio');
    const audioNameEl = document.getElementById('appearance-preview-audio-name');
    const previewCol = document.getElementById('appearance-preview-col');
    if (!previewCol || !audioWrap || !audioEl) return;
    const label = (selectEl && selectEl.dataset.previewLabel) ? selectEl.dataset.previewLabel + ' (preview)' : 'Music preview';
    if (labelEl) labelEl.textContent = label;
    if (emptyEl) emptyEl.style.display = 'none';
    if (imgEl) imgEl.style.display = 'none';
    if (screenWrap) screenWrap.style.display = 'none';
    audioEl.src = objectUrl;
    if (audioNameEl) audioNameEl.textContent = fileName || 'Selected file';
    audioWrap.style.display = 'block';
    previewCol.style.display = 'block';
}

function updateAppearancePreview(selectEl) {
    const labelEl = document.getElementById('appearance-preview-label');
    const emptyEl = document.getElementById('appearance-preview-empty');
    const imgEl = document.getElementById('appearance-preview-img');
    const screenWrap = document.getElementById('appearance-preview-screen-wrap');
    const screenBg = document.getElementById('appearance-preview-screen-bg');
    const screenUi = document.getElementById('appearance-preview-screen-ui');
    const audioWrap = document.getElementById('appearance-preview-audio-wrap');
    const audioEl = document.getElementById('appearance-preview-audio');
    const audioNameEl = document.getElementById('appearance-preview-audio-name');
    if (!selectEl || !labelEl) return;
    const label = selectEl.dataset.previewLabel || 'Selection';
    const type = (selectEl.dataset.previewType || 'image').toLowerCase();
    const path = (selectEl.value || '').trim();
    labelEl.textContent = label;
    imgEl.style.display = 'none';
    imgEl.removeAttribute('src');
    screenWrap.style.display = 'none';
    if (screenBg) { screenBg.style.backgroundImage = ''; screenBg.style.opacity = ''; }
    if (screenUi) screenUi.innerHTML = '';
    audioWrap.style.display = 'none';
    audioEl.removeAttribute('src');
    if (!path) {
        emptyEl.style.display = 'block';
        emptyEl.textContent = 'No selection';
        return;
    }
    emptyEl.style.display = 'none';
    if (type === 'screen-bg') {
        const screenKey = selectEl.dataset.screen || '';
        const opacityEl = document.getElementById(`theme-screen-${screenKey}-opacity`);
        const opacityPct = opacityEl ? Math.max(0, Math.min(100, Number(opacityEl.value))) : 100;
        const opacity = opacityPct / 100;
        if (screenBg) {
            screenBg.style.backgroundImage = `url('${path.replace(/'/g, "\\'")}')`;
            screenBg.style.opacity = String(opacity);
        }
        if (screenUi) screenUi.innerHTML = getScreenPreviewUI(screenKey);
        screenWrap.style.display = 'block';
    } else if (type === 'audio' || path.match(/\.(mp3|wav|ogg|m4a|aac|flac|webm|opus|wma)(\?|$)/i)) {
        audioEl.src = path;
        audioNameEl.textContent = path.split('/').pop();
        audioWrap.style.display = 'block';
    } else {
        imgEl.src = path;
        imgEl.style.display = 'block';
    }
}

function bindAppearancePreview() {
    const previewCol = document.getElementById('appearance-preview-col');
    if (previewCol) previewCol.style.display = 'block';
    document.querySelectorAll('#appearance-form .asset-select').forEach(selectEl => {
        const handler = () => updateAppearancePreview(selectEl);
        selectEl.removeEventListener('change', handler);
        selectEl.removeEventListener('focus', handler);
        selectEl.addEventListener('change', handler);
        selectEl.addEventListener('focus', handler);
    });
}

function getThemeSelectValue(id) {
    const el = document.getElementById(id);
    return (el && typeof el.value === 'string') ? el.value : '';
}

function getThemeOpacity(key) {
    const el = document.getElementById(`theme-screen-${key}-opacity`);
    if (!el || el.value === undefined || el.value === null) return 1;
    const n = Number(el.value);
    return Number.isFinite(n) ? Math.max(0, Math.min(1, n / 100)) : 1;
}

async function uploadPendingAssets() {
    const uploads = appearanceStager.getPendingUploads();
    const resolvedPaths = new Map(); // tempId → real server path
    for (const { tempId, file, folder } of uploads) {
        const blobUrl = appearanceStager.getBlobUrl(tempId);
        const formData = new FormData();
        formData.append('file', file);
        formData.append('folder', folder);
        const res = await adminFetch(`${API_BASE}/admin/assets/upload`, {
            method: 'POST',
            body: formData
        });
        const contentType = res.headers.get('content-type') || '';
        if (!contentType.includes('application/json')) {
            await res.text();
            throw new Error('Asset upload failed. Try a smaller file (max 10MB).');
        }
        const data = await res.json();
        resolvedPaths.set(blobUrl, data.path);
    }
    // Replace blob URLs with real paths in all selects
    if (resolvedPaths.size > 0) {
        document.querySelectorAll('#appearance-form .asset-select').forEach(sel => {
            if (resolvedPaths.has(sel.value)) {
                const realPath = resolvedPaths.get(sel.value);
                const opt = Array.from(sel.options).find(o => o.value === sel.value);
                if (opt) {
                    opt.value = realPath;
                    opt.textContent = realPath.split('/').pop();
                }
                sel.value = realPath;
                updateAssetPickerTrigger(sel);
            }
        });
    }
}

async function executePendingDeletes() {
    const deletes = appearanceStager.getPendingDeletes();
    for (const path of deletes) {
        await adminFetch(`${API_BASE}/admin/assets`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ path })
        });
    }
}

async function saveTheme() {
    const btn = document.getElementById('theme-save-btn');
    btn.disabled = true;
    btn.textContent = 'Saving...';
    try {
        // Upload any staged files and resolve blob URLs to real paths
        await uploadPendingAssets();
        // Execute any staged deletions
        await executePendingDeletes();

        const theme = {
            mascotMale: getThemeSelectValue('theme-mascot-male'),
            mascotFemale: getThemeSelectValue('theme-mascot-female'),
            mascotMaleGood: getThemeSelectValue('theme-mascot-male-good'),
            mascotFemaleGood: getThemeSelectValue('theme-mascot-female-good'),
            mascotMaleShocked: getThemeSelectValue('theme-mascot-male-shocked'),
            mascotFemaleShocked: getThemeSelectValue('theme-mascot-female-shocked'),
            screens: {}
        };
        THEME_SCREENS.forEach(({ key }) => {
            theme.screens[key] = {
                backgroundImage: getThemeSelectValue(`theme-screen-${key}-bg`),
                backgroundMusic: getThemeSelectValue(`theme-screen-${key}-music`),
                backgroundOpacity: getThemeOpacity(key)
            };
        });
        const res = await adminFetch(`${API_BASE}/admin/theme`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(theme)
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.error);
        appearanceStager.reset();
        blobToTempId.clear();
        showSuccess('Theme saved.');
    } catch (err) {
        showError(err.message);
    } finally {
        btn.disabled = false;
        btn.textContent = 'Save theme';
    }
}

export async function loadAppearance() {
    // Reset any pending staged uploads/deletes from previous edit session
    appearanceStager.reset();
    blobToTempId.clear();

    const loading = document.getElementById('appearance-loading');
    const form = document.getElementById('appearance-form');
    const errEl = document.getElementById('appearance-error');
    loading.style.display = 'block';
    form.style.display = 'none';
    errEl.style.display = 'none';

    try {
        const [themeRes, assetsRes, ctRes] = await Promise.all([
            adminFetch(`${API_BASE}/admin/theme`),
            adminFetch(`${API_BASE}/admin/assets`),
            adminFetch(`${API_BASE}/admin/cancer-types`).catch(() => null)
        ]);
        if (ctRes && ctRes.ok) {
            const ctData = await ctRes.json();
            previewCancerTypes = (ctData.success ? ctData.data : ctData) || [];
        }
        const theme = themeRes.ok ? await themeRes.json() : { screens: {}, mascotMale: '', mascotFemale: '', mascotMaleGood: '', mascotFemaleGood: '', mascotMaleShocked: '', mascotFemaleShocked: '' };
        const assets = assetsRes.ok ? await assetsRes.json() : { paths: [], backgrounds: [], mascots: [], music: [] };
        const bgList = assets.backgrounds || assets.paths || [];
        const mascotList = assets.mascots || assets.paths || [];
        const musicList = assets.music || assets.paths || [];

        fillAssetSelect(document.getElementById('theme-mascot-male'), mascotList, theme.mascotMale);
        fillAssetSelect(document.getElementById('theme-mascot-female'), mascotList, theme.mascotFemale);
        fillAssetSelect(document.getElementById('theme-mascot-male-good'), mascotList, theme.mascotMaleGood);
        fillAssetSelect(document.getElementById('theme-mascot-female-good'), mascotList, theme.mascotFemaleGood);
        fillAssetSelect(document.getElementById('theme-mascot-male-shocked'), mascotList, theme.mascotMaleShocked);
        fillAssetSelect(document.getElementById('theme-mascot-female-shocked'), mascotList, theme.mascotFemaleShocked);

        const container = document.getElementById('theme-screens-container');
        container.innerHTML = '';
        THEME_SCREENS.forEach(({ key, label }) => {
            const s = (theme.screens && theme.screens[key]) || {};
            const row = document.createElement('div');
            row.className = 'theme-screen-row appearance-screen-card';
            row.innerHTML = `
                <h4 class="appearance-screen-card-title">${label}</h4>
                <div class="form-group">
                    <label>Background image</label>
                    <div class="asset-picker-row">
                        <select id="theme-screen-${key}-bg" class="asset-select" data-screen="${key}" data-field="backgroundImage" data-preview-label="${label} \u2014 Background" data-preview-type="screen-bg"></select>
                        <button type="button" class="btn btn-secondary btn-upload-asset" data-folder="backgrounds" data-target="theme-screen-${key}-bg">Upload</button>
                        <input type="file" class="asset-file-input" data-folder="backgrounds" data-target="theme-screen-${key}-bg" accept="image/*" style="display: none;">
                    </div>
                </div>
                <div class="form-group">
                    <label>Background transparency</label>
                    <div class="opacity-slider-row">
                        <input type="range" id="theme-screen-${key}-opacity" class="opacity-slider" min="0" max="100" value="100" data-screen="${key}">
                        <span id="theme-screen-${key}-opacity-value" class="opacity-value">100%</span>
                    </div>
                </div>
                <div class="form-group">
                    <label>Background music</label>
                    <div class="asset-picker-row">
                        <select id="theme-screen-${key}-music" class="asset-select" data-screen="${key}" data-field="backgroundMusic" data-preview-label="${label} \u2014 Music" data-preview-type="audio"></select>
                        <button type="button" class="btn btn-secondary btn-upload-asset" data-folder="music" data-target="theme-screen-${key}-music">Upload</button>
                        <input type="file" class="asset-file-input" data-folder="music" data-target="theme-screen-${key}-music" accept="audio/*,.mp3,.wav,.ogg,.m4a,.aac,.flac,.webm,.opus,.wma" style="display: none;">
                    </div>
                </div>
            `;
            container.appendChild(row);
            fillAssetSelect(document.getElementById(`theme-screen-${key}-bg`), bgList, s.backgroundImage);
            fillAssetSelect(document.getElementById(`theme-screen-${key}-music`), musicList, s.backgroundMusic);
            const opacityVal = typeof (s.backgroundOpacity) === 'number' ? Math.round(s.backgroundOpacity * 100) : 100;
            const opacityInput = document.getElementById(`theme-screen-${key}-opacity`);
            const opacityValueSpan = document.getElementById(`theme-screen-${key}-opacity-value`);
            if (opacityInput) { opacityInput.value = opacityVal; opacityInput.addEventListener('input', function () { opacityValueSpan.textContent = this.value + '%'; updateAppearancePreview(document.getElementById(`theme-screen-${key}-bg`)); }); }
            if (opacityValueSpan) opacityValueSpan.textContent = opacityVal + '%';
        });

        // Upload buttons
        document.querySelectorAll('.btn-upload-asset').forEach(btn => {
            btn.onclick = () => {
                const target = btn.dataset.target;
                const input = document.querySelector(`.asset-file-input[data-target="${target}"]`);
                if (input) input.click();
            };
        });
        document.querySelectorAll('.asset-file-input').forEach(input => {
            input.onchange = () => {
                const file = input.files && input.files[0];
                if (!file) return;
                const folder = input.dataset.folder || 'backgrounds';
                const targetId = input.dataset.target;
                const selectEl = document.getElementById(targetId);
                if (!selectEl) return;
                // Stage the file client-side — no server upload until save
                const tempId = appearanceStager.stageUpload(file, folder);
                const blobUrl = appearanceStager.getBlobUrl(tempId);
                blobToTempId.set(blobUrl, tempId);
                const opt = document.createElement('option');
                opt.value = blobUrl;
                opt.textContent = file.name;
                selectEl.appendChild(opt);
                selectEl.value = blobUrl;
                updateAssetPickerTrigger(selectEl);
                if (folder === 'music') {
                    showMusicFilePreview(selectEl, blobUrl, file.name);
                } else {
                    updateAppearancePreview(selectEl);
                }
                input.value = '';
            };
        });

        document.getElementById('theme-save-btn').onclick = saveTheme;
        document.querySelectorAll('#appearance-form .asset-select').forEach(sel => initAssetPickerDropdown(sel, {
            stager: appearanceStager,
            onDelete: (path) => {
                document.querySelectorAll('#appearance-form .asset-select').forEach(s => {
                    const o = Array.from(s.options).find(op => op.value === path);
                    if (o) o.remove();
                    if (s.value === path) { s.value = ''; updateAssetPickerTrigger(s); }
                });
                updateAppearancePreview(sel);
            },
            onChange: (s) => updateAppearancePreview(s)
        }));
        bindAppearancePreview();
        loading.style.display = 'none';
        form.style.display = 'block';
        const selects = document.querySelectorAll('#appearance-form .asset-select');
        const firstWithValue = Array.from(selects).find(s => (s.value || '').trim());
        updateAppearancePreview(firstWithValue || selects[0]);
    } catch (err) {
        loading.style.display = 'none';
        errEl.textContent = 'Error: ' + err.message;
        errEl.style.display = 'block';
    }
}

window.loadAppearance = loadAppearance;
