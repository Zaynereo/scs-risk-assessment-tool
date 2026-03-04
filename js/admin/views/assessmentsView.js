import { API_BASE, adminFetch } from '../api.js';
import { showError } from '../notifications.js';

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

        if (result.data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; padding: 40px;">No assessments yet</td></tr>';
        } else {
            tbody.innerHTML = result.data.map(a => {
                const date = new Date(a.timestamp).toLocaleString();
                const questionsAnswers = Array.isArray(a.questionsAnswers) ? a.questionsAnswers : [];
                return `
                    <tr>
                        <td><code style="font-size: 0.75rem;">${a.id.substring(0, 16)}...</code></td>
                        <td>${a.age || '-'}</td>
                        <td>${a.gender || '-'}</td>
                        <td>${a.familyHistory || '-'}</td>
                        <td><strong>${a.riskScore}</strong></td>
                        <td><span class="badge badge-${a.riskLevel.toLowerCase()}">${a.riskLevel}</span></td>
                        <td>${questionsAnswers.length} answered</td>
                        <td>${date}</td>
                    </tr>
                `;
            }).join('');
        }

        loading.style.display = 'none';
        table.style.display = 'table';
    } catch (err) {
        loading.style.display = 'none';
        error.textContent = `Error: ${err.message}`;
        error.style.display = 'block';
    }
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
