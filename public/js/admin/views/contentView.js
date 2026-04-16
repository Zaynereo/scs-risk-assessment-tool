import { invalidateTab } from '../router.js';
import { API_BASE, adminFetch } from '../api.js';
import { showSuccess, showError } from '../notifications.js';
import { fillAssetSelect, updateAssetPickerTrigger, initAssetPickerDropdown } from '../assetPickerUtils.js';
import { escapeHtml } from '../../utils/escapeHtml.js';
import { openModalA11y, closeModalA11y } from '../../utils/modal.js';
import { initLangTabs, getActiveLang, onLangChange, clearLangChangeListeners, validateEnglishFields } from '../langTabs.js';
import { createAssetStager } from '../assetStaging.js';
import {
    currentCancerType, setCurrentCancerType,
    currentAssignments, setCurrentAssignments,
    questionBank, clearQuestionBank,
    allCancerTypes, setAllCancerTypes,
    isNewCancerType, setIsNewCancerType
} from '../state.js';

// ==================== RECOMMENDATIONS STATE ====================
let currentRecommendations = [];

let cardImageStager = createAssetStager();

function bindCancerTypePreview() {
    const lang = getActiveLang();
    function update() {
        const l = getActiveLang();
        const nameEl = document.getElementById(`ct-name-${l}`);
        const descEl = document.getElementById(`ct-desc-${l}`);
        const famEl = document.getElementById(`ct-family-${l}`);
        const iconVal = document.getElementById('ct-icon')?.value || '';
        const previewIcon = document.getElementById('ct-preview-icon');
        if (previewIcon) {
            previewIcon.textContent = '';
            if (iconVal) {
                const img = document.createElement('img');
                img.src = iconVal;
                img.alt = '';
                previewIcon.appendChild(img);
            }
        }
        const previewName = document.getElementById('ct-preview-name');
        if (previewName) previewName.textContent = nameEl?.value || 'Cancer Name';
        const previewDesc = document.getElementById('ct-preview-desc');
        if (previewDesc) previewDesc.textContent = descEl?.value || 'Description text';
        const previewFam = document.getElementById('ct-preview-family');
        if (previewFam) previewFam.textContent = famEl?.value || 'Family history question?';
    }
    const langs = ['en', 'zh', 'ms', 'ta'];
    langs.forEach(l => {
        ['ct-name-', 'ct-desc-', 'ct-family-'].forEach(prefix => {
            const el = document.getElementById(prefix + l);
            if (el) el.addEventListener('input', update);
        });
    });
    const iconEl = document.getElementById('ct-icon');
    if (iconEl) {
        const obs = new MutationObserver(update);
        obs.observe(iconEl, { attributes: true, attributeFilter: ['value'] });
        iconEl.addEventListener('change', update);
    }
    onLangChange(update);
    update();
}

function bindQuestionPreview(prefix) {
    function update() {
        const l = getActiveLang();
        const promptEl = document.getElementById(`${prefix}-prompt-${l}`);
        const bankTextEl = document.getElementById(`${prefix}-bank-text-${l}`);
        const expYesEl = document.getElementById(`${prefix}-expYes-${l}`);
        const expNoEl = document.getElementById(`${prefix}-expNo-${l}`);
        const pp = document.getElementById(`${prefix}-preview-prompt`);
        if (pp) pp.textContent = promptEl?.value || bankTextEl?.textContent || 'Question text?';
        const py = document.getElementById(`${prefix}-preview-expYes`);
        if (py) py.textContent = expYesEl?.value || 'Explanation text';
        const pn = document.getElementById(`${prefix}-preview-expNo`);
        if (pn) pn.textContent = expNoEl?.value || 'Explanation text';
    }
    const langs = ['en', 'zh', 'ms', 'ta'];
    langs.forEach(l => {
        [`${prefix}-prompt-`, `${prefix}-expYes-`, `${prefix}-expNo-`].forEach(p => {
            const el = document.getElementById(p + l);
            if (el) el.addEventListener('input', update);
        });
    });
    onLangChange(update);
    update();
}

/**
 * Read onboarding budget values from the live form fields.
 * Falls back to the saved cancerType object if fields aren't in the DOM.
 * Ethnicity values are direct percentages (e.g. 2 = 2%).
 */
function getOnboardingBudget(cancerType) {
    const familyEl = document.getElementById('ct-family-weight');
    const ageEl = document.getElementById('ct-age-weight');
    const familyWeight = familyEl ? (parseFloat(familyEl.value) || 0) : (parseFloat(cancerType?.familyWeight) || 0);
    const ageWeight = ageEl ? (parseFloat(ageEl.value) || 0) : (parseFloat(cancerType?.ageRiskWeight) || 0);

    const ethIds = ['ct-eth-chinese', 'ct-eth-malay', 'ct-eth-indian', 'ct-eth-caucasian', 'ct-eth-others'];
    const ethKeys = ['ethnicityRisk_chinese', 'ethnicityRisk_malay', 'ethnicityRisk_indian', 'ethnicityRisk_caucasian', 'ethnicityRisk_others'];
    let maxEthWeight = 0;
    for (let i = 0; i < ethIds.length; i++) {
        const el = document.getElementById(ethIds[i]);
        const ethWeight = el ? (parseFloat(el.value) || 0) : (parseFloat(cancerType?.[ethKeys[i]]) || 0);
        if (ethWeight > maxEthWeight) maxEthWeight = ethWeight;
    }

    return { familyWeight, ageWeight, maxEthWeight, total: familyWeight + ageWeight + maxEthWeight };
}

/**
 * Calculate the quiz weight target for a cancer type.
 * Total budget is 100%, shared between quiz questions and onboarding factors.
 */
function getQuizWeightTarget(cancerType) {
    if (!cancerType) return 100;
    return 100 - getOnboardingBudget(cancerType).total;
}

/**
 * Pure variant of getQuizWeightTarget that reads only the cancer-type object
 * (no DOM). Used when deriving per-target quiz budgets for OTHER cancers on
 * the Generic editor — the open editor's form fields belong to `generic` and
 * must not drive another cancer's target.
 */
/**
 * Render the Generic editor's per-target weight summary into `innerEl`.
 * One row per target cancer, each with a progress bar whose fill reflects
 * current / target. Green = exact match, red = under, amber = over.
 * Built with DOM APIs (not innerHTML) so admin-editable cancer names can never
 * inject markup.
 */
function renderGenericWeightSummary(innerEl) {
    const byTarget = {};
    currentAssignments.forEach(a => {
        const target = (a.targetCancerType || '').toLowerCase().trim();
        if (!target) return;
        if (!byTarget[target]) byTarget[target] = 0;
        byTarget[target] += parseFloat(a.weight) || 0;
    });

    const targets = Object.entries(byTarget).map(([targetId, sum]) => {
        const ct = (allCancerTypes || []).find(c => (c.id || '').toLowerCase() === targetId);
        const quizTargetForGroup = ct ? getSavedQuizWeightTargetFor(ct) : 100;
        const isValid = Math.round(sum * 100) === Math.round(quizTargetForGroup * 100);
        const name = ct?.name_en || targetId;
        const diff = +(quizTargetForGroup - sum).toFixed(2);
        let state, hintText = '';
        if (isValid) {
            state = 'valid';
        } else if (diff > 0) {
            state = 'under';
            hintText = `Need ${diff}% more`;
        } else {
            state = 'over';
            hintText = `Reduce by ${Math.abs(diff)}%`;
        }
        return { sum, quizTargetForGroup, isValid, state, name, hintText };
    });

    const allValid = targets.length === 0 || targets.every(t => t.isValid);

    innerEl.replaceChildren();

    // Header
    const header = document.createElement('div');
    header.style.marginBottom = '10px';
    const headerStrong = document.createElement('strong');
    headerStrong.textContent = 'Quiz weights by target cancer';
    header.appendChild(headerStrong);
    const headerNote = document.createElement('span');
    headerNote.style.fontSize = '0.85rem';
    headerNote.style.color = 'var(--color-light-text)';
    headerNote.textContent = ' (each target uses its own cancer\u2019s demographic budget)';
    header.appendChild(headerNote);
    innerEl.appendChild(header);

    // Body
    if (targets.length === 0) {
        const empty = document.createElement('div');
        empty.style.color = 'var(--color-light-text)';
        empty.style.fontSize = '0.9rem';
        empty.textContent = 'No target cancers yet';
        innerEl.appendChild(empty);
    } else {
        // Color palette — valid green, under red, over amber.
        const PALETTE = {
            valid: { fill: '#2e7d32', text: '#2e7d32', icon: '\u2713' },
            under: { fill: '#c62828', text: '#c62828', icon: '\u26A0' },
            over:  { fill: '#f57c00', text: '#f57c00', icon: '\u26A0' }
        };

        const list = document.createElement('div');
        list.style.display = 'grid';
        list.style.gridTemplateColumns = 'minmax(140px, auto) 1fr auto auto';
        list.style.columnGap = '12px';
        list.style.rowGap = '8px';
        list.style.alignItems = 'center';
        list.style.fontSize = '0.9rem';

        for (const t of targets) {
            const palette = PALETTE[t.state];
            // Fill ratio: under = sum/target (clamp 0..100), over = 100 full.
            const rawRatio = t.quizTargetForGroup > 0 ? (t.sum / t.quizTargetForGroup) * 100 : 0;
            const fillPct = Math.max(0, Math.min(100, rawRatio));

            // Column 1: cancer name
            const nameCell = document.createElement('div');
            const strong = document.createElement('strong');
            strong.textContent = t.name;
            nameCell.appendChild(strong);
            list.appendChild(nameCell);

            // Column 2: progress bar
            const barWrap = document.createElement('div');
            barWrap.style.background = 'var(--color-bg-secondary)';
            barWrap.style.borderRadius = '4px';
            barWrap.style.height = '10px';
            barWrap.style.overflow = 'hidden';
            barWrap.style.border = '1px solid var(--color-border)';
            barWrap.setAttribute('role', 'progressbar');
            barWrap.setAttribute('aria-valuemin', '0');
            barWrap.setAttribute('aria-valuemax', String(t.quizTargetForGroup));
            barWrap.setAttribute('aria-valuenow', String(Math.round(t.sum * 100) / 100));
            barWrap.setAttribute('aria-label', `${t.name} quiz weight`);
            const fill = document.createElement('div');
            fill.style.height = '100%';
            fill.style.width = `${fillPct}%`;
            fill.style.background = palette.fill;
            fill.style.transition = 'width 120ms ease-out';
            barWrap.appendChild(fill);
            list.appendChild(barWrap);

            // Column 3: numeric current / target
            const numbers = document.createElement('div');
            numbers.style.color = 'var(--color-light-text)';
            numbers.style.fontVariantNumeric = 'tabular-nums';
            numbers.style.whiteSpace = 'nowrap';
            numbers.textContent = `${t.sum.toFixed(t.sum % 1 ? 2 : 0)} / ${t.quizTargetForGroup}`;
            list.appendChild(numbers);

            // Column 4: status icon + hint (hint only when invalid)
            const statusCell = document.createElement('div');
            statusCell.style.color = palette.text;
            statusCell.style.fontWeight = '600';
            statusCell.style.whiteSpace = 'nowrap';
            statusCell.textContent = t.isValid ? palette.icon : `${palette.icon} ${t.hintText}`;
            list.appendChild(statusCell);
        }

        innerEl.appendChild(list);
    }

    // Footer summary
    const status = document.createElement('div');
    status.id = 'weight-status';
    status.style.fontWeight = '600';
    status.style.marginTop = '12px';
    status.style.color = allValid ? '#2e7d32' : 'var(--color-risk-high)';
    status.textContent = allValid ? '\u2713 All targets valid' : '\u26A0 One or more targets need adjustment';
    innerEl.appendChild(status);
}

