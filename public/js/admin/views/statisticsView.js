import { API_BASE } from '../api.js';
import { escapeHtml } from '../../utils/escapeHtml.js';

let currentFilters = { startDate: null, endDate: null };

// ── Date filter controls ────────────────────────────────────────────────────

function initFilters() {
    // Preset buttons
    document.querySelectorAll('.stats-preset').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.stats-preset').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const today = new Date();
            const toISODate = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
            const preset = btn.dataset.preset;

            if (preset === 'all') {
                currentFilters = { startDate: null, endDate: null };
            } else if (preset === 'today') {
                currentFilters = { startDate: toISODate(today), endDate: toISODate(today) };
            } else if (preset === '7d') {
                const from = new Date(today);
                from.setDate(today.getDate() - 6);
                currentFilters = { startDate: toISODate(from), endDate: toISODate(today) };
            } else if (preset === '30d') {
                const from = new Date(today);
                from.setDate(today.getDate() - 29);
                currentFilters = { startDate: toISODate(from), endDate: toISODate(today) };
            }

            document.getElementById('stats-date-from').value = currentFilters.startDate || '';
            document.getElementById('stats-date-to').value = currentFilters.endDate || '';
            loadStatistics();
        });
    });

    // Custom date range apply
    document.getElementById('stats-apply-range').addEventListener('click', () => {
        const from = document.getElementById('stats-date-from').value;
        const to = document.getElementById('stats-date-to').value;
        currentFilters = { startDate: from || null, endDate: to || null };
        document.querySelectorAll('.stats-preset').forEach(b => b.classList.remove('active'));
        loadStatistics();
    });
}

// ── Fetch ──────────────────────────────────────────────────────────────────

export async function loadStatistics() {
    const loading = document.getElementById('stats-loading');
    const error = document.getElementById('stats-error');
    const content = document.getElementById('stats-content');

    loading.style.display = 'block';
    error.style.display = 'none';
    content.style.display = 'none';

    try {
        const params = new URLSearchParams();
        if (currentFilters.startDate) params.set('startDate', currentFilters.startDate);
        if (currentFilters.endDate) params.set('endDate', currentFilters.endDate);
        const query = params.toString() ? `?${params}` : '';

        const res = await fetch(`${API_BASE}/assessments/stats${query}`);
        const result = await res.json();
        if (!result.success) throw new Error(result.error);

        renderAll(result.data);
        loading.style.display = 'none';
        content.style.display = 'block';
    } catch (err) {
        loading.style.display = 'none';
        error.textContent = `Error: ${err.message}`;
        error.style.display = 'block';
    }
}

// ── Render helpers ─────────────────────────────────────────────────────────

function pct(count, total) {
    return total > 0 ? ((count / total) * 100).toFixed(1) : '0.0';
}

function barFill(levelClass, widthPct) {
    return `<div class="stats-bar-fill ${levelClass}" style="width:${widthPct}%"></div>`;
}

// ── Section renderers ──────────────────────────────────────────────────────

function renderKPI(data) {
    const { total, riskLevels, avgRiskScore, topCancerType } = data;
    const rl = riskLevels || { LOW: 0, MEDIUM: 0, HIGH: 0 };

    document.getElementById('stats-kpi-grid').innerHTML = `
        <div class="stats-kpi-card">
            <div class="stats-kpi-label">Total Assessments</div>
            <div class="stats-kpi-value">${total}</div>
        </div>
        <div class="stats-kpi-card">
            <div class="stats-kpi-label">Risk Distribution</div>
            <div class="stats-risk-mini-row">
                <div class="stats-risk-mini-item level-low">
                    <div class="stats-risk-mini-count">${rl.LOW}</div>
                    <div class="stats-risk-mini-pct">LOW ${pct(rl.LOW, total)}%</div>
                </div>
                <div class="stats-risk-mini-item level-medium">
                    <div class="stats-risk-mini-count">${rl.MEDIUM}</div>
                    <div class="stats-risk-mini-pct">MED ${pct(rl.MEDIUM, total)}%</div>
                </div>
                <div class="stats-risk-mini-item level-high">
                    <div class="stats-risk-mini-count">${rl.HIGH}</div>
                    <div class="stats-risk-mini-pct">HIGH ${pct(rl.HIGH, total)}%</div>
                </div>
            </div>
        </div>
        <div class="stats-kpi-card">
            <div class="stats-kpi-label">Avg Risk Score</div>
            <div class="stats-kpi-value">${avgRiskScore}<span style="font-size:1rem;font-weight:400">%</span></div>
        </div>
        <div class="stats-kpi-card">
            <div class="stats-kpi-label">Top Assessment</div>
            <div class="stats-kpi-value" style="font-size:1.2rem;text-transform:capitalize">${topCancerType ? escapeHtml(topCancerType.name) : '—'}</div>
            ${topCancerType ? `<div class="stats-kpi-sub">${topCancerType.count} assessments</div>` : ''}
        </div>
    `;
}

