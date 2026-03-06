import { API_BASE, adminFetch } from '../api.js';
import { showSuccess, showError } from '../notifications.js';
import { fillAssetSelect, updateAssetPickerTrigger, initAssetPickerDropdown } from '../assetPickerUtils.js';
import { escapeHtml } from '../../utils/escapeHtml.js';
import { initLangTabs, getActiveLang, onLangChange, clearLangChangeListeners } from '../langTabs.js';
import {
    currentCancerType, setCurrentCancerType,
    currentAssignments, setCurrentAssignments,
    questionBank, clearQuestionBank,
    allCancerTypes, setAllCancerTypes,
    isNewCancerType, setIsNewCancerType
} from '../state.js';

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
        const expYesEl = document.getElementById(`${prefix}-expYes-${l}`);
        const expNoEl = document.getElementById(`${prefix}-expNo-${l}`);
        const pp = document.getElementById(`${prefix}-preview-prompt`);
        if (pp) pp.textContent = promptEl?.value || 'Question text?';
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
            ? '<div class="card-icon card-icon-img"><img src="' + iconEsc + '" alt="" onerror="this.onerror=null;this.style.display=\'none\';var s=this.nextElementSibling;if(s)s.style.display=\'inline\';"><span class="card-icon-fallback" style="display:none">\uD83C\uDFE5</span></div>'
            : `<div class="card-icon">${(ct.icon || '\uD83C\uDFE5').replace(/</g, '&lt;')}</div>`;
        const isFirst = idx === 0;
        const isLast = idx === cancerTypes.length - 1;
        return `
        <div class="cancer-type-card" draggable="true" data-ct-id="${escapeHtml(ct.id)}" data-action="open-editor">
            <div class="card-header">
                ${iconOrImg}
                <div class="card-header-actions">
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
            <div class="card-stats">${escapeHtml(summaryLine)}</div>
            <div class="card-status ${ct.isValid ? 'valid' : 'invalid'}">
                ${ct.isValid ? '\u2713 Valid' : '\u26A0 Needs adjustment'}
            </div>
        </div>
    `;
    }).join('');

    html += `
        <div class="cancer-type-card add-cancer-type-card" data-action="new-editor">
            <div class="add-icon">+</div>
            <div class="add-text">Add Cancer Type</div>
        </div>
    `;

    grid.innerHTML = html;
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
                case 'open-editor': openCancerTypeEditor(ctId); break;
                case 'new-editor': openNewCancerTypeEditor(); break;
                case 'move-up': e.stopPropagation(); moveCancerType(ctId, -1); break;
                case 'move-down': e.stopPropagation(); moveCancerType(ctId, 1); break;
                case 'delete-ct': e.stopPropagation(); deleteCancerType(ctId, actionEl.dataset.ctName); break;
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

export function openNewCancerTypeEditor() {
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

    document.getElementById('modal-title').textContent = 'Add Cancer Type';
    document.getElementById('questions-container').innerHTML = '';
    updateQuestionsCount();
    updateTotalWeight();
    renderOnboardingBudgetSummary();
    attachOnboardingFieldListeners();

    document.getElementById('target-cancer-group').style.display = 'none';
    document.getElementById('cancer-type-modal').classList.add('active');
    clearLangChangeListeners();
    initLangTabs('#cancer-type-modal');
    bindCancerTypePreview();
}