function getSavedQuizWeightTargetFor(ct) {
    if (!ct) return 100;
    const fam = parseFloat(ct.familyWeight) || 0;
    const age = parseFloat(ct.ageRiskWeight) || 0;
    const ethKeys = ['ethnicityRisk_chinese', 'ethnicityRisk_malay', 'ethnicityRisk_indian', 'ethnicityRisk_caucasian', 'ethnicityRisk_others'];
    let maxEth = 0;
    for (const k of ethKeys) {
        const v = parseFloat(ct[k]) || 0;
        if (v > maxEth) maxEth = v;
    }
    return 100 - fam - age - maxEth;
}

// ==================== CACHES ====================

export async function loadQuestionBankCache() {
    try {
        const response = await adminFetch(`${API_BASE}/admin/question-bank`);
        const result = await response.json();
        if (result.success && result.data) {
            clearQuestionBank();
            result.data.forEach(q => {
                questionBank.set(q.id, q);
            });
        }
    } catch (err) {
        console.error('Failed to load question bank cache:', err);
    }
}

export async function loadCancerTypesCache() {
    try {
        const response = await adminFetch(`${API_BASE}/admin/cancer-types`);
        const result = await response.json();
        if (result.success && result.data) {
            setAllCancerTypes(result.data);
        }
    } catch (err) {
        console.error('Failed to load cancer types cache:', err);
    }
}

// ==================== CANCER TYPES ====================

export async function loadCancerTypes() {
    const loading = document.getElementById('content-loading');
    const grid = document.getElementById('cancer-types-grid');
    const error = document.getElementById('content-error');

    loading.style.display = 'block';
    grid.style.display = 'none';
    error.style.display = 'none';

    try {
        const response = await adminFetch(`${API_BASE}/admin/cancer-types`);
        const result = await response.json();

        if (!result.success) throw new Error(result.error);

        renderCancerTypeCards(result.data);
        loading.style.display = 'none';
        grid.style.display = 'grid';
    } catch (err) {
        loading.style.display = 'none';
        error.textContent = `Error: ${err.message}`;
        error.style.display = 'block';
    }
}

function renderCancerTypeCards(cancerTypes) {
    const grid = document.getElementById('cancer-types-grid');

    let html = cancerTypes.map((ct, idx) => {
        const isGeneric = (ct.id || '').toLowerCase() === 'generic';
        const targetCount = ct.targetCount != null ? ct.targetCount : Object.keys(ct.weightByTarget || {}).length;
        const summaryLine = isGeneric ? `${ct.questionCount} questions \u00b7 ${targetCount} cancers` : `${ct.questionCount} questions \u00b7 ${ct.totalWeight}% weight`;
        const isImg = ct.icon && (ct.icon.startsWith('http') || ct.icon.startsWith('/') || ct.icon.startsWith('data:') || ct.icon.startsWith('assets/'));
        const iconEsc = (ct.icon || '').replace(/"/g, '&quot;').replace(/</g, '&lt;');
        const iconOrImg = isImg
            ? '<div class="card-icon card-icon-img"><img src="' + iconEsc + '" alt="" class="card-icon-img-el"><span class="card-icon-fallback" style="display:none">\uD83C\uDFE5</span></div>'
            : `<div class="card-icon">${(ct.icon || '\uD83C\uDFE5').replace(/</g, '&lt;')}</div>`;
        const isFirst = idx === 0;
        const isLast = idx === cancerTypes.length - 1;
        const hiddenClass = ct.visible === false ? ' ct-hidden' : '';
        const hiddenBadge = ct.visible === false ? '<div class="ct-hidden-badge">Hidden</div>' : '';
        return `
        <div class="cancer-type-card${hiddenClass}" draggable="true" data-ct-id="${escapeHtml(ct.id)}" data-action="open-editor" tabindex="-1">
            <div class="card-header">
                ${iconOrImg}
                <div class="card-header-actions">
                    <div class="card-toggle" data-action="toggle-visible" data-ct-id="${escapeHtml(ct.id)}" title="${ct.visible === false ? 'Show to participants' : 'Hide from participants'}">
                        <label class="toggle-switch">
                            <input type="checkbox" ${ct.visible !== false ? 'checked' : ''}>
                            <span class="toggle-slider"></span>
                        </label>
                    </div>
                    <div class="reorder-btns">
                        <button class="reorder-btn" data-action="move-up" data-ct-id="${escapeHtml(ct.id)}" title="Move up" ${isFirst ? 'disabled' : ''}>&uarr;</button>
                        <button class="reorder-btn" data-action="move-down" data-ct-id="${escapeHtml(ct.id)}" title="Move down" ${isLast ? 'disabled' : ''}>&darr;</button>
                    </div>
                    <button class="delete-btn" data-action="delete-ct" data-ct-id="${escapeHtml(ct.id)}" data-ct-name="${escapeHtml(ct.name_en || ct.id)}" title="Delete cancer type">
                        \uD83D\uDDD1\uFE0F
                    </button>
                </div>
            </div>
            <div class="card-title">${escapeHtml(ct.name_en || ct.id)}</div>
            ${hiddenBadge}
            <div class="card-stats">${escapeHtml(summaryLine)}</div>
            <div class="card-status ${ct.isValid ? 'valid' : 'invalid'}">
                ${ct.isValid ? '\u2713 Valid' : '\u26A0 Needs adjustment'}
            </div>
        </div>
    `;
    }).join('');

    html += `
        <div class="cancer-type-card add-cancer-type-card" data-action="new-editor" tabindex="-1">
            <div class="add-icon">+</div>
            <div class="add-text">Add Cancer Type</div>
        </div>
    `;

    grid.innerHTML = html; // escaped values — safe
    grid.querySelectorAll('img.card-icon-img-el').forEach(img => {
        img.addEventListener('error', function () {
            this.style.display = 'none';
            const fallback = this.nextElementSibling;
            if (fallback) fallback.style.display = 'inline';
        }, { once: true });
    });
    // Store current order for reordering
    grid._cancerTypeOrder = cancerTypes.map(ct => ct.id);

    // Set up drag-and-drop
    initCardDragAndDrop(grid);

    // Event delegation for card actions (replaces inline onclick)
    if (!grid._delegateAttached) {
        grid._delegateAttached = true;
        grid.addEventListener('click', (e) => {
            const actionEl = e.target.closest('[data-action]');
            if (!actionEl) return;
            const action = actionEl.dataset.action;
            const ctId = actionEl.dataset.ctId;
            switch (action) {
                case 'open-editor': {
                    const card = actionEl.closest('.cancer-type-card');
                    if (card) card.classList.add('ct-loading');
                    openCancerTypeEditor(ctId, card).finally(() => {
                        if (card) card.classList.remove('ct-loading');
                    });
                    break;
                }
                case 'new-editor': {
                    const card = actionEl.closest('.cancer-type-card');
                    openNewCancerTypeEditor(card);
                    break;
                }
                case 'move-up': e.stopPropagation(); moveCancerType(ctId, -1); break;
                case 'move-down': e.stopPropagation(); moveCancerType(ctId, 1); break;
                case 'delete-ct': e.stopPropagation(); deleteCancerType(ctId, actionEl.dataset.ctName); break;
                case 'toggle-visible': {
                    e.stopPropagation();
                    // The click reaches the grid before the inner label's activation behavior runs
                    // (which would dispatch a synthetic click to the input and toggle it). Calling
                    // preventDefault() here cancels that activation behavior entirely, so we take
                    // full control: invert the checkbox manually and make exactly one API call.
                    e.preventDefault();
                    const checkbox = actionEl.querySelector('input[type="checkbox"]');
                    const newVisible = !checkbox.checked;
                    checkbox.checked = newVisible;
                    toggleCancerTypeVisibility(ctId, newVisible);
                    break;
                }
            }
        });
    }
}

// ==================== DRAG AND DROP ====================

function initCardDragAndDrop(grid) {
    let draggedCard = null;

    const draggableCards = grid.querySelectorAll('.cancer-type-card[draggable="true"]');

    draggableCards.forEach(card => {
        card.addEventListener('dragstart', (e) => {
            draggedCard = card;
            card.classList.add('dragging');
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', card.dataset.ctId);
        });

        card.addEventListener('dragend', () => {
            draggedCard = null;
            card.classList.remove('dragging');
            grid.querySelectorAll('.cancer-type-card').forEach(c => c.classList.remove('drag-over'));
        });

        card.addEventListener('dragover', (e) => {
            e.preventDefault();
            if (!draggedCard || draggedCard === card) return;
            e.dataTransfer.dropEffect = 'move';
            // Clear all drag-over states, then set on this card
            grid.querySelectorAll('.cancer-type-card').forEach(c => c.classList.remove('drag-over'));
            card.classList.add('drag-over');
        });

        card.addEventListener('dragleave', () => {
            card.classList.remove('drag-over');
        });

        card.addEventListener('drop', (e) => {
            e.preventDefault();
            card.classList.remove('drag-over');
            if (!draggedCard || draggedCard === card) return;

            const fromId = draggedCard.dataset.ctId;
            const toId = card.dataset.ctId;
            if (!fromId || !toId) return;

            // Reorder: move fromId to toId's position
            const order = [...(grid._cancerTypeOrder || [])];
            const fromIdx = order.indexOf(fromId);
            const toIdx = order.indexOf(toId);
            if (fromIdx < 0 || toIdx < 0) return;

            // Remove from old position, insert at new position
            order.splice(fromIdx, 1);
            order.splice(toIdx, 0, fromId);

            saveReorder(order);
        });
    });
}

async function saveReorder(orderedIds) {
    try {
        await adminFetch(`${API_BASE}/admin/cancer-types/reorder`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ orderedIds })
        });
        loadCancerTypes();
    } catch (err) {
        showError(`Failed to reorder: ${err.message}`);
    }
}

