import { API_BASE, adminFetch } from '../api.js';
import { showSuccess, showError } from '../notifications.js';
import { fillAssetSelect, updateAssetPickerTrigger, initAssetPickerDropdown } from '../assetPickerUtils.js';
import {
    currentCancerType, setCurrentCancerType,
    currentAssignments, setCurrentAssignments,
    questionBank, clearQuestionBank,
    allCancerTypes, setAllCancerTypes,
    isNewCancerType, setIsNewCancerType
} from '../state.js';

const WEIGHT_TOLERANCE = 1;

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

    let html = cancerTypes.map(ct => {
        const isGeneric = (ct.id || '').toLowerCase() === 'generic';
        const targetCount = ct.targetCount != null ? ct.targetCount : Object.keys(ct.weightByTarget || {}).length;
        const summaryLine = isGeneric ? `${ct.questionCount} questions \u00b7 ${targetCount} cancers` : `${ct.questionCount} questions \u00b7 ${ct.totalWeight}% weight`;
        const isImg = ct.icon && (ct.icon.startsWith('http') || ct.icon.startsWith('/') || ct.icon.startsWith('data:') || ct.icon.startsWith('assets/'));
        const iconEsc = (ct.icon || '').replace(/"/g, '&quot;').replace(/</g, '&lt;');
        const iconOrImg = isImg
            ? '<div class="card-icon card-icon-img"><img src="' + iconEsc + '" alt="" onerror="this.onerror=null;this.style.display=\'none\';var s=this.nextElementSibling;if(s)s.style.display=\'inline\';"><span class="card-icon-fallback" style="display:none">\uD83C\uDFE5</span></div>'
            : `<div class="card-icon">${(ct.icon || '\uD83C\uDFE5').replace(/</g, '&lt;')}</div>`;
        return `
        <div class="cancer-type-card" onclick="openCancerTypeEditor('${ct.id}')">
            <div class="card-header">
                ${iconOrImg}
                <button class="delete-btn" onclick="event.stopPropagation(); deleteCancerType('${ct.id}', '${ct.name_en || ct.id}')" title="Delete cancer type">
                    \uD83D\uDDD1\uFE0F
                </button>
            </div>
            <div class="card-title">${ct.name_en || ct.id}</div>
            <div class="card-stats">${summaryLine}</div>
            <div class="card-status ${ct.isValid ? 'valid' : 'invalid'}">
                ${ct.isValid ? '\u2713 Valid' : '\u26A0 Needs adjustment'}
            </div>
        </div>
    `;
    }).join('');

    html += `
        <div class="cancer-type-card add-cancer-type-card" onclick="openNewCancerTypeEditor()">
            <div class="add-icon">+</div>
            <div class="add-text">Add Cancer Type</div>
        </div>
    `;

    grid.innerHTML = html;
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
    document.getElementById('ct-eth-chinese').value = '1.0';
    document.getElementById('ct-eth-malay').value = '1.0';
    document.getElementById('ct-eth-indian').value = '1.0';
    document.getElementById('ct-eth-caucasian').value = '1.0';
    document.getElementById('ct-eth-others').value = '1.0';

    document.getElementById('modal-title').textContent = 'Add Cancer Type';
    document.getElementById('questions-container').innerHTML = '';
    updateQuestionsCount();
    updateTotalWeight();

    document.getElementById('target-cancer-group').style.display = 'none';
    document.getElementById('cancer-type-modal').classList.add('active');
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
        document.getElementById('ct-eth-chinese').value = ct.ethnicityRisk_chinese || '1.0';
        document.getElementById('ct-eth-malay').value = ct.ethnicityRisk_malay || '1.0';
        document.getElementById('ct-eth-indian').value = ct.ethnicityRisk_indian || '1.0';
        document.getElementById('ct-eth-caucasian').value = ct.ethnicityRisk_caucasian || '1.0';
        document.getElementById('ct-eth-others').value = ct.ethnicityRisk_others || '1.0';

        document.getElementById('modal-title').textContent = `Edit: ${ct.name_en || ct.id}`;

        const isGeneric = id.toLowerCase() === 'generic';
        document.getElementById('target-cancer-group').style.display = isGeneric ? 'block' : 'none';
        populateTargetCancerDropdown();

        renderAssignmentsList();
        document.getElementById('cancer-type-modal').classList.add('active');
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
            const isValid = Math.abs(sum - 100) <= WEIGHT_TOLERANCE;
            const diff = (100 - sum).toFixed(2);
            const requirementText = isGeneric
                ? (isValid ? '\u2713 Valid' : (diff > 0 ? `Need ${diff}% more` : `Reduce by ${Math.abs(diff)}%`))
                : '(part of overall total)';
            const groupName = isGeneric
                ? (key === '_unspecified' ? 'Unspecified target' : ((allCancerTypes || []).find(c => (c.id || '').toLowerCase() === key)?.name_en || key))
                : key;

            html += `
                <div class="question-cluster" style="margin-bottom: 20px;">
                    <div class="cluster-header" style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px; padding: 10px 12px; background: var(--color-bg-secondary); border-radius: 6px; margin-bottom: 10px; font-size: 0.9rem;">
                        <strong>${groupName}</strong>
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
                                        <button type="button" class="action-btn edit-btn" onclick="editAssignment(${index})">Edit</button>
                                        <button type="button" class="action-btn delete-btn" onclick="deleteAssignment(${index})">Delete</button>
                                    </div>
                                </div>
                                <div style="font-size: 0.9rem; margin-bottom: 8px;">
                                    <strong>${truncate(prompt, 100)}</strong>
                                    <code style="font-size: 0.75rem; margin-left: 8px; color: var(--color-light-text);">${assign.questionId}</code>
                                    ${targetCancer ? `<span style="font-size: 0.75rem; color: var(--color-light-text); margin-left: 8px;">${targetCancer}</span>` : ''}
                                </div>
                                <div style="display: flex; gap: 16px; font-size: 0.8rem; color: var(--color-light-text);">
                                    <span>Weight: <strong>${assign.weight || 0}%</strong></span>
                                    <span>Category: ${assign.category || '-'}</span>
                                    <span>Yes: ${assign.yesValue || 100}% / No: ${assign.noValue || 0}%</span>
                                    ${assign.minAge ? `<span>Min Age: ${assign.minAge}</span>` : ''}
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            `;
        });
        container.innerHTML = html;
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
        const byTarget = {};
        currentAssignments.forEach(a => {
            const target = (a.targetCancerType || '').toLowerCase().trim();
            if (!target) return;
            if (!byTarget[target]) byTarget[target] = 0;
            byTarget[target] += parseFloat(a.weight) || 0;
        });
        const targetList = Object.entries(byTarget)
            .map(([targetId, sum]) => {
                const isValid = Math.abs(sum - 100) <= WEIGHT_TOLERANCE;
                const name = (allCancerTypes || []).find(c => (c.id || '').toLowerCase() === targetId)?.name_en || targetId;
                const diff = (100 - sum).toFixed(2);
                const status = isValid ? '\u2713 Valid' : (diff > 0 ? `Need ${diff}% more` : `Reduce by ${Math.abs(diff)}%`);
                return `<li style="margin-bottom: 4px;"><strong>${name}:</strong> ${sum.toFixed(2)}% ${isValid ? '<span style="color: #2e7d32;">\u2713 Valid</span>' : '<span style="color: var(--color-risk-high);">' + status + '</span>'}</li>`;
            })
            .join('');
        const allValid = Object.keys(byTarget).length === 0 || Object.values(byTarget).every(sum => Math.abs(sum - 100) <= WEIGHT_TOLERANCE);
        innerEl.innerHTML = `
            <div style="margin-bottom: 6px;"><strong>Weights by target cancer</strong></div>
            <ul style="margin: 0; padding-left: 20px; font-size: 0.9rem;">${targetList || '<li style="color: var(--color-light-text);">No target cancers yet</li>'}</ul>
            <div id="weight-status" style="font-weight: 600; margin-top: 8px; color: ${allValid ? '#2e7d32' : 'var(--color-risk-high)'};">${allValid ? '\u2713 All targets valid' : '\u26A0 One or more targets need adjustment'}</div>
        `;
    } else {
        innerEl.innerHTML = `
            <div>
                <div class="weight-value" id="total-weight">0.00%</div>
                <div class="weight-label">Total Weight</div>
            </div>
            <div id="weight-status" style="font-weight: 600;"></div>
        `;
        const total = currentAssignments.reduce((sum, assign) => sum + (parseFloat(assign.weight) || 0), 0);
        const weightEl = document.getElementById('total-weight');
        const statusEl = document.getElementById('weight-status');
        const isValid = Math.abs(total - 100) <= WEIGHT_TOLERANCE;

        weightEl.textContent = total.toFixed(2) + '%';
        weightEl.className = 'weight-value ' + (isValid ? 'valid' : 'invalid');

        if (isValid) {
            statusEl.textContent = '\u2713 Valid';
            statusEl.style.color = '#2e7d32';
        } else {
            const diff = (100 - total).toFixed(2);
            statusEl.textContent = diff > 0 ? `Need ${diff}% more` : `Reduce by ${Math.abs(diff)}%`;
            statusEl.style.color = 'var(--color-risk-high)';
        }
    }
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
                <button class="close-btn" onclick="this.closest('.modal').remove()">&times;</button>
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
                                    <td style="padding: 8px;"><code>${q.id}</code></td>
                                    <td style="padding: 8px;">${truncate(q.prompt_en || '', 80)}</td>
                                    <td style="padding: 8px;">
                                        <button class="btn btn-sm btn-primary" onclick="addExistingQuestion('${q.id}'); this.closest('.modal').remove();">
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
    document.getElementById('q-exp-en').value = '';
    document.getElementById('q-exp-zh').value = '';
    document.getElementById('q-exp-ms').value = '';
    document.getElementById('q-exp-ta').value = '';
    document.getElementById('q-target-cancer').value = '';
    document.getElementById('q-exp-en').readOnly = false;
    document.getElementById('q-exp-zh').readOnly = false;
    document.getElementById('q-exp-ms').readOnly = false;
    document.getElementById('q-exp-ta').readOnly = false;
    const expHint = document.getElementById('q-exp-hint');
    if (expHint) expHint.style.display = 'none';

    const isGeneric = currentCancerType && currentCancerType.id.toLowerCase() === 'generic';
    document.getElementById('target-cancer-group').style.display = isGeneric ? 'block' : 'none';

    document.getElementById('q-bank-text-group').style.display = 'none';
    document.getElementById('q-text-input-group').style.display = 'block';

    document.getElementById('question-modal').classList.add('active');
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
            <strong>EN:</strong> ${bankEntry.prompt_en || '[No English text]'}<br>
            ${bankEntry.prompt_zh ? `<strong>\u4E2D\u6587:</strong> ${bankEntry.prompt_zh}<br>` : ''}
            ${bankEntry.prompt_ms ? `<strong>BM:</strong> ${bankEntry.prompt_ms}<br>` : ''}
            ${bankEntry.prompt_ta ? `<strong>\u0BA4\u0BAE\u0BBF\u0BB4\u0BCD:</strong> ${bankEntry.prompt_ta}` : ''}
        `;
        document.getElementById('q-exp-en').value = bankEntry.explanation_en || '';
        document.getElementById('q-exp-zh').value = bankEntry.explanation_zh || '';
        document.getElementById('q-exp-ms').value = bankEntry.explanation_ms || '';
        document.getElementById('q-exp-ta').value = bankEntry.explanation_ta || '';
        document.getElementById('q-exp-en').readOnly = true;
        document.getElementById('q-exp-zh').readOnly = true;
        document.getElementById('q-exp-ms').readOnly = true;
        document.getElementById('q-exp-ta').readOnly = true;
        const expHint = document.getElementById('q-exp-hint');
        if (expHint) expHint.style.display = 'block';
    } else {
        document.getElementById('q-bank-text-group').style.display = 'none';
        document.getElementById('q-text-input-group').style.display = 'block';
        document.getElementById('q-prompt-en').value = '';
        document.getElementById('q-prompt-zh').value = '';
        document.getElementById('q-prompt-ms').value = '';
        document.getElementById('q-prompt-ta').value = '';
        document.getElementById('q-exp-en').value = '';
        document.getElementById('q-exp-zh').value = '';
        document.getElementById('q-exp-ms').value = '';
        document.getElementById('q-exp-ta').value = '';
        document.getElementById('q-exp-en').readOnly = false;
        document.getElementById('q-exp-zh').readOnly = false;
        document.getElementById('q-exp-ms').readOnly = false;
        document.getElementById('q-exp-ta').readOnly = false;
        const expHint = document.getElementById('q-exp-hint');
        if (expHint) expHint.style.display = 'none';
    }

    document.getElementById('question-modal').classList.add('active');
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
            ethnicityRisk_chinese: document.getElementById('ct-eth-chinese').value || '1.0',
            ethnicityRisk_malay: document.getElementById('ct-eth-malay').value || '1.0',
            ethnicityRisk_indian: document.getElementById('ct-eth-indian').value || '1.0',
            ethnicityRisk_caucasian: document.getElementById('ct-eth-caucasian').value || '1.0',
            ethnicityRisk_others: document.getElementById('ct-eth-others').value || '1.0'
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
                    explanation_en: document.getElementById('q-exp-en').value,
                    explanation_zh: document.getElementById('q-exp-zh').value,
                    explanation_ms: document.getElementById('q-exp-ms').value,
                    explanation_ta: document.getElementById('q-exp-ta').value
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