export async function openCancerTypeEditor(id) {
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

        document.getElementById('modal-title').textContent = `Edit: ${ct.name_en || ct.id}`;

        const isGeneric = id.toLowerCase() === 'generic';
        document.getElementById('target-cancer-group').style.display = isGeneric ? 'block' : 'none';
        populateTargetCancerDropdown();

        renderAssignmentsList();
        renderOnboardingBudgetSummary();
        attachOnboardingFieldListeners();
        document.getElementById('cancer-type-modal').classList.add('active');
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
            const quizTarget = getQuizWeightTarget(currentCancerType);
            const onboardingTotal = 100 - quizTarget;
            const isValid = Math.round(sum * 100) === Math.round(quizTarget * 100);
            const diff = (quizTarget - sum).toFixed(2);
            const requirementText = isGeneric
                ? (isValid ? `\u2713 ${sum.toFixed(0)}% + ${onboardingTotal}% = 100%` : (diff > 0 ? `Need ${diff}% more` : `Reduce by ${Math.abs(diff)}%`))

                : '(part of overall total)';
            const groupName = isGeneric
                ? (key === '_unspecified' ? 'Unspecified target' : ((allCancerTypes || []).find(c => (c.id || '').toLowerCase() === key)?.name_en || key))
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
                                <div style="display: flex; gap: 16px; font-size: 0.8rem; color: var(--color-light-text);">
                                    <span>Weight: <strong>${escapeHtml(assign.weight || 0)}%</strong></span>
                                    <span>Category: ${escapeHtml(assign.category || '-')}</span>
                                    <span>Yes: ${escapeHtml(assign.yesValue || 100)}% / No: ${escapeHtml(assign.noValue || 0)}%</span>
                                    ${assign.minAge ? `<span>Min Age: ${escapeHtml(assign.minAge)}</span>` : ''}
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

    const quizTarget = getQuizWeightTarget(currentCancerType);
    const onboardingBudget = 100 - quizTarget;

    if (isGeneric) {
        const byTarget = {};
        currentAssignments.forEach(a => {
            const target = (a.targetCancerType || '').toLowerCase().trim();
            if (!target) return;
            if (!byTarget[target]) byTarget[target] = 0;
            byTarget[target] += parseFloat(a.weight) || 0;
        });
        const targetList = Object.entries(byTarget)
            .map(([targetId, sum]) => {
                const isValid = Math.round(sum * 100) === Math.round(quizTarget * 100);
                const name = (allCancerTypes || []).find(c => (c.id || '').toLowerCase() === targetId)?.name_en || targetId;
                const combinedTotal = sum + onboardingBudget;
                const diff = (quizTarget - sum).toFixed(2);
                const statusText = isValid
                    ? `\u2713 ${sum.toFixed(0)}% + ${onboardingBudget}% = ${combinedTotal.toFixed(0)}%`
                    : (diff > 0 ? `Need ${diff}% more` : `Reduce by ${Math.abs(diff)}%`);
                const color = isValid ? '#2e7d32' : 'var(--color-risk-high)';
                return `<li style="margin-bottom: 4px;"><strong>${escapeHtml(name)}:</strong> ${sum.toFixed(2)}% <span style="color: ${color};">${escapeHtml(statusText)}</span></li>`;
            })
            .join('');
        const allValid = Object.keys(byTarget).length === 0 || Object.values(byTarget).every(sum => Math.round(sum * 100) === Math.round(quizTarget * 100));
        innerEl.innerHTML = `
            <div style="margin-bottom: 6px;"><strong>Quiz weights by target cancer</strong> <span style="font-size: 0.85rem; color: var(--color-light-text);">(target: ${quizTarget}% per cancer type)</span></div>
            <ul style="margin: 0; padding-left: 20px; font-size: 0.9rem;">${targetList || '<li style="color: var(--color-light-text);">No target cancers yet</li>'}</ul>
            <div id="weight-status" style="font-weight: 600; margin-top: 8px; color: ${allValid ? '#2e7d32' : 'var(--color-risk-high)'};">${allValid ? '\u2713 All targets valid' : '\u26A0 One or more targets need adjustment'}</div>
        `;
    } else {
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
    await loadQuestionBankCache();

    const bankEntries = Array.from(questionBank.values());
    if (bankEntries.length === 0) {
        alert('No questions in the Question Bank yet. Please create a new question first.');
        return;
    }

    const dialog = document.createElement('div');
    dialog.className = 'modal';
    dialog.style.display = 'block';
    dialog.innerHTML = `
        <div class="modal-content" style="max-width: 600px;">
            <div class="modal-header">
                <h2>Add Existing Question</h2>
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
    dialog.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-action]');
        if (!btn) return;
        if (btn.dataset.action === 'add-question') {
            addExistingQuestion(btn.dataset.qid);
            dialog.remove();
        } else if (btn.dataset.action === 'close-dialog') {
            dialog.remove();
        }
    });
    document.body.appendChild(dialog);
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
    const bankId = prompt('Enter a unique Question ID (e.g., Q_SMOKE, Q_DIET_1):');
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

    document.getElementById('question-modal').classList.add('active');
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

    const isGeneric = currentCancerType && currentCancerType.id.toLowerCase() === 'generic';
    document.getElementById('target-cancer-group').style.display = isGeneric ? 'block' : 'none';

    if (bankEntry) {
        document.getElementById('q-bank-text-group').style.display = 'block';
        document.getElementById('q-text-input-group').style.display = 'none';
        document.getElementById('q-bank-text-display').innerHTML = `
            <strong>EN:</strong> ${escapeHtml(bankEntry.prompt_en || '[No English text]')}<br>
            ${bankEntry.prompt_zh ? `<strong>\u4E2D\u6587:</strong> ${escapeHtml(bankEntry.prompt_zh)}<br>` : ''}
            ${bankEntry.prompt_ms ? `<strong>BM:</strong> ${escapeHtml(bankEntry.prompt_ms)}<br>` : ''}
            ${bankEntry.prompt_ta ? `<strong>\u0BA4\u0BAE\u0BBF\u0BB4\u0BCD:</strong> ${escapeHtml(bankEntry.prompt_ta)}` : ''}
        `;
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

    document.getElementById('question-modal').classList.add('active');
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
    document.getElementById('question-modal').classList.remove('active');
    document.getElementById('q-index').value = '';
    document.getElementById('q-question-id').value = '';
    document.getElementById('q-bank-text-group').style.display = 'none';
    document.getElementById('q-text-input-group').style.display = 'none';
    const expHint = document.getElementById('q-exp-hint');
    if (expHint) expHint.style.display = 'none';
}

export function closeModal() {
    document.getElementById('cancer-type-modal').classList.remove('active');
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

        // Init the asset picker dropdown
        initAssetPickerDropdown(selectEl, {
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
            fileInput.onchange = async () => {
                const file = fileInput.files && fileInput.files[0];
                if (!file) return;
                const formData = new FormData();
                formData.append('file', file);
                formData.append('folder', 'cancer-cards');
                try {
                    const res = await adminFetch(`${API_BASE}/admin/assets/upload`, {
                        method: 'POST',
                        body: formData
                    });
                    const contentType = res.headers.get('content-type') || '';
                    if (!contentType.includes('application/json')) {
                        await res.text();
                        throw new Error('Server returned an error. Try again or use a smaller file (max 10MB).');
                    }
                    const data = await res.json();
                    const opt = document.createElement('option');
                    opt.value = data.path;
                    opt.textContent = data.path.split('/').pop();
                    selectEl.appendChild(opt);
                    selectEl.value = data.path;
                    updateAssetPickerTrigger(selectEl);
                    hiddenInput.value = data.path;
                    updateCardImagePreview(data.path);
                    fileInput.value = '';
                } catch (e) {
                    alert('Upload failed: ' + e.message);
                }
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
    preview.innerHTML = '<img src="' + url.replace(/"/g, '&quot;') + '" alt="Preview">';
    preview.style.display = 'block';
}

// Bind form event listeners
export function initContentView() {
    // Cancer type form submit
    document.getElementById('cancer-type-form').addEventListener('submit', async function (e) {
        e.preventDefault();

        const saveBtn = document.getElementById('save-btn');
        saveBtn.disabled = true;
        saveBtn.textContent = 'Saving...';

        const cancerTypeData = {
            id: document.getElementById('ct-id').value.toLowerCase().trim(),
            icon: document.getElementById('ct-icon').value,
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
            familyWeight: document.getElementById('ct-family-weight').value || '10',
            genderFilter: document.getElementById('ct-gender-filter').value || 'all',
            ageRiskThreshold: document.getElementById('ct-age-threshold').value || '0',
            ageRiskWeight: document.getElementById('ct-age-weight').value || '0',
            ethnicityRisk_chinese: document.getElementById('ct-eth-chinese').value || '0',
            ethnicityRisk_malay: document.getElementById('ct-eth-malay').value || '0',
            ethnicityRisk_indian: document.getElementById('ct-eth-indian').value || '0',
            ethnicityRisk_caucasian: document.getElementById('ct-eth-caucasian').value || '0',
            ethnicityRisk_others: document.getElementById('ct-eth-others').value || '0'
        };

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

            closeModal();
            showSuccess(isNewCancerType ? 'Cancer type created successfully!' : 'Changes saved successfully!');
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
            minAge: document.getElementById('q-minage').value || null
        };

        if (index >= 0) {
            currentAssignments[index] = assignment;
        } else {
            currentAssignments.push(assignment);
        }

        closeQuestionModal();
        renderAssignmentsList();
    });
}

// Expose to window for onclick handlers in HTML
window.loadCancerTypes = loadCancerTypes;
window.openNewCancerTypeEditor = openNewCancerTypeEditor;
window.openCancerTypeEditor = openCancerTypeEditor;
window.showAddQuestionDialog = showAddQuestionDialog;
window.addExistingQuestion = addExistingQuestion;
window.addNewQuestion = addNewQuestion;
window.editAssignment = editAssignment;
window.deleteAssignment = deleteAssignment;
window.closeQuestionModal = closeQuestionModal;
window.closeModal = closeModal;
window.deleteCancerType = deleteCancerType;
window.moveCancerType = moveCancerType;
