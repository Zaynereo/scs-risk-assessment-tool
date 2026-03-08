import { API_BASE, adminFetch } from '../api.js';
import { showError } from '../notifications.js';
import { questionBank, clearQuestionBank, allCancerTypes } from '../state.js';
import { loadCancerTypesCache, addExistingQuestion, openCancerTypeEditor } from './contentView.js';
import { escapeHtml } from '../../utils/escapeHtml.js';
import { initLangTabs, getActiveLang, onLangChange, clearLangChangeListeners } from '../langTabs.js';

export async function loadQuestionBank() {
    const loading = document.getElementById('qb-loading');
    const error = document.getElementById('qb-error');
    const table = document.getElementById('qb-table');
    const tbody = document.getElementById('qb-tbody');

    loading.style.display = 'block';
    error.style.display = 'none';
    table.style.display = 'none';

    try {
        const response = await adminFetch(`${API_BASE}/admin/question-bank`);
        const result = await response.json();

        if (!result.success) throw new Error(result.error);

        const questions = result.data || [];

        clearQuestionBank();
        questions.forEach(q => {
            questionBank.set(q.id, q);
        });

        if (questions.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 20px;">No questions in bank yet.</td></tr>';
        } else {
            await loadCancerTypesCache();
            const cancerTypeMap = new Map(allCancerTypes.map(ct => [ct.id, ct.name_en || ct.id]));

            tbody.innerHTML = questions.map(q => {
                const sourceList = (q.sources || []).map(s => {
                    const ct = (s.cancerType || '').trim();
                    if (!ct) return escapeHtml(s.type);
                    const ctName = cancerTypeMap.get(ct) || ct;
                    return s.type === 'generic'
                        ? `Generic \u2192 ${escapeHtml(ctName)}`
                        : escapeHtml(ctName);
                });
                const usedInCell = sourceList.length === 0
                    ? '<span style="color: var(--color-light-text);">Not used</span>'
                    : sourceList.length === 1
                        ? sourceList[0]
                        : `<details><summary style="cursor: pointer;">Used in ${sourceList.length} assessments</summary><ul style="margin: 6px 0 0 0; padding-left: 20px;">${sourceList.map(s => `<li>${s}</li>`).join('')}</ul></details>`;

                const prompt = (q.prompt_en || '').length > 120
                    ? q.prompt_en.substring(0, 117) + '...'
                    : q.prompt_en || '';

                return `
                    <tr>
                        <td><code>${escapeHtml(q.id)}</code></td>
                        <td>${prompt ? escapeHtml(prompt) : '<span style="color: var(--color-light-text);">[No English prompt]</span>'}</td>
                        <td>${usedInCell}</td>
                        <td>
                            <button class="btn btn-sm btn-outline" data-action="edit-bank" data-qid="${escapeHtml(q.id)}" title="Edit text & explanations" style="margin-right: 6px;">
                                Edit
                            </button>
                            <button class="btn btn-sm btn-outline" data-action="use-in-assessment" data-qid="${escapeHtml(q.id)}" title="Add to an assessment">
                                Use in Assessment
                            </button>
                        </td>
                    </tr>
                `;
            }).join('');
        }

        // Event delegation for table actions
        if (!tbody._delegateAttached) {
            tbody._delegateAttached = true;
            tbody.addEventListener('click', (e) => {
                const btn = e.target.closest('[data-action]');
                if (!btn) return;
                if (btn.dataset.action === 'edit-bank') openEditBankQuestion(btn.dataset.qid);
                else if (btn.dataset.action === 'use-in-assessment') useQuestionInAssessment(btn.dataset.qid);
            });
        }

        loading.style.display = 'none';
        table.style.display = 'table';
    } catch (err) {
        loading.style.display = 'none';
        error.textContent = `Error: ${err.message}`;
        error.style.display = 'block';
    }
}

export function openEditBankQuestion(questionId) {
    const entry = questionBank.get(questionId);
    if (!entry) {
        alert('Question not found in Question Bank. Try refreshing the tab.');
        return;
    }

    document.getElementById('qb-q-id').value = entry.id;
    document.getElementById('qb-q-prompt-en').value = entry.prompt_en || '';
    document.getElementById('qb-q-prompt-zh').value = entry.prompt_zh || '';
    document.getElementById('qb-q-prompt-ms').value = entry.prompt_ms || '';
    document.getElementById('qb-q-prompt-ta').value = entry.prompt_ta || '';
    document.getElementById('qb-q-expYes-en').value = entry.explanationYes_en || '';
    document.getElementById('qb-q-expYes-zh').value = entry.explanationYes_zh || '';
    document.getElementById('qb-q-expYes-ms').value = entry.explanationYes_ms || '';
    document.getElementById('qb-q-expYes-ta').value = entry.explanationYes_ta || '';
    document.getElementById('qb-q-expNo-en').value = entry.explanationNo_en || '';
    document.getElementById('qb-q-expNo-zh').value = entry.explanationNo_zh || '';
    document.getElementById('qb-q-expNo-ms').value = entry.explanationNo_ms || '';
    document.getElementById('qb-q-expNo-ta').value = entry.explanationNo_ta || '';

    document.getElementById('qb-question-modal').classList.add('active');
    clearLangChangeListeners();
    initLangTabs('#qb-question-modal');
    bindQbPreview();
}