async function toggleCancerTypeVisibility(id, visible) {
    try {
        const response = await adminFetch(`${API_BASE}/admin/cancer-types/${id}/visibility`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ visible })
        });
        const result = await response.json();
        if (!result.success) throw new Error(result.error);
        showSuccess(`Cancer type ${visible ? 'visible' : 'hidden'}`);
        invalidateTab('question-bank');
        loadCancerTypes();
    } catch (err) {
        showError(err.message);
        loadCancerTypes();
    }
}

async function moveCancerType(id, direction) {
    const grid = document.getElementById('cancer-types-grid');
    const order = grid._cancerTypeOrder;
    if (!order) return;

    const idx = order.indexOf(id);
    if (idx < 0) return;
    const newIdx = idx + direction;
    if (newIdx < 0 || newIdx >= order.length) return;

    // Swap
    const newOrder = [...order];
    [newOrder[idx], newOrder[newIdx]] = [newOrder[newIdx], newOrder[idx]];

    saveReorder(newOrder);
}

export function openNewCancerTypeEditor(triggerEl = null) {
    setIsNewCancerType(true);
    setCurrentCancerType(null);
    setCurrentAssignments([]);

    document.getElementById('ct-id').value = '';
    document.getElementById('ct-id').disabled = false;
    document.getElementById('ct-icon').value = '';
    document.getElementById('ct-icon-preview').innerHTML = '';
    initCtIconAssetPicker('');
    document.getElementById('ct-name-en').value = '';
    document.getElementById('ct-name-zh').value = '';
    document.getElementById('ct-name-ms').value = '';
    document.getElementById('ct-name-ta').value = '';
    document.getElementById('ct-desc-en').value = '';
    document.getElementById('ct-desc-zh').value = '';
    document.getElementById('ct-desc-ms').value = '';
    document.getElementById('ct-desc-ta').value = '';
    document.getElementById('ct-family-en').value = '';
    document.getElementById('ct-family-zh').value = '';
    document.getElementById('ct-family-ms').value = '';
    document.getElementById('ct-family-ta').value = '';
    document.getElementById('ct-family-weight').value = '10';
    document.getElementById('ct-gender-filter').value = 'all';
    document.getElementById('ct-age-threshold').value = '0';
    document.getElementById('ct-age-weight').value = '0';
    document.getElementById('ct-eth-chinese').value = '0';
    document.getElementById('ct-eth-malay').value = '0';
    document.getElementById('ct-eth-indian').value = '0';
    document.getElementById('ct-eth-caucasian').value = '0';
    document.getElementById('ct-eth-others').value = '0';
    const ctVisibleEl = document.getElementById('ct-visible');
    if (ctVisibleEl) ctVisibleEl.checked = false;
    const ctVisibleLabel = document.getElementById('ct-visible-label');
    if (ctVisibleLabel) ctVisibleLabel.textContent = 'Hidden';

    document.getElementById('cancer-type-modal-title').textContent = 'Add Cancer Type';
    document.getElementById('questions-container').innerHTML = '';
    updateQuestionsCount();
    updateTotalWeight();
    renderOnboardingBudgetSummary();
    attachOnboardingFieldListeners();

    // Initialize empty recommendations
    currentRecommendations = [];
    renderRecommendationsEditor();
    initRecommendationsListeners();

    document.getElementById('target-cancer-group').style.display = 'none';
    const ctModal = document.getElementById('cancer-type-modal');
    ctModal.classList.add('active');
    openModalA11y(ctModal, { triggerEl, onEscape: closeModal });
    initCollapsibleSections();
    clearLangChangeListeners();
    initLangTabs('#cancer-type-modal');
    bindCancerTypePreview();
}

export async function openCancerTypeEditor(id, triggerEl = null) {
    setIsNewCancerType(false);

    try {
        const ctResponse = await adminFetch(`${API_BASE}/admin/cancer-types/${id}`);
        const ctResult = await ctResponse.json();
        if (!ctResult.success) throw new Error(ctResult.error);

        setCurrentCancerType(ctResult.data);

        const assignResponse = await adminFetch(`${API_BASE}/admin/assessments/${id}/assignments`);
        const assignResult = await assignResponse.json();
        if (!assignResult.success) throw new Error(assignResult.error);

        setCurrentAssignments(assignResult.data || []);

        await loadQuestionBankCache();
        await loadCancerTypesCache();

        const ct = ctResult.data;
        document.getElementById('ct-id').value = ct.id;
        document.getElementById('ct-id').disabled = true;
        document.getElementById('ct-icon').value = ct.icon || '';
        initCtIconAssetPicker(ct.icon || '');
        document.getElementById('ct-name-en').value = ct.name_en || '';
        document.getElementById('ct-name-zh').value = ct.name_zh || '';
        document.getElementById('ct-name-ms').value = ct.name_ms || '';
        document.getElementById('ct-name-ta').value = ct.name_ta || '';
        document.getElementById('ct-desc-en').value = ct.description_en || '';
        document.getElementById('ct-desc-zh').value = ct.description_zh || '';
        document.getElementById('ct-desc-ms').value = ct.description_ms || '';
        document.getElementById('ct-desc-ta').value = ct.description_ta || '';
        document.getElementById('ct-family-en').value = ct.familyLabel_en || '';
        document.getElementById('ct-family-zh').value = ct.familyLabel_zh || '';
        document.getElementById('ct-family-ms').value = ct.familyLabel_ms || '';
        document.getElementById('ct-family-ta').value = ct.familyLabel_ta || '';
        document.getElementById('ct-family-weight').value = ct.familyWeight || '10';
        document.getElementById('ct-gender-filter').value = ct.genderFilter || 'all';
        document.getElementById('ct-age-threshold').value = ct.ageRiskThreshold || '0';
        document.getElementById('ct-age-weight').value = ct.ageRiskWeight || '0';
        document.getElementById('ct-eth-chinese').value = ct.ethnicityRisk_chinese || '0';
        document.getElementById('ct-eth-malay').value = ct.ethnicityRisk_malay || '0';
        document.getElementById('ct-eth-indian').value = ct.ethnicityRisk_indian || '0';
        document.getElementById('ct-eth-caucasian').value = ct.ethnicityRisk_caucasian || '0';
        document.getElementById('ct-eth-others').value = ct.ethnicityRisk_others || '0';
        const ctVisibleEl = document.getElementById('ct-visible');
        if (ctVisibleEl) ctVisibleEl.checked = ct.visible !== false;
        const ctVisibleLabel = document.getElementById('ct-visible-label');
        if (ctVisibleLabel) ctVisibleLabel.textContent = ct.visible !== false ? 'Visible' : 'Hidden';

        document.getElementById('cancer-type-modal-title').textContent = `Edit: ${ct.name_en || ct.id}`;

        const isGeneric = id.toLowerCase() === 'generic';
        document.getElementById('target-cancer-group').style.display = isGeneric ? 'block' : 'none';
        populateTargetCancerDropdown();

        // Hide the whole Demographic Risk Settings section for the Generic editor.
        // Per-target quiz budgets on the Generic page are derived from each SPECIFIC
        // cancer type's saved demographics, not from the generic row. Gender Filter
        // lives in its own Access section and stays visible.
        const demoHeader = document.querySelector('.section-header[data-section="demographic-risk"]');
        const demoBody = document.querySelector('.section-body[data-section="demographic-risk"]');
        if (demoHeader) demoHeader.style.display = isGeneric ? 'none' : '';
        if (demoBody) demoBody.style.display = isGeneric ? 'none' : '';

        renderAssignmentsList();
        renderOnboardingBudgetSummary();
        attachOnboardingFieldListeners();

        // Load recommendations from cancer type
        currentRecommendations = Array.isArray(ct.recommendations) ? JSON.parse(JSON.stringify(ct.recommendations)) : [];
        renderRecommendationsEditor();
        initRecommendationsListeners();

        const ctModal = document.getElementById('cancer-type-modal');
        ctModal.classList.add('active');
        openModalA11y(ctModal, { triggerEl, onEscape: closeModal });
        initCollapsibleSections();
        clearLangChangeListeners();
        initLangTabs('#cancer-type-modal');
        bindCancerTypePreview();
    } catch (err) {
        showError(err.message);
    }
}

