import { API_BASE, adminFetch } from '../api.js';
import { showError } from '../notifications.js';
import { escapeHtml } from '../../utils/escapeHtml.js';

let _allAssessmentData = [];
let _sortColumn = 'riskScore';
let _sortDirection = 'desc';

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

        _bindSortHeaders('assessments-table');
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

function _sortData(data) {
    const sorted = [...data];
    const dir = _sortDirection === 'asc' ? 1 : -1;

    sorted.sort((a, b) => {
        let valA, valB;

        switch (_sortColumn) {
            case 'age':
                valA = parseInt(a.age) || 0;
                valB = parseInt(b.age) || 0;
                return (valA - valB) * dir;
            case 'riskScore':
                valA = parseFloat(a.riskScore) || 0;
                valB = parseFloat(b.riskScore) || 0;
                return (valA - valB) * dir;
            case 'questions':
                valA = Array.isArray(a.questionsAnswers) ? a.questionsAnswers.length : 0;
                valB = Array.isArray(b.questionsAnswers) ? b.questionsAnswers.length : 0;
                return (valA - valB) * dir;
            case 'date':
                valA = new Date(a.timestamp).getTime() || 0;
                valB = new Date(b.timestamp).getTime() || 0;
                return (valA - valB) * dir;
            default: {
                // String columns: gender, assessmentType, familyHistory, riskLevel
                valA = (a[_sortColumn] || '').toString().toLowerCase();
                valB = (b[_sortColumn] || '').toString().toLowerCase();
                return valA.localeCompare(valB) * dir;
            }
        }
    });

    return sorted;
}

function _bindSortHeaders(tableId) {
    const table = document.getElementById(tableId);
    if (!table || table._sortBound) return;
    table._sortBound = true;

    table.querySelector('thead').addEventListener('click', (e) => {
        const th = e.target.closest('th.sortable');
        if (!th) return;

        const column = th.dataset.sort;
        if (_sortColumn === column) {
            _sortDirection = _sortDirection === 'asc' ? 'desc' : 'asc';
        } else {
            _sortColumn = column;
            _sortDirection = 'desc';
        }

        _updateSortIndicators(table);
        // Re-render with current filtered view
        applyAssessmentFilters();
    });
}

function _updateSortIndicators(table) {
    table.querySelectorAll('th.sortable').forEach(th => {
        th.classList.remove('sort-asc', 'sort-desc');
        if (th.dataset.sort === _sortColumn) {
            th.classList.add(_sortDirection === 'asc' ? 'sort-asc' : 'sort-desc');
        }
    });
}

function _renderAssessmentRows(data) {
    const tbody = document.getElementById('assessments-tbody');
    const sorted = _sortData(data);

    if (sorted.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; padding: 40px;">No assessments match your filters</td></tr>';
    } else {
        tbody.innerHTML = sorted.map(a => {
            const date = new Date(a.timestamp).toLocaleString();
            const questionsAnswers = Array.isArray(a.questionsAnswers) ? a.questionsAnswers : [];
            const assessmentType = a.assessmentType
                ? a.assessmentType.charAt(0).toUpperCase() + a.assessmentType.slice(1)
                : '-';
            return `
                <tr>
                    <td>${escapeHtml(a.age || '-')}</td>
                    <td>${escapeHtml(a.gender || '-')}</td>
                    <td>${escapeHtml(assessmentType)}</td>
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