function bindQbPreview() {
    function update() {
        const l = getActiveLang();
        const promptEl = document.getElementById(`qb-q-prompt-${l}`);
        const expYesEl = document.getElementById(`qb-q-expYes-${l}`);
        const expNoEl = document.getElementById(`qb-q-expNo-${l}`);
        const pp = document.getElementById('qb-preview-prompt');
        if (pp) pp.textContent = promptEl?.value || 'Question text?';
        const py = document.getElementById('qb-preview-expYes');
        if (py) py.textContent = expYesEl?.value || 'Explanation text';
        const pn = document.getElementById('qb-preview-expNo');
        if (pn) pn.textContent = expNoEl?.value || 'Explanation text';
    }
    const langs = ['en', 'zh', 'ms', 'ta'];
    langs.forEach(l => {
        ['qb-q-prompt-', 'qb-q-expYes-', 'qb-q-expNo-'].forEach(p => {
            const el = document.getElementById(p + l);
            if (el) el.addEventListener('input', update);
        });
    });
    onLangChange(update);
    update();
}

export function closeQbQuestionModal() {
    const modal = document.getElementById('qb-question-modal');
    modal.classList.remove('active');
    document.getElementById('qb-question-form').reset();
}

export async function useQuestionInAssessment(questionId) {
    await loadCancerTypesCache();

    const dialog = document.createElement('div');
    dialog.className = 'modal';
    dialog.style.display = 'block';
    dialog.innerHTML = `
        <div class="modal-content" style="max-width: 500px;">
            <div class="modal-header">
                <h2>Add Question to Assessment</h2>
                <button class="close-btn" data-action="close-dialog">&times;</button>
            </div>
            <div class="modal-body">
                <p>Select an assessment to add this question to:</p>
                <select id="select-assessment" style="width: 100%; padding: 8px; margin: 16px 0;">
                    <option value="">Select assessment...</option>
                    ${allCancerTypes.map(ct => `
                        <option value="${escapeHtml(ct.id)}">${escapeHtml(ct.name_en || ct.id)}</option>
                    `).join('')}
                </select>
                <div class="form-actions">
                    <button class="btn btn-secondary" data-action="close-dialog">Cancel</button>
                    <button class="btn btn-primary" data-action="confirm-add" data-qid="${escapeHtml(questionId)}">
                        Add Question
                    </button>
                </div>
            </div>
        </div>
    `;
    dialog.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-action]');
        if (!btn) return;
        if (btn.dataset.action === 'confirm-add') {
            addQuestionToAssessment(btn.dataset.qid);
            dialog.remove();
        } else if (btn.dataset.action === 'close-dialog') {
            dialog.remove();
        }
    });
    document.body.appendChild(dialog);
}

export function addQuestionToAssessment(questionId) {
    const assessmentId = document.getElementById('select-assessment').value;
    if (!assessmentId) {
        alert('Please select an assessment');
        return;
    }

    document.querySelector('.sidebar-item[data-tab="content"]').click();
    setTimeout(() => {
        openCancerTypeEditor(assessmentId).then(() => {
            setTimeout(() => {
                addExistingQuestion(questionId);
            }, 500);
        });
    }, 100);
}

// Bind form event listeners
export function initQuestionBankView() {
    document.getElementById('qb-question-form').addEventListener('submit', async function (e) {
        e.preventDefault();

        const id = document.getElementById('qb-q-id').value;
        const prompt_en = document.getElementById('qb-q-prompt-en').value;
        const prompt_zh = document.getElementById('qb-q-prompt-zh').value;
        const prompt_ms = document.getElementById('qb-q-prompt-ms').value;
        const prompt_ta = document.getElementById('qb-q-prompt-ta').value;
        const explanationYes_en = document.getElementById('qb-q-expYes-en').value;
        const explanationYes_zh = document.getElementById('qb-q-expYes-zh').value;
        const explanationYes_ms = document.getElementById('qb-q-expYes-ms').value;
        const explanationYes_ta = document.getElementById('qb-q-expYes-ta').value;
        const explanationNo_en = document.getElementById('qb-q-expNo-en').value;
        const explanationNo_zh = document.getElementById('qb-q-expNo-zh').value;
        const explanationNo_ms = document.getElementById('qb-q-expNo-ms').value;
        const explanationNo_ta = document.getElementById('qb-q-expNo-ta').value;

        const submitBtn = this.querySelector('button[type="submit"]');
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = 'Saving...';
        }

        try {
            const response = await adminFetch(`${API_BASE}/admin/question-bank/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    prompt_en, prompt_zh, prompt_ms, prompt_ta,
                    explanationYes_en, explanationYes_zh, explanationYes_ms, explanationYes_ta,
                    explanationNo_en, explanationNo_zh, explanationNo_ms, explanationNo_ta
                })
            });

            const result = await response.json();
            if (!result.success) throw new Error(result.error);

            questionBank.set(id, {
                ...(questionBank.get(id) || { id }),
                prompt_en, prompt_zh, prompt_ms, prompt_ta,
                explanationYes_en, explanationYes_zh, explanationYes_ms, explanationYes_ta,
                explanationNo_en, explanationNo_zh, explanationNo_ms, explanationNo_ta
            });

            closeQbQuestionModal();
            loadQuestionBank();
        } catch (err) {
            const error = document.getElementById('qb-error');
            if (error) {
                error.textContent = `Error: ${err.message}`;
                error.style.display = 'block';
            } else {
                alert(`Failed to save question: ${err.message}`);
            }
        } finally {
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Save Changes';
            }
        }
    });
}

// Expose to window for onclick handlers in HTML
window.loadQuestionBank = loadQuestionBank;
window.openEditBankQuestion = openEditBankQuestion;
window.closeQbQuestionModal = closeQbQuestionModal;
window.useQuestionInAssessment = useQuestionInAssessment;
window.addQuestionToAssessment = addQuestionToAssessment;