function populateTargetCancerDropdown() {
    const select = document.getElementById('q-target-cancer');
    select.innerHTML = '<option value="">Select cancer type...</option>';
    allCancerTypes.forEach(ct => {
        if (ct.id.toLowerCase() !== 'generic') {
            const option = document.createElement('option');
            option.value = ct.id;
            option.textContent = ct.name_en || ct.id;
            select.appendChild(option);
        }
    });
}

function renderAssignmentsList() {
    const container = document.getElementById('questions-container');
    const isGeneric = currentCancerType && (currentCancerType.id || '').toLowerCase() === 'generic';

    if (currentAssignments.length === 0) {
        container.innerHTML = '<p style="color: var(--color-light-text); text-align: center; padding: 20px;">No questions yet. Click "Add Existing Question" or "Create New Question" to add one.</p>';
    } else {
        const getGroupKey = (assign) => isGeneric
            ? ((assign.targetCancerType || '').toLowerCase().trim() || '_unspecified')
            : (assign.category || 'Other');
        const groups = new Map();
        currentAssignments.forEach((assign, index) => {
            const key = getGroupKey(assign);
            if (!groups.has(key)) groups.set(key, []);
            groups.get(key).push({ assign, index });
        });

        const groupOrder = Array.from(groups.keys()).sort();
        let html = '';
        groupOrder.forEach(key => {
            const items = groups.get(key);
            const sum = items.reduce((s, { assign }) => s + (parseFloat(assign.weight) || 0), 0);
            // For generic, each group's target is derived from THAT cancer's own
            // demographics (per-target budget). For specific assessments there is
            // only one target — the current editor's own budget.
            const groupCt = isGeneric
                ? (allCancerTypes || []).find(c => (c.id || '').toLowerCase() === key)
                : null;
            const quizTarget = isGeneric
                ? (groupCt ? getSavedQuizWeightTargetFor(groupCt) : 100)
                : getQuizWeightTarget(currentCancerType);
            const onboardingTotal = 100 - quizTarget;
            const isValid = Math.round(sum * 100) === Math.round(quizTarget * 100);
            const diff = (quizTarget - sum).toFixed(2);
            const requirementText = isGeneric
                ? (isValid ? `\u2713 ${sum.toFixed(0)}% + ${onboardingTotal}% = 100%` : (diff > 0 ? `Need ${diff}% more` : `Reduce by ${Math.abs(diff)}%`))

                : '(part of overall total)';
            const groupName = isGeneric
                ? (key === '_unspecified' ? 'Unspecified target' : (groupCt?.name_en || key))
                : key;

            html += `
                <div class="question-cluster" style="margin-bottom: 20px;">
                    <div class="cluster-header" style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px; padding: 10px 12px; background: var(--color-bg-secondary); border-radius: 6px; margin-bottom: 10px; font-size: 0.9rem;">
                        <strong>${escapeHtml(groupName)}</strong>
                        <span style="color: var(--color-light-text);">${items.length} question${items.length !== 1 ? 's' : ''} \u00b7 Total: <strong style="color: inherit;">${sum.toFixed(2)}%</strong></span>
                        <span style="font-weight: 600; color: ${isGeneric && isValid ? '#2e7d32' : isGeneric ? 'var(--color-risk-high)' : 'var(--color-light-text)'};">${requirementText}</span>
                    </div>
                    ${items.map(({ assign, index }) => {
                        const bankEntry = questionBank.get(assign.questionId);
                        const prompt = bankEntry ? (bankEntry.prompt_en || '') : `[Question ID: ${assign.questionId}]`;
                        const targetCancer = assign.targetCancerType && assign.targetCancerType !== assign.assessmentId
                            ? ` \u2192 ${assign.targetCancerType}` : '';
                        return `
                            <div class="question-editor-row">
                                <div class="row-header">
                                    <span class="row-number">#${index + 1}</span>
                                    <div>
                                        <button type="button" class="action-btn edit-btn" data-action="edit-assign" data-index="${index}">Edit</button>
                                        <button type="button" class="action-btn delete-btn" data-action="delete-assign" data-index="${index}">Delete</button>
                                    </div>
                                </div>
                                <div style="font-size: 0.9rem; margin-bottom: 8px;">
                                    <strong>${escapeHtml(truncate(prompt, 100))}</strong>
                                    <code style="font-size: 0.75rem; margin-left: 8px; color: var(--color-light-text);">${escapeHtml(assign.questionId)}</code>
                                    ${targetCancer ? `<span style="font-size: 0.75rem; color: var(--color-light-text); margin-left: 8px;">${escapeHtml(targetCancer)}</span>` : ''}
                                </div>
                                <div style="display: flex; gap: 16px; font-size: 0.8rem; color: var(--color-light-text); flex-wrap: wrap; align-items: center;">
                                    <span>Weight: <strong>${escapeHtml(assign.weight || 0)}%</strong></span>
                                    <span>Category: ${escapeHtml(assign.category || '-')}</span>
                                    <span>Yes: ${escapeHtml(assign.yesValue || 100)}% / No: ${escapeHtml(assign.noValue || 0)}%</span>
                                    ${assign.minAge ? `<span>Min Age: ${escapeHtml(assign.minAge)}</span>` : ''}
                                    ${assign.showExplanation === false ? `<span style="background: var(--color-bg-secondary); color: var(--color-light-text); padding: 2px 8px; border-radius: 10px; font-size: 0.75rem;">explanation off</span>` : ''}
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            `;
        });
        container.innerHTML = html;

        // Event delegation for assignment actions
        if (!container._delegateAttached) {
            container._delegateAttached = true;
            container.addEventListener('click', (e) => {
                const btn = e.target.closest('[data-action]');
                if (!btn) return;
                const idx = parseInt(btn.dataset.index);
                if (btn.dataset.action === 'edit-assign') editAssignment(idx);
                else if (btn.dataset.action === 'delete-assign') deleteAssignment(idx);
            });
        }
    }

    updateQuestionsCount();
    updateTotalWeight();
}

function truncate(str, len) {
    return str.length > len ? str.substring(0, len) + '...' : str;
}

function updateQuestionsCount() {
    document.getElementById('questions-count').textContent = currentAssignments.length;
}

function updateTotalWeight() {
    const isGeneric = currentCancerType && (currentCancerType.id || '').toLowerCase() === 'generic';
    const innerEl = document.getElementById('weight-summary-inner');
    if (!innerEl) return;

    if (isGeneric) {
        renderGenericWeightSummary(innerEl);
    } else {
        const quizTarget = getQuizWeightTarget(currentCancerType);
        const onboardingBudget = 100 - quizTarget;
        innerEl.innerHTML = `
            <div>
                <div class="weight-value" id="total-weight">0.00%</div>
                <div class="weight-label">Quiz Weight (target: ${quizTarget}%)</div>
            </div>
            <div id="weight-status" style="font-weight: 600;"></div>
        `;
        const total = currentAssignments.reduce((sum, assign) => sum + (parseFloat(assign.weight) || 0), 0);
        const weightEl = document.getElementById('total-weight');
        const statusEl = document.getElementById('weight-status');
        const isValid = Math.round(total * 100) === Math.round(quizTarget * 100);

        weightEl.textContent = total.toFixed(2) + '%';
        weightEl.className = 'weight-value ' + (isValid ? 'valid' : 'invalid');

        if (isValid) {
            statusEl.textContent = `\u2713 ${total.toFixed(0)}% quiz + ${onboardingBudget}% onboarding = ${(total + onboardingBudget).toFixed(0)}%`;
            statusEl.style.color = '#2e7d32';
        } else {
            const diff = (quizTarget - total).toFixed(2);
            statusEl.textContent = diff > 0 ? `Need ${diff}% more` : `Reduce by ${Math.abs(diff)}%`;
            statusEl.style.color = 'var(--color-risk-high)';
        }
    }
}

function renderOnboardingBudgetSummary() {
    const el = document.getElementById('onboarding-budget-summary');
    if (!el || !currentCancerType) { if (el) el.style.display = 'none'; return; }

    // The Generic editor no longer owns demographic settings — per-target quiz
    // budgets are derived from each SPECIFIC cancer's saved demographics and
    // displayed inline in the question-group list instead.
    if ((currentCancerType.id || '').toLowerCase() === 'generic') {
        el.style.display = 'none';
        return;
    }

    const budget = getOnboardingBudget(currentCancerType);
    const quizTarget = 100 - budget.total;

    el.style.display = 'block';
    el.innerHTML = `
        <div style="background: var(--color-bg-secondary); border-radius: 8px; padding: 14px 16px; border: 1px solid var(--color-border);">
            <div style="font-weight: 600; margin-bottom: 10px; font-size: 0.95rem;">Risk Budget Breakdown (100% total)</div>
            <div style="display: flex; gap: 16px; flex-wrap: wrap; font-size: 0.88rem;">
                <div style="flex: 1; min-width: 180px; padding: 10px; background: var(--color-bg); border-radius: 6px;">
                    <div style="font-weight: 600; color: var(--color-primary); margin-bottom: 6px;">Onboarding: ${budget.total}%</div>
                    <div style="color: var(--color-light-text); line-height: 1.6;">
                        Family History Weight: <strong>${budget.familyWeight}%</strong><br>
                        Age Risk Weight: <strong>${budget.ageWeight}%</strong><br>
                        Max Ethnicity Weight: <strong>${budget.maxEthWeight}%</strong>
                    </div>
                </div>
                <div style="flex: 1; min-width: 180px; padding: 10px; background: var(--color-bg); border-radius: 6px;">
                    <div style="font-weight: 600; color: var(--color-primary); margin-bottom: 6px;">Quiz Questions: ${quizTarget}%</div>
                    <div style="color: var(--color-light-text); line-height: 1.6;">
                        Each cancer type's question<br>weights must sum to <strong>${quizTarget}%</strong>
                    </div>
                </div>
            </div>
        </div>
    `;
}

/**
 * Attach listeners on onboarding form fields so validation recalculates live.
 */
let _onboardingListenersAttached = false;
function attachOnboardingFieldListeners() {
    if (_onboardingListenersAttached) return;
    _onboardingListenersAttached = true;

    const fieldIds = [
        'ct-family-weight', 'ct-age-weight',
        'ct-eth-chinese', 'ct-eth-malay', 'ct-eth-indian', 'ct-eth-caucasian', 'ct-eth-others'
    ];
    const refresh = () => {
        renderOnboardingBudgetSummary();
        renderAssignmentsList();
    };
    fieldIds.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('input', refresh);
    });
}

export async function showAddQuestionDialog() {
    // Capture the trigger BEFORE any awaits so focus return lands on the button
    // the user just clicked (document.activeElement may change during await).
    const triggerEl = document.activeElement instanceof HTMLElement ? document.activeElement : null;

    await loadQuestionBankCache();

    const bankEntries = Array.from(questionBank.values());
    if (bankEntries.length === 0) {
        alert('No questions in the Question Bank yet. Please create a new question first.');
        return;
    }

    const dialog = document.createElement('div');
    dialog.className = 'modal';
    dialog.style.display = 'block';
    // Dialog semantics so the modal helper and screen readers know what this is.
    dialog.setAttribute('role', 'dialog');
    dialog.setAttribute('aria-modal', 'true');
    dialog.setAttribute('aria-labelledby', 'add-existing-question-title');
    dialog.setAttribute('tabindex', '-1');
    dialog.innerHTML = `
        <div class="modal-content" style="max-width: 600px;">
            <div class="modal-header">
                <h2 id="add-existing-question-title">Add Existing Question</h2>
                <button class="close-btn" data-action="close-dialog">&times;</button>
            </div>
            <div class="modal-body">
                <div style="max-height: 400px; overflow-y: auto;">
                    <table style="width: 100%; border-collapse: collapse;">
                        <thead>
                            <tr style="border-bottom: 1px solid var(--color-border);">
                                <th style="text-align: left; padding: 8px;">ID</th>
                                <th style="text-align: left; padding: 8px;">Question</th>
                                <th style="text-align: left; padding: 8px;">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${bankEntries.map(q => `
                                <tr style="border-bottom: 1px solid var(--color-border);">
                                    <td style="padding: 8px;"><code>${escapeHtml(q.id)}</code></td>
                                    <td style="padding: 8px;">${escapeHtml(truncate(q.prompt_en || '', 80))}</td>
                                    <td style="padding: 8px;">
                                        <button class="btn btn-sm btn-primary" data-action="add-question" data-qid="${escapeHtml(q.id)}">
                                            Add
                                        </button>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;
    const closeDialog = () => {
        closeModalA11y(dialog);
        dialog.remove();
    };
    dialog.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-action]');
        if (!btn) return;
        if (btn.dataset.action === 'add-question') {
            addExistingQuestion(btn.dataset.qid);
            closeDialog();
        } else if (btn.dataset.action === 'close-dialog') {
            closeDialog();
        }
    });
    document.body.appendChild(dialog);
    openModalA11y(dialog, { triggerEl, onEscape: closeDialog });
}

export function addExistingQuestion(questionId) {
    const assessmentId = currentCancerType ? currentCancerType.id : '';
    const isGeneric = assessmentId.toLowerCase() === 'generic';

    currentAssignments.push({
        questionId: questionId,
        assessmentId: assessmentId,
        targetCancerType: isGeneric ? '' : assessmentId,
        weight: '0',
        yesValue: '100',
        noValue: '0',
        category: 'Medical History',
        minAge: ''
    });
    renderAssignmentsList();
    editAssignment(currentAssignments.length - 1);
}

export async function addNewQuestion() {
    const bankId = prompt('Enter a unique Question ID or any number(e.g., 98, 200, 300, etc.):');
    if (!bankId || !bankId.trim()) return;

    if (questionBank.has(bankId.trim())) {
        alert('A question with this ID already exists. Please use "Add Existing Question" instead.');
        return;
    }

    document.getElementById('q-index').value = '-1';
    document.getElementById('q-question-id').value = bankId.trim();
    document.getElementById('q-prompt-en').value = '';
    document.getElementById('q-prompt-zh').value = '';
    document.getElementById('q-prompt-ms').value = '';
    document.getElementById('q-prompt-ta').value = '';
    document.getElementById('q-weight').value = '0';
    document.getElementById('q-yes').value = '100';
    document.getElementById('q-no').value = '0';
    document.getElementById('q-category').value = 'Medical History';
    document.getElementById('q-minage').value = '';
    document.getElementById('q-expYes-en').value = '';
    document.getElementById('q-expYes-zh').value = '';
    document.getElementById('q-expYes-ms').value = '';
    document.getElementById('q-expYes-ta').value = '';
    document.getElementById('q-expNo-en').value = '';
    document.getElementById('q-expNo-zh').value = '';
    document.getElementById('q-expNo-ms').value = '';
    document.getElementById('q-expNo-ta').value = '';
    document.getElementById('q-target-cancer').value = '';
    document.getElementById('q-expYes-en').readOnly = false;
    document.getElementById('q-expYes-zh').readOnly = false;
    document.getElementById('q-expYes-ms').readOnly = false;
    document.getElementById('q-expYes-ta').readOnly = false;
    document.getElementById('q-expNo-en').readOnly = false;
    document.getElementById('q-expNo-zh').readOnly = false;
    document.getElementById('q-expNo-ms').readOnly = false;
    document.getElementById('q-expNo-ta').readOnly = false;
    const expHint = document.getElementById('q-exp-hint');
    if (expHint) expHint.style.display = 'none';
    const expNoHint = document.getElementById('q-expNo-hint');
    if (expNoHint) expNoHint.style.display = 'none';

    const isGeneric = currentCancerType && currentCancerType.id.toLowerCase() === 'generic';
    document.getElementById('target-cancer-group').style.display = isGeneric ? 'block' : 'none';

    document.getElementById('q-bank-text-group').style.display = 'none';
    document.getElementById('q-text-input-group').style.display = 'block';

    document.getElementById('question-modal-title').textContent = 'Create New Question';
    document.getElementById('question-modal-save-btn').textContent = 'Save Question';
    const qModal = document.getElementById('question-modal');
    qModal.classList.add('active');
    openModalA11y(qModal, { onEscape: closeQuestionModal });
    clearLangChangeListeners();
    initLangTabs('#question-modal');
    bindQuestionPreview('q');
}

export function editAssignment(index) {
    const assign = currentAssignments[index];
    const bankEntry = questionBank.get(assign.questionId);

    document.getElementById('q-index').value = index;
    document.getElementById('q-question-id').value = assign.questionId;
    document.getElementById('q-weight').value = assign.weight || '';
    document.getElementById('q-yes').value = assign.yesValue || 100;
    document.getElementById('q-no').value = assign.noValue || 0;
    document.getElementById('q-category').value = assign.category || 'Medical History';
    document.getElementById('q-minage').value = assign.minAge || '';
    document.getElementById('q-target-cancer').value = assign.targetCancerType || '';

    const showExpToggle = document.getElementById('q-show-explanation');
    const showExpLabel = document.getElementById('q-show-explanation-label');
    const showExpValue = assign.showExplanation !== false;
    if (showExpToggle) showExpToggle.checked = showExpValue;
    if (showExpLabel) showExpLabel.textContent = showExpValue ? 'Shown' : 'Hidden';

    const isGeneric = currentCancerType && currentCancerType.id.toLowerCase() === 'generic';
    document.getElementById('target-cancer-group').style.display = isGeneric ? 'block' : 'none';

    if (bankEntry) {
        document.getElementById('q-bank-text-group').style.display = 'block';
        document.getElementById('q-text-input-group').style.display = 'none';
        const bankLangs = { en: bankEntry.prompt_en, zh: bankEntry.prompt_zh, ms: bankEntry.prompt_ms, ta: bankEntry.prompt_ta };
        for (const [lang, text] of Object.entries(bankLangs)) {
            const cell = document.getElementById(`q-bank-text-${lang}`);
            if (cell) cell.textContent = text || `[No ${lang.toUpperCase()} text]`;
        }
        document.getElementById('q-expYes-en').value = bankEntry.explanationYes_en || '';
        document.getElementById('q-expYes-zh').value = bankEntry.explanationYes_zh || '';
        document.getElementById('q-expYes-ms').value = bankEntry.explanationYes_ms || '';
        document.getElementById('q-expYes-ta').value = bankEntry.explanationYes_ta || '';
        document.getElementById('q-expNo-en').value = bankEntry.explanationNo_en || '';
        document.getElementById('q-expNo-zh').value = bankEntry.explanationNo_zh || '';
        document.getElementById('q-expNo-ms').value = bankEntry.explanationNo_ms || '';
        document.getElementById('q-expNo-ta').value = bankEntry.explanationNo_ta || '';
        document.getElementById('q-expYes-en').readOnly = true;
        document.getElementById('q-expYes-zh').readOnly = true;
        document.getElementById('q-expYes-ms').readOnly = true;
        document.getElementById('q-expYes-ta').readOnly = true;
        document.getElementById('q-expNo-en').readOnly = true;
        document.getElementById('q-expNo-zh').readOnly = true;
        document.getElementById('q-expNo-ms').readOnly = true;
        document.getElementById('q-expNo-ta').readOnly = true;
        const expHint = document.getElementById('q-exp-hint');
        if (expHint) expHint.style.display = 'block';
        const expNoHint = document.getElementById('q-expNo-hint');
        if (expNoHint) expNoHint.style.display = 'block';
    } else {
        document.getElementById('q-bank-text-group').style.display = 'none';
        document.getElementById('q-text-input-group').style.display = 'block';
        document.getElementById('q-prompt-en').value = '';
        document.getElementById('q-prompt-zh').value = '';
        document.getElementById('q-prompt-ms').value = '';
        document.getElementById('q-prompt-ta').value = '';
        document.getElementById('q-expYes-en').value = '';
        document.getElementById('q-expYes-zh').value = '';
        document.getElementById('q-expYes-ms').value = '';
        document.getElementById('q-expYes-ta').value = '';
        document.getElementById('q-expNo-en').value = '';
        document.getElementById('q-expNo-zh').value = '';
        document.getElementById('q-expNo-ms').value = '';
        document.getElementById('q-expNo-ta').value = '';
        document.getElementById('q-expYes-en').readOnly = false;
        document.getElementById('q-expYes-zh').readOnly = false;
        document.getElementById('q-expYes-ms').readOnly = false;
        document.getElementById('q-expYes-ta').readOnly = false;
        document.getElementById('q-expNo-en').readOnly = false;
        document.getElementById('q-expNo-zh').readOnly = false;
        document.getElementById('q-expNo-ms').readOnly = false;
        document.getElementById('q-expNo-ta').readOnly = false;
        const expHint = document.getElementById('q-exp-hint');
        if (expHint) expHint.style.display = 'none';
        const expNoHint = document.getElementById('q-expNo-hint');
        if (expNoHint) expNoHint.style.display = 'none';
    }

    document.getElementById('question-modal-title').textContent = bankEntry ? 'Edit Question Weightage' : 'Edit Question';
    document.getElementById('question-modal-save-btn').textContent = bankEntry ? 'Save Weightage' : 'Save Question';
    const qModal = document.getElementById('question-modal');
    qModal.classList.add('active');
    openModalA11y(qModal, { onEscape: closeQuestionModal });
    clearLangChangeListeners();
    initLangTabs('#question-modal');
    bindQuestionPreview('q');
}

export function deleteAssignment(index) {
    if (confirm('Are you sure you want to remove this question from this assessment?')) {
        currentAssignments.splice(index, 1);
        renderAssignmentsList();
    }
}

export function closeQuestionModal() {
    const qModal = document.getElementById('question-modal');
    closeModalA11y(qModal);
    qModal.classList.remove('active');
    document.getElementById('q-index').value = '';
    document.getElementById('q-question-id').value = '';
    document.getElementById('q-bank-text-group').style.display = 'none';
    document.getElementById('q-text-input-group').style.display = 'none';
    const expHint = document.getElementById('q-exp-hint');
    if (expHint) expHint.style.display = 'none';
}

export function closeModal() {
    const ctModal = document.getElementById('cancer-type-modal');
    closeModalA11y(ctModal);
    ctModal.classList.remove('active');
    cardImageStager.reset();
    setCurrentCancerType(null);
    setCurrentAssignments([]);
    clearQuestionBank();
}

export async function deleteCancerType(id, name) {
    if (!confirm(`Are you sure you want to delete the cancer type "${name}"?\n\nThis action cannot be undone and will permanently remove all questions and settings for this cancer type.`)) {
        return;
    }

    try {
        const response = await adminFetch(`${API_BASE}/admin/cancer-types/${id}`, {
            method: 'DELETE'
        });

        const result = await response.json();
        if (!result.success) throw new Error(result.error);

        showSuccess(`Cancer type "${name}" deleted successfully!`);
        invalidateTab('question-bank');
        loadCancerTypes();
    } catch (err) {
        showError(`Failed to delete cancer type: ${err.message}`);
    }
}

async function initCtIconAssetPicker(currentValue) {
    const selectEl = document.getElementById('ct-icon-select');
    const hiddenInput = document.getElementById('ct-icon');
    const uploadPanel = document.getElementById('ct-icon-upload-panel');
    const urlPanel = document.getElementById('ct-icon-url-panel');
    const customUrlInput = document.getElementById('ct-icon-custom-url');
    const radioButtons = document.querySelectorAll('input[name="ct-icon-source"]');
    const uploadBtn = document.querySelector('.btn-upload-ct-icon');
    const fileInput = document.querySelector('.ct-icon-file-input');
    if (!selectEl) return;

    // Destroy existing asset-picker-wrap if re-opening editor
    const existingWrap = selectEl.closest('.asset-picker-wrap');
    if (existingWrap) {
        existingWrap.parentNode.insertBefore(selectEl, existingWrap);
        existingWrap.remove();
    }

    // Helper to sync panel visibility with selected radio
    function syncPanels() {
        const selected = document.querySelector('input[name="ct-icon-source"]:checked').value;
        uploadPanel.style.display = selected === 'upload' ? '' : 'none';
        urlPanel.style.display = selected === 'url' ? '' : 'none';
    }

    // Fetch cancer card assets
    try {
        const res = await adminFetch(`${API_BASE}/admin/assets?folder=cancer-cards`);
        const data = await res.json();
        const paths = data.paths || [];

        // Determine if current value is an uploaded asset or a custom URL
        const isAssetPath = currentValue && paths.includes(currentValue);
        const isCustom = currentValue && !isAssetPath;

        fillAssetSelect(selectEl, paths, isAssetPath ? currentValue : '');
        hiddenInput.value = currentValue || '';

        // Set the correct radio based on current value
        radioButtons.forEach(r => {
            r.checked = isCustom ? r.value === 'url' : r.value === 'upload';
        });
        customUrlInput.value = isCustom ? currentValue : '';
        syncPanels();

        // Init the asset picker dropdown with deferred deletion
        initAssetPickerDropdown(selectEl, {
            stager: cardImageStager,
            onDelete: (path) => {
                const o = Array.from(selectEl.options).find(op => op.value === path);
                if (o) o.remove();
                if (selectEl.value === path) {
                    selectEl.value = '';
                    updateAssetPickerTrigger(selectEl);
                    hiddenInput.value = '';
                    updateCardImagePreview('');
                }
            },
            onChange: (sel) => {
                hiddenInput.value = sel.value;
                updateCardImagePreview(sel.value);
            }
        });

        // Bind upload button
        if (uploadBtn) {
            uploadBtn.onclick = () => { if (fileInput) fileInput.click(); };
        }
        if (fileInput) {
            fileInput.onchange = () => {
                const file = fileInput.files && fileInput.files[0];
                if (!file) return;
                // Stage the file client-side — no server upload until save
                cardImageStager.reset();
                const tempId = cardImageStager.stageUpload(file, 'cancer-cards');
                const blobUrl = cardImageStager.getBlobUrl(tempId);
                const opt = document.createElement('option');
                opt.value = tempId;
                opt.textContent = file.name;
                selectEl.appendChild(opt);
                selectEl.value = tempId;
                updateAssetPickerTrigger(selectEl);
                hiddenInput.value = tempId;
                updateCardImagePreview(blobUrl);
                fileInput.value = '';
            };
        }

        // Bind radio button toggle
        radioButtons.forEach(r => {
            r.onchange = () => {
                syncPanels();
                if (r.value === 'url' && r.checked) {
                    hiddenInput.value = customUrlInput.value;
                    updateCardImagePreview(customUrlInput.value);
                } else if (r.value === 'upload' && r.checked) {
                    hiddenInput.value = selectEl.value;
                    updateCardImagePreview(selectEl.value);
                }
            };
        });
        customUrlInput.oninput = () => {
            hiddenInput.value = customUrlInput.value;
            updateCardImagePreview(customUrlInput.value);
        };

        updateCardImagePreview(currentValue || '');
    } catch (err) {
        console.error('Failed to load cancer card assets:', err);
    }
}

function isImageUrl(val) {
    if (!val || typeof val !== 'string') return false;
    const v = val.trim();
    return v.startsWith('http://') || v.startsWith('https://') || v.startsWith('/') || v.startsWith('data:') || v.startsWith('assets/');
}

function updateCardImagePreview(url) {
    const preview = document.getElementById('ct-icon-preview');
    if (!preview) return;
    if (!url || !isImageUrl(url)) {
        preview.style.display = 'none';
        preview.innerHTML = '';
        return;
    }
    preview.innerHTML = '<img src="' + escapeHtml(url) + '" alt="Preview">';
    preview.style.display = 'block';
}

// ==================== COLLAPSIBLE SECTIONS ====================

function initCollapsibleSections() {
    const modal = document.getElementById('cancer-type-modal');
    if (!modal) return;

    const headers = modal.querySelectorAll('.section-header.collapsible');
    headers.forEach(header => {
        const section = header.dataset.section;
        const body = modal.querySelector(`.section-body[data-section="${section}"]`);
        if (!body) return;

        // Default: Card Settings open, others collapsed
        if (section !== 'card-settings') {
            header.classList.add('collapsed');
            body.classList.add('collapsed');
        } else {
            header.classList.remove('collapsed');
            body.classList.remove('collapsed');
        }

        // Remove old listener by cloning
        const newHeader = header.cloneNode(true);
        header.parentNode.replaceChild(newHeader, header);

        newHeader.addEventListener('click', (e) => {
            // Don't toggle when clicking buttons inside the header
            if (e.target.closest('button')) return;
            const isCollapsed = newHeader.classList.toggle('collapsed');
            body.classList.toggle('collapsed', isCollapsed);
        });
    });
}

// ==================== RECOMMENDATIONS EDITOR ====================

const TRIGGER_OPTIONS = [
    { value: 'always', label: 'Always' },
    { value: 'diet', label: 'Diet & Nutrition risk > 0' },
    { value: 'lifestyle', label: 'Lifestyle risk > 0' },
    { value: 'medical', label: 'Medical History risk > 0' },
    { value: 'family', label: 'Family & Genetics risk > 0' },
    { value: 'high_risk', label: 'High risk level only' },
    { value: 'screening', label: 'Medical or Family risk > 0' }
];

function renderRecommendationsEditor() {
    const container = document.getElementById('ct-recommendations-container');
    const countEl = document.getElementById('ct-recs-count');
    if (!container) return;
    if (countEl) countEl.textContent = currentRecommendations.length;

    if (currentRecommendations.length === 0) {
        container.innerHTML = '<p style="color: var(--color-light-text); text-align: center; padding: 16px;">No recommendations yet. Click "+ Add Recommendation" to add one.</p>';
        return;
    }

    const langs = ['en', 'zh', 'ms', 'ta'];
    const langLabels = { en: 'EN', zh: '中文', ms: 'BM', ta: 'தமிழ்' };

    container.innerHTML = currentRecommendations.map((rec, idx) => {
        const triggerOptions = TRIGGER_OPTIONS.map(opt =>
            `<option value="${opt.value}" ${rec.trigger === opt.value ? 'selected' : ''}>${escapeHtml(opt.label)}</option>`
        ).join('');

        const titleInputs = langs.map(l =>
            `<div style="display: flex; gap: 4px; align-items: center; margin-bottom: 4px;">
                <span style="font-size: 0.75rem; min-width: 28px; color: var(--color-light-text);">${langLabels[l]}</span>
                <input type="text" class="rec-title-input" data-rec="${idx}" data-lang="${l}"
                    value="${escapeHtml((rec.title && rec.title[l]) || '')}"
                    placeholder="Title (${langLabels[l]})" style="flex: 1; padding: 4px 8px; font-size: 0.85rem;">
            </div>`
        ).join('');

        const actionsHtml = (rec.actions || []).map((action, actIdx) => {
            const actionInputs = langs.map(l =>
                `<div style="display: flex; gap: 4px; align-items: center; margin-bottom: 2px;">
                    <span style="font-size: 0.7rem; min-width: 28px; color: var(--color-light-text);">${langLabels[l]}</span>
                    <input type="text" class="rec-action-input" data-rec="${idx}" data-act="${actIdx}" data-lang="${l}"
                        value="${escapeHtml((typeof action === 'object' ? action[l] : (l === 'en' ? action : '')) || '')}"
                        placeholder="Action (${langLabels[l]})" style="flex: 1; padding: 3px 6px; font-size: 0.8rem;">
                </div>`
            ).join('');

            return `<div class="rec-action-item" style="background: var(--color-bg); border: 1px solid var(--color-border); border-radius: 4px; padding: 8px; margin-bottom: 6px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                    <span style="font-size: 0.8rem; font-weight: 600;">Action ${actIdx + 1}</span>
                    <button type="button" class="action-btn delete-btn" data-action="remove-rec-action" data-rec="${idx}" data-act="${actIdx}" style="font-size: 0.75rem;">Remove</button>
                </div>
                ${actionInputs}
            </div>`;
        }).join('');

        return `<div class="rec-card" style="border: 1px solid var(--color-border); border-radius: 8px; padding: 12px; margin-bottom: 12px; background: var(--color-bg-secondary);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                <strong style="font-size: 0.9rem;">Recommendation ${idx + 1}</strong>
                <button type="button" class="action-btn delete-btn" data-action="remove-rec" data-rec="${idx}">Remove</button>
            </div>
            <div class="form-group" style="margin-bottom: 8px;">
                <label style="font-size: 0.85rem;">Trigger</label>
                <select class="rec-trigger-select" data-rec="${idx}" style="padding: 4px 8px; font-size: 0.85rem;">
                    ${triggerOptions}
                </select>
            </div>
            <div class="form-group" style="margin-bottom: 8px;">
                <label style="font-size: 0.85rem;">Title (multilingual)</label>
                ${titleInputs}
            </div>
            <div class="form-group" style="margin-bottom: 4px;">
                <label style="font-size: 0.85rem;">Actions</label>
                ${actionsHtml}
                <button type="button" class="btn btn-sm btn-outline" data-action="add-rec-action" data-rec="${idx}" style="margin-top: 4px;">+ Add Action</button>
            </div>
        </div>`;
    }).join('');
}

function collectRecommendationsFromForm() {
    const langs = ['en', 'zh', 'ms', 'ta'];
    return currentRecommendations.map((rec, idx) => {
        const triggerEl = document.querySelector(`.rec-trigger-select[data-rec="${idx}"]`);
        const trigger = triggerEl ? triggerEl.value : rec.trigger || 'always';

        const title = {};
        langs.forEach(l => {
            const el = document.querySelector(`.rec-title-input[data-rec="${idx}"][data-lang="${l}"]`);
            title[l] = el ? el.value : ((rec.title && rec.title[l]) || '');
        });

        const actions = (rec.actions || []).map((_, actIdx) => {
            const action = {};
            langs.forEach(l => {
                const el = document.querySelector(`.rec-action-input[data-rec="${idx}"][data-act="${actIdx}"][data-lang="${l}"]`);
                action[l] = el ? el.value : '';
            });
            return action;
        });

        return { trigger, title, actions };
    });
}

function addRecommendation() {
    // Sync current form values before adding
    currentRecommendations = collectRecommendationsFromForm();
    currentRecommendations.push({
        trigger: 'always',
        title: { en: '', zh: '', ms: '', ta: '' },
        actions: [{ en: '', zh: '', ms: '', ta: '' }]
    });
    renderRecommendationsEditor();
}

function removeRecommendation(index) {
    currentRecommendations = collectRecommendationsFromForm();
    currentRecommendations.splice(index, 1);
    renderRecommendationsEditor();
}

function addRecAction(recIdx) {
    currentRecommendations = collectRecommendationsFromForm();
    if (currentRecommendations[recIdx]) {
        currentRecommendations[recIdx].actions.push({ en: '', zh: '', ms: '', ta: '' });
    }
    renderRecommendationsEditor();
}

function removeRecAction(recIdx, actIdx) {
    currentRecommendations = collectRecommendationsFromForm();
    if (currentRecommendations[recIdx]) {
        currentRecommendations[recIdx].actions.splice(actIdx, 1);
    }
    renderRecommendationsEditor();
}

/**
 * Validate that every recommendation title and action has a non-empty EN value.
 * Uses the same visual pattern as validateEnglishFields (red border + shake + inline msg)
 * but works with class+data-attr selectors instead of element IDs.
 * Returns true if valid (or no recommendations exist).
 */
function validateRecommendationsEn() {
    // Clear previous rec validation errors
    document.querySelectorAll('#ct-recommendations-container .validation-error').forEach(el => {
        el.classList.remove('validation-error');
    });
    document.querySelectorAll('#ct-recommendations-container .lang-validation-msg').forEach(el => {
        el.remove();
    });

    const emptyFields = [];

    // Check each rec title EN
    document.querySelectorAll('.rec-title-input[data-lang="en"]').forEach(el => {
        if (!el.value.trim()) emptyFields.push(el);
    });

    // Check each rec action EN
    document.querySelectorAll('.rec-action-input[data-lang="en"]').forEach(el => {
        if (!el.value.trim()) emptyFields.push(el);
    });

    if (emptyFields.length === 0) return true;

    // Highlight each empty field and add inline error above each one
    for (const el of emptyFields) {
        const wrapper = el.parentElement;
        if (wrapper && wrapper.parentElement) {
            wrapper.classList.add('validation-error');
            wrapper.style.animation = 'none';
            wrapper.offsetHeight;
            wrapper.style.animation = '';

            // Add inline error message above this row
            const msgEl = document.createElement('div');
            msgEl.className = 'lang-validation-msg';
            msgEl.textContent = 'English text is required.';
            wrapper.parentElement.insertBefore(msgEl, wrapper);

            el.addEventListener('input', function clearError() {
                wrapper.classList.remove('validation-error');
                const prev = wrapper.previousElementSibling;
                if (prev && prev.classList.contains('lang-validation-msg')) prev.remove();
                el.removeEventListener('input', clearError);
            });
        }
    }

    // Scroll to and focus the first empty field
    const first = emptyFields[0];
    first.scrollIntoView({ behavior: 'smooth', block: 'center' });
    first.focus();

    return false;
}

function initRecommendationsListeners() {
    const addBtn = document.getElementById('ct-add-rec-btn');
    if (addBtn && !addBtn._recListenerAttached) {
        addBtn._recListenerAttached = true;
        addBtn.addEventListener('click', addRecommendation);
    }

    const container = document.getElementById('ct-recommendations-container');
    if (container && !container._recDelegateAttached) {
        container._recDelegateAttached = true;
        container.addEventListener('click', (e) => {
            const btn = e.target.closest('[data-action]');
            if (!btn) return;
            const recIdx = parseInt(btn.dataset.rec);
            if (btn.dataset.action === 'remove-rec') removeRecommendation(recIdx);
            else if (btn.dataset.action === 'add-rec-action') addRecAction(recIdx);
            else if (btn.dataset.action === 'remove-rec-action') removeRecAction(recIdx, parseInt(btn.dataset.act));
        });
    }
}

// Bind form event listeners
export function initContentView() {
    // Cancer type form submit
    document.getElementById('cancer-type-form').addEventListener('submit', async function (e) {
        e.preventDefault();

        const saveBtn = document.getElementById('save-btn');
        saveBtn.disabled = true;
        saveBtn.textContent = 'Saving...';

        // Upload any staged card image before building the payload
        let resolvedIcon = document.getElementById('ct-icon').value;
        const pendingFiles = cardImageStager.getPendingUploads();
        if (pendingFiles.length > 0) {
            const { file, folder } = pendingFiles[0];
            const formData = new FormData();
            formData.append('file', file);
            formData.append('folder', folder);
            try {
                const uploadRes = await adminFetch(`${API_BASE}/admin/assets/upload`, {
                    method: 'POST',
                    body: formData
                });
                const contentType = uploadRes.headers.get('content-type') || '';
                if (!contentType.includes('application/json')) {
                    await uploadRes.text();
                    throw new Error('Image upload failed. Try a smaller file (max 10MB).');
                }
                const uploadData = await uploadRes.json();
                resolvedIcon = uploadData.path;
            } catch (uploadErr) {
                showError('Image upload failed: ' + uploadErr.message);
                saveBtn.disabled = false;
                saveBtn.textContent = 'Save Changes';
                return;
            }
        }

        // Validate required English fields
        const { valid } = validateEnglishFields('#cancer-type-form', ['ct-name-en', 'ct-desc-en', 'ct-family-en']);
        if (!valid) {
            saveBtn.disabled = false;
            saveBtn.textContent = 'Save Changes';
            return;
        }

        // Validate recommendation EN fields (titles + actions)
        if (!validateRecommendationsEn()) {
            saveBtn.disabled = false;
            saveBtn.textContent = 'Save Changes';
            return;
        }

        const idLower = document.getElementById('ct-id').value.toLowerCase().trim();
        const isGenericSave = idLower === 'generic';

        const cancerTypeData = {
            id: idLower,
            icon: resolvedIcon,
            name_en: document.getElementById('ct-name-en').value,
            name_zh: document.getElementById('ct-name-zh').value,
            name_ms: document.getElementById('ct-name-ms').value,
            name_ta: document.getElementById('ct-name-ta').value,
            description_en: document.getElementById('ct-desc-en').value,
            description_zh: document.getElementById('ct-desc-zh').value,
            description_ms: document.getElementById('ct-desc-ms').value,
            description_ta: document.getElementById('ct-desc-ta').value,
            familyLabel_en: document.getElementById('ct-family-en').value,
            familyLabel_zh: document.getElementById('ct-family-zh').value,
            familyLabel_ms: document.getElementById('ct-family-ms').value,
            familyLabel_ta: document.getElementById('ct-family-ta').value,
            genderFilter: document.getElementById('ct-gender-filter').value || 'all',
            visible: document.getElementById('ct-visible')?.checked ?? false,
            recommendations: collectRecommendationsFromForm()
        };

        // Generic no longer owns demographics — its scoring uses each specific
        // cancer's own config at runtime. Omit the fields on PUT so stale DOM
        // defaults don't overwrite the dormant DB values. Specific cancer types
        // still carry their full demographic config.
        if (!isGenericSave) {
            cancerTypeData.familyWeight = document.getElementById('ct-family-weight').value || '10';
            cancerTypeData.ageRiskThreshold = document.getElementById('ct-age-threshold').value || '0';
            cancerTypeData.ageRiskWeight = document.getElementById('ct-age-weight').value || '0';
            cancerTypeData.ethnicityRisk_chinese = document.getElementById('ct-eth-chinese').value || '0';
            cancerTypeData.ethnicityRisk_malay = document.getElementById('ct-eth-malay').value || '0';
            cancerTypeData.ethnicityRisk_indian = document.getElementById('ct-eth-indian').value || '0';
            cancerTypeData.ethnicityRisk_caucasian = document.getElementById('ct-eth-caucasian').value || '0';
            cancerTypeData.ethnicityRisk_others = document.getElementById('ct-eth-others').value || '0';
        }

        try {
            let response;
            if (isNewCancerType) {
                response = await adminFetch(`${API_BASE}/admin/cancer-types`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(cancerTypeData)
                });
            } else {
                response = await adminFetch(`${API_BASE}/admin/cancer-types/${cancerTypeData.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(cancerTypeData)
                });
            }

            const result = await response.json();
            if (!result.success) throw new Error(result.error);

            if (currentAssignments.length > 0) {
                const assignResponse = await adminFetch(`${API_BASE}/admin/assessments/${cancerTypeData.id}/assignments`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ assignments: currentAssignments })
                });

                const assignResult = await assignResponse.json();
                if (!assignResult.success) {
                    console.warn('Failed to save assignments:', assignResult.error);
                    showError('Cancer type saved, but failed to save questions. Please try editing again.');
                }
            }

            // Execute any staged asset deletions
            for (const delPath of cardImageStager.getPendingDeletes()) {
                await adminFetch(`${API_BASE}/admin/assets`, {
                    method: 'DELETE',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ path: delPath })
                });
            }

            closeModal();
            showSuccess(isNewCancerType ? 'Cancer type created successfully!' : 'Changes saved successfully!');
            invalidateTab('question-bank');
            loadCancerTypes();
        } catch (err) {
            showError(err.message);
        } finally {
            saveBtn.disabled = false;
            saveBtn.textContent = 'Save Changes';
        }
    });

    // Question form submit
    document.getElementById('question-form').addEventListener('submit', async function (e) {
        e.preventDefault();
        const index = parseInt(document.getElementById('q-index').value);
        const questionId = document.getElementById('q-question-id').value;
        const assessmentId = currentCancerType ? currentCancerType.id : '';
        const isGeneric = assessmentId.toLowerCase() === 'generic';

        if (index === -1) {
            const promptEn = document.getElementById('q-prompt-en').value.trim();
            if (!promptEn) {
                showError('Question prompt (English) is required for new questions.');
                return;
            }
            try {
                const bankData = {
                    id: questionId,
                    prompt_en: promptEn,
                    prompt_zh: document.getElementById('q-prompt-zh').value,
                    prompt_ms: document.getElementById('q-prompt-ms').value,
                    prompt_ta: document.getElementById('q-prompt-ta').value,
                    explanationYes_en: document.getElementById('q-expYes-en').value,
                    explanationYes_zh: document.getElementById('q-expYes-zh').value,
                    explanationYes_ms: document.getElementById('q-expYes-ms').value,
                    explanationYes_ta: document.getElementById('q-expYes-ta').value,
                    explanationNo_en: document.getElementById('q-expNo-en').value,
                    explanationNo_zh: document.getElementById('q-expNo-zh').value,
                    explanationNo_ms: document.getElementById('q-expNo-ms').value,
                    explanationNo_ta: document.getElementById('q-expNo-ta').value
                };

                const response = await adminFetch(`${API_BASE}/admin/question-bank`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(bankData)
                });

                const result = await response.json();
                if (!result.success) throw new Error(result.error);

                questionBank.set(questionId, bankData);
            } catch (err) {
                showError(`Failed to create question: ${err.message}`);
                return;
            }
        }

        const targetCancerType = isGeneric
            ? document.getElementById('q-target-cancer').value
            : assessmentId;

        if (!targetCancerType && isGeneric) {
            showError('Please select a target cancer type for generic assessment');
            return;
        }

        const assignment = {
            questionId: questionId,
            assessmentId: assessmentId,
            targetCancerType: targetCancerType,
            weight: document.getElementById('q-weight').value,
            yesValue: document.getElementById('q-yes').value,
            noValue: document.getElementById('q-no').value,
            category: document.getElementById('q-category').value,
            minAge: document.getElementById('q-minage').value || null,
            showExplanation: document.getElementById('q-show-explanation').checked
        };

        if (index >= 0) {
            currentAssignments[index] = assignment;
        } else {
            currentAssignments.push(assignment);
        }

        closeQuestionModal();
        renderAssignmentsList();
    });

    const ctVisibleToggle = document.getElementById('ct-visible');
    if (ctVisibleToggle) {
        ctVisibleToggle.addEventListener('change', () => {
            const label = document.getElementById('ct-visible-label');
            if (label) label.textContent = ctVisibleToggle.checked ? 'Visible' : 'Hidden';
        });
    }

    const showExpToggle = document.getElementById('q-show-explanation');
    if (showExpToggle) {
        showExpToggle.addEventListener('change', () => {
            const label = document.getElementById('q-show-explanation-label');
            if (label) label.textContent = showExpToggle.checked ? 'Shown' : 'Hidden';
        });
    }
}

