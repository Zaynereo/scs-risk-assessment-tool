import { API_BASE, adminFetch } from '../api.js';
import { showError } from '../notifications.js';
import { escapeHtml } from '../../utils/escapeHtml.js';

let _allAssessmentData = [];

export async function loadAssessments() {
    const loading = document.getElementById('assessments-loading');
    const error = document.getElementById('assessments-error');
    const table = document.getElementById('assessments-table');
    const tbody = document.getElementById('assessments-tbody');

    loading.style.display = 'block';
    error.style.display = 'none';
    table.style.display = 'none';

    try {
        const response = await adminFetch(`${API_BASE}/admin/assessments`);
        const result = await response.json();

        if (!result.success) throw new Error(result.error);

        // Save the raw data for filtering
        _allAssessmentData = result.data;

        loading.style.display = 'none';
        table.style.display = 'table';

        // Render with current filters applied (or all if none set)
        _renderAssessmentRows(_allAssessmentData);

        // Show filter bar once data is loaded
        const filterBar = document.getElementById('assessments-filter-bar');
        if (filterBar && _allAssessmentData.length > 0) filterBar.style.display = '';
    } catch (err) {
        loading.style.display = 'none';
        error.textContent = `Error: ${err.message}`;
        error.style.display = 'block';
    }
}

function _renderAssessmentRows(data) {
    const tbody = document.getElementById('assessments-tbody');

    if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; padding: 40px;">No assessments match your filters</td></tr>';
    } else {
        tbody.innerHTML = data.map(a => {
            const date = new Date(a.timestamp).toLocaleString();
            const questionsAnswers = Array.isArray(a.questionsAnswers) ? a.questionsAnswers : [];
            return `
                <tr>
                    <td><code style="font-size: 0.75rem;">${escapeHtml(a.id.substring(0, 16))}...</code></td>
                    <td>${escapeHtml(a.age || '-')}</td>
                    <td>${escapeHtml(a.gender || '-')}</td>
                    <td>${escapeHtml(a.familyHistory || '-')}</td>
                    <td><strong>${escapeHtml(a.riskScore)}</strong></td>
                    <td><span class="badge badge-${escapeHtml(a.riskLevel.toLowerCase())}">${escapeHtml(a.riskLevel)}</span></td>
                    <td>${questionsAnswers.length} answered</td>
                    <td>${escapeHtml(date)}</td>
                </tr>
            `;
        }).join('');
    }

    _updateResultsCount(data.length, _allAssessmentData.length);
}

export function applyAssessmentFilters() {
    const gender   = document.getElementById('filter-gender').value.toLowerCase();
    const ageMin   = parseInt(document.getElementById('filter-age-min').value) || 0;
    const ageMax   = parseInt(document.getElementById('filter-age-max').value) || 999;
    const risk     = document.getElementById('filter-risk').value.toLowerCase();
    const dateFrom = document.getElementById('filter-date-from').value;
    const dateTo   = document.getElementById('filter-date-to').value;

    const filtered = _allAssessmentData.filter(a => {
        const rowGender = (a.gender || '').toLowerCase();
        const rowRisk   = (a.riskLevel || '').toLowerCase();
        const rowAge    = parseInt(a.age) || 0;
        const rowDate   = new Date(a.timestamp);

        if (gender && rowGender !== gender) return false;
        if (rowAge < ageMin || rowAge > ageMax) return false;
        if (risk && rowRisk !== risk) return false;
        if (dateFrom && !isNaN(rowDate) && rowDate < new Date(dateFrom)) return false;
        if (dateTo   && !isNaN(rowDate) && rowDate > new Date(dateTo + 'T23:59:59')) return false;

        return true;
    });

    _renderAssessmentRows(filtered);
}

export function clearAssessmentFilters() {
    document.getElementById('filter-gender').value    = '';
    document.getElementById('filter-age-min').value   = '';
    document.getElementById('filter-age-max').value   = '';
    document.getElementById('filter-risk').value      = '';
    document.getElementById('filter-date-from').value = '';
    document.getElementById('filter-date-to').value   = '';
    _renderAssessmentRows(_allAssessmentData);
    _updateResultsCount(_allAssessmentData.length, _allAssessmentData.length);
}

function _updateResultsCount(shown, total) {
    const el = document.getElementById('filter-results-count');
    if (el) el.textContent = shown === total ? `${total} results` : `${shown} of ${total} results`;
}

export async function exportAssessmentsCSV() {
    try {
        const response = await adminFetch(`${API_BASE}/admin/assessments/export`);
        if (!response.ok) throw new Error(`Export failed (${response.status})`);

        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `assessments_${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
    } catch (err) {
        showError(err.message);
    }
}

window.loadAssessments = loadAssessments;
window.exportAssessmentsCSV = exportAssessmentsCSV;
window.applyAssessmentFilters = applyAssessmentFilters;
window.clearAssessmentFilters = clearAssessmentFilters;