function renderRiskBars(data) {
    const { riskLevels, total } = data;
    const rl = riskLevels || { LOW: 0, MEDIUM: 0, HIGH: 0 };
    const levels = [['LOW', 'level-low'], ['MEDIUM', 'level-medium'], ['HIGH', 'level-high']];

    document.getElementById('stats-risk-bars').innerHTML = `
        <h3 class="stats-section-title">Risk Level Distribution</h3>
        ${levels.map(([level, cls]) => `
            <div class="stats-bar-row">
                <div class="stats-bar-label">${level}</div>
                <div class="stats-bar-track">${barFill(cls, parseFloat(pct(rl[level], total)))}</div>
                <div class="stats-bar-value">${rl[level]} <span style="color:var(--color-light-text)">(${pct(rl[level], total)}%)</span></div>
            </div>
        `).join('')}
    `;
}

function renderCancerType(data) {
    const types = data.byCancerType || [];
    if (types.length === 0) {
        document.getElementById('stats-cancer-type').innerHTML = `<h3 class="stats-section-title">By Assessment Type</h3><p style="color:var(--color-light-text)">No data.</p>`;
        return;
    }

    const rows = types.map(t => {
        const total = t.count;
        const lowW = parseFloat(pct(t.LOW, total));
        const medW = parseFloat(pct(t.MEDIUM, total));
        const highW = parseFloat(pct(t.HIGH, total));
        const segBar = `<div class="stats-seg-bar">
            <div class="stats-seg-bar-low" style="width:${lowW}%"></div>
            <div class="stats-seg-bar-medium" style="width:${medW}%"></div>
            <div class="stats-seg-bar-high" style="width:${highW}%"></div>
        </div>`;

        return `<tr>
            <td style="text-transform:capitalize">${escapeHtml(t.name)}</td>
            <td>${t.count}</td>
            <td>${t.avgRisk}%</td>
            <td style="color:#2e7d32">${t.LOW}</td>
            <td style="color:#f57c00">${t.MEDIUM}</td>
            <td style="color:var(--color-risk-high)">${t.HIGH}</td>
            <td>${segBar}</td>
        </tr>`;
    }).join('');

    document.getElementById('stats-cancer-type').innerHTML = `
        <h3 class="stats-section-title">By Assessment Type</h3>
        <table class="stats-table">
            <thead><tr><th>Type</th><th>Count</th><th>Avg Risk</th><th style="color:#2e7d32">LOW</th><th style="color:#f57c00">MED</th><th style="color:var(--color-risk-high)">HIGH</th><th>Distribution</th></tr></thead>
            <tbody>${rows}</tbody>
        </table>
    `;
}

function renderAge(data) {
    const byAge = data.byAge || [];
    const section = document.getElementById('stats-age');
    if (byAge.length === 0) {
        section.innerHTML = `<h3 class="stats-section-title">Age Analysis</h3><p style="color:var(--color-light-text)">No data.</p>`;
        return;
    }

    // Group into brackets
    const brackets = [
        { label: 'Under 20', min: 0, max: 19 },
        { label: '20–29', min: 20, max: 29 },
        { label: '30–39', min: 30, max: 39 },
        { label: '40–49', min: 40, max: 49 },
        { label: '50–59', min: 50, max: 59 },
        { label: '60+', min: 60, max: Infinity },
    ];

    const grouped = brackets.map(b => {
        const rows = byAge.filter(a => a.age >= b.min && a.age <= b.max);
        const count = rows.reduce((s, r) => s + r.count, 0);
        const totalRisk = rows.reduce((s, r) => s + r.avgRisk * r.count, 0);
        const LOW = rows.reduce((s, r) => s + r.LOW, 0);
        const MEDIUM = rows.reduce((s, r) => s + r.MEDIUM, 0);
        const HIGH = rows.reduce((s, r) => s + r.HIGH, 0);
        return { label: b.label, count, avgRisk: count > 0 ? Math.round(totalRisk / count * 100) / 100 : 0, LOW, MEDIUM, HIGH };
    }).filter(g => g.count > 0);

    const summaryRows = grouped.map(g => `<tr>
        <td>${escapeHtml(g.label)}</td>
        <td>${g.count}</td>
        <td>${g.avgRisk}%</td>
        <td style="color:#2e7d32">${g.LOW}</td>
        <td style="color:#f57c00">${g.MEDIUM}</td>
        <td style="color:var(--color-risk-high)">${g.HIGH}</td>
    </tr>`).join('');

    const detailRows = byAge.map(a => `<tr>
        <td>${a.age}</td>
        <td>${a.count}</td>
        <td>${a.avgRisk}%</td>
        <td style="color:#2e7d32">${a.LOW}</td>
        <td style="color:#f57c00">${a.MEDIUM}</td>
        <td style="color:var(--color-risk-high)">${a.HIGH}</td>
    </tr>`).join('');

    const tableHead = `<thead><tr><th>Age</th><th>Count</th><th>Avg Risk</th><th style="color:#2e7d32">LOW</th><th style="color:#f57c00">MED</th><th style="color:var(--color-risk-high)">HIGH</th></tr></thead>`;

    section.innerHTML = `
        <h3 class="stats-section-title">Age Analysis</h3>
        <table class="stats-table">${tableHead}<tbody>${summaryRows}</tbody></table>
        <details style="margin-top:10px">
            <summary style="cursor:pointer;font-size:0.85rem;color:var(--color-light-text)">Show individual ages</summary>
            <table class="stats-table" style="margin-top:8px">${tableHead}<tbody>${detailRows}</tbody></table>
        </details>
    `;
}

