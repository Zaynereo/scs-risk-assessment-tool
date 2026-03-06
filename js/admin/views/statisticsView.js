import { API_BASE } from '../api.js';
import { escapeHtml } from '../../utils/escapeHtml.js';

export async function loadStatistics() {
    const loading = document.getElementById('stats-loading');
    const error = document.getElementById('stats-error');
    const content = document.getElementById('stats-content');
    const grid = document.getElementById('stats-grid');
    const riskTable = document.getElementById('risk-distribution-table');
    const ageTable = document.getElementById('age-distribution-table');

    loading.style.display = 'block';
    error.style.display = 'none';
    content.style.display = 'none';

    try {
        const response = await fetch(`${API_BASE}/assessments/stats`);
        const result = await response.json();

        if (!result.success) throw new Error(result.error);

        const stats = result.data;

        let statsHtml = `
            <div class="stat-card">
                <div class="stat-value">${stats.total}</div>
                <div class="stat-label">Total Assessments</div>
            </div>`;

        if (stats.averageRiskScoreByType) {
            Object.entries(stats.averageRiskScoreByType).forEach(([type, avgScore]) => {
                const typeLabel = type.charAt(0).toUpperCase() + type.slice(1);
                statsHtml += `
            <div class="stat-card">
                <div class="stat-value">${escapeHtml(avgScore)}</div>
                <div class="stat-label">Avg Risk (${escapeHtml(typeLabel)})</div>
            </div>`;
            });
        } else {
            statsHtml += `
            <div class="stat-card">
                <div class="stat-value">${stats.averageRiskScore}</div>
                <div class="stat-label">Avg Risk Score</div>
            </div>`;
        }

        grid.innerHTML = statsHtml;

        riskTable.innerHTML = `
            <thead><tr><th>Risk Level</th><th>Count</th><th>Percentage</th></tr></thead>
            <tbody>
                ${Object.entries(stats.riskLevelDistribution || {}).map(([level, count]) => `
                    <tr>
                        <td><span class="badge badge-${escapeHtml(level.toLowerCase())}">${escapeHtml(level)}</span></td>
                        <td>${count}</td>
                        <td>${stats.total > 0 ? ((count / stats.total) * 100).toFixed(1) : 0}%</td>
                    </tr>
                `).join('')}
            </tbody>
        `;

        ageTable.innerHTML = `
            <thead><tr><th>Age Range</th><th>Count</th><th>Percentage</th></tr></thead>
            <tbody>
                ${Object.entries(stats.ageDistribution || {}).map(([age, count]) => `
                    <tr>
                        <td>${escapeHtml(age)}</td>
                        <td>${count}</td>
                        <td>${stats.total > 0 ? ((count / stats.total) * 100).toFixed(1) : 0}%</td>
                    </tr>
                `).join('')}
            </tbody>
        `;

        const cancerTypeTable = document.getElementById('cancer-type-distribution-table');
        cancerTypeTable.innerHTML = `
            <thead><tr><th>Cancer Type</th><th>Count</th><th>Percentage</th></tr></thead>
            <tbody>
                ${Object.entries(stats.assessmentTypeDistribution || {}).map(([type, count]) => `
                    <tr>
                        <td>${escapeHtml(type.charAt(0).toUpperCase() + type.slice(1))}</td>
                        <td>${count}</td>
                        <td>${stats.total > 0 ? ((count / stats.total) * 100).toFixed(1) : 0}%</td>
                    </tr>
                `).join('')}
            </tbody>
        `;

        loading.style.display = 'none';
        content.style.display = 'block';
    } catch (err) {
        loading.style.display = 'none';
        error.textContent = `Error: ${err.message}`;
        error.style.display = 'block';
    }
}

window.loadStatistics = loadStatistics;