function renderDemographics(data) {
    const genders = data.byGender || [];
    const fh = data.byFamilyHistory || [];

    function tableRows(rows, keyProp) {
        return rows.filter(r => r.count > 0).map(r => `<tr>
            <td>${escapeHtml(String(r[keyProp]))}</td>
            <td>${r.count}</td>
            <td>${r.avgRisk}%</td>
            <td style="color:#2e7d32">${r.LOW}</td>
            <td style="color:#f57c00">${r.MEDIUM}</td>
            <td style="color:var(--color-risk-high)">${r.HIGH}</td>
        </tr>`).join('');
    }

    const thead = `<thead><tr><th></th><th>Count</th><th>Avg Risk</th><th style="color:#2e7d32">LOW</th><th style="color:#f57c00">MED</th><th style="color:var(--color-risk-high)">HIGH</th></tr></thead>`;

    const fhLabeled = fh.map(r => ({ ...r, label: r.familyHistory ? 'With family history' : 'No family history' }));

    document.getElementById('stats-demographics').innerHTML = `
        <h3 class="stats-section-title">Demographics</h3>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:20px">
            <div>
                <p style="font-size:0.82rem;font-weight:600;color:var(--color-light-text);margin:0 0 6px">Gender</p>
                <table class="stats-table">${thead}<tbody>${tableRows(genders, 'gender')}</tbody></table>
            </div>
            <div>
                <p style="font-size:0.82rem;font-weight:600;color:var(--color-light-text);margin:0 0 6px">Family History</p>
                <table class="stats-table">
                    <thead><tr><th></th><th>Count</th><th>Avg Risk</th><th style="color:#2e7d32">LOW</th><th style="color:#f57c00">MED</th><th style="color:var(--color-risk-high)">HIGH</th></tr></thead>
                    <tbody>${fhLabeled.filter(r => r.count > 0).map(r => `<tr>
                        <td>${escapeHtml(r.label)}</td>
                        <td>${r.count}</td>
                        <td>${r.avgRisk}%</td>
                        <td style="color:#2e7d32">${r.LOW}</td>
                        <td style="color:#f57c00">${r.MEDIUM}</td>
                        <td style="color:var(--color-risk-high)">${r.HIGH}</td>
                    </tr>`).join('')}</tbody>
                </table>
            </div>
        </div>
    `;
}

function renderCategories(data) {
    const cats = data.categoryRisks || [];
    const section = document.getElementById('stats-categories');
    if (cats.length === 0) {
        section.innerHTML = `<h3 class="stats-section-title">Risk Category Breakdown</h3><p style="color:var(--color-light-text)">No data.</p>`;
        return;
    }

    const max = Math.max(...cats.map(c => c.avgContribution), 1);
    const bars = cats.map(c => `
        <div class="stats-bar-row">
            <div class="stats-bar-label" style="font-size:0.78rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escapeHtml(c.category)}</div>
            <div class="stats-bar-track">${barFill('level-category', (c.avgContribution / max) * 100)}</div>
            <div class="stats-bar-value">${c.avgContribution}</div>
        </div>
    `).join('');

    section.innerHTML = `
        <h3 class="stats-section-title">Risk Category Breakdown <span style="font-size:0.78rem;font-weight:400;color:var(--color-light-text)">(avg contribution per assessment)</span></h3>
        ${bars}
    `;
}

function renderQuestions(data) {
    const qs = data.topQuestions || [];
    const section = document.getElementById('stats-questions');
    if (qs.length === 0) {
        section.innerHTML = `<h3 class="stats-section-title">Top Risk Questions</h3><p style="color:var(--color-light-text)">No data.</p>`;
        return;
    }

    const rows = qs.map(q => `<tr>
        <td style="max-width:300px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${escapeHtml(q.questionText)}">${escapeHtml(q.questionText)}</td>
        <td>${escapeHtml(q.category)}</td>
        <td>${q.yesRate}%</td>
        <td>${q.avgContribution}</td>
    </tr>`).join('');

    section.innerHTML = `
        <h3 class="stats-section-title">Top Risk Questions <span style="font-size:0.78rem;font-weight:400;color:var(--color-light-text)">(by Yes rate, top 10)</span></h3>
        <table class="stats-table">
            <thead><tr><th>Question</th><th>Category</th><th>Yes Rate</th><th>Avg Contribution</th></tr></thead>
            <tbody>${rows}</tbody>
        </table>
    `;
}

function renderAll(data) {
    renderKPI(data);
    renderRiskBars(data);
    renderCancerType(data);
    renderAge(data);
    renderDemographics(data);
    renderCategories(data);
    renderQuestions(data);
}

// ── Init ───────────────────────────────────────────────────────────────────

initFilters();

window.loadStatistics = loadStatistics;
