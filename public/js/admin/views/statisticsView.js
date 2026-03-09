import { API_BASE } from '../api.js';
import { escapeHtml } from '../../utils/escapeHtml.js';

let currentFilters = { startDate: null, endDate: null };
let cachedRawRows = [];

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

function renderAgeHeatmap(data) {
    const section = document.getElementById('stats-age-heatmap');
    const rows = data.ageByType || [];

    if (rows.length === 0) {
        section.innerHTML = `<h3 class="stats-section-title">Age × Cancer Type Risk</h3><p style="color:var(--color-light-text)">No data.</p>`;
        return;
    }

    const brackets = [
        { label: 'Under 20', min: 0, max: 19 },
        { label: '20–29', min: 20, max: 29 },
        { label: '30–39', min: 30, max: 39 },
        { label: '40–49', min: 40, max: 49 },
        { label: '50–59', min: 50, max: 59 },
        { label: '60+', min: 60, max: Infinity },
    ];

    const types = [...new Set(rows.map(r => r.assessmentType))].sort();

    function cellHtml(bracketRows, type) {
        const typeRows = bracketRows.filter(r => r.assessmentType === type);
        if (typeRows.length === 0) return '<td>—</td>';
        const count = typeRows.reduce((s, r) => s + r.count, 0);
        const LOW = typeRows.reduce((s, r) => s + r.LOW, 0);
        const MEDIUM = typeRows.reduce((s, r) => s + r.MEDIUM, 0);
        const HIGH = typeRows.reduce((s, r) => s + r.HIGH, 0);
        const lPct = count > 0 ? ((LOW / count) * 100).toFixed(0) : 0;
        const mPct = count > 0 ? ((MEDIUM / count) * 100).toFixed(0) : 0;
        const hPct = count > 0 ? ((HIGH / count) * 100).toFixed(0) : 0;
        return `<td>
            <div class="heatmap-mini-bar">
                <div class="heatmap-mini-low" style="width:${lPct}%"></div>
                <div class="heatmap-mini-med" style="width:${mPct}%"></div>
                <div class="heatmap-mini-high" style="width:${hPct}%"></div>
            </div>
            <div class="heatmap-pcts">
                <span style="color:#2e7d32">${lPct}%</span>
                <span style="color:#f57c00">${mPct}%</span>
                <span style="color:var(--color-risk-high)">${hPct}%</span>
            </div>
        </td>`;
    }

    const headerCells = types.map(t => `<th style="text-transform:capitalize">${escapeHtml(t)}</th>`).join('');

    const summaryTbody = brackets.map(b => {
        const bracketRows = rows.filter(r => r.age >= b.min && r.age <= b.max);
        const hasData = bracketRows.some(r => types.some(t => r.assessmentType === t));
        if (!hasData) return '';
        return `<tr><td><strong>${escapeHtml(b.label)}</strong></td>${types.map(t => cellHtml(bracketRows, t)).join('')}</tr>`;
    }).join('');

    const individualAges = [...new Set(rows.map(r => r.age))].sort((a, b) => a - b);
    const detailTbody = individualAges.map(age => {
        const ageRows = rows.filter(r => r.age === age);
        return `<tr><td>${age}</td>${types.map(t => cellHtml(ageRows, t)).join('')}</tr>`;
    }).join('');

    const tableHtml = (tbody) => `
        <div class="heatmap-scroll">
            <table class="heatmap-table">
                <thead><tr><th>Age</th>${headerCells}</tr></thead>
                <tbody>${tbody}</tbody>
            </table>
        </div>`;

    section.innerHTML = `
        <h3 class="stats-section-title">Age × Cancer Type Risk</h3>
        ${tableHtml(summaryTbody)}
        <details style="margin-top:10px">
            <summary style="cursor:pointer;font-size:0.85rem;color:var(--color-light-text)">Show individual ages</summary>
            ${tableHtml(detailTbody)}
        </details>
    `;
}

function renderCohortExplorer(data) {
    cachedRawRows = data.rawRows || [];
    const section = document.getElementById('stats-cohort-explorer');

    const cancerTypes = [...new Set(cachedRawRows.map(r => r.assessmentType).filter(Boolean))].sort();
    const genders = [...new Set(cachedRawRows.map(r => r.gender).filter(Boolean))].sort();

    const questionMap = {};
    for (const r of cachedRawRows) {
        for (const qa of (r.questionsAnswers || [])) {
            const qid = qa.questionId || qa.questionid;
            if (qid && !questionMap[qid]) {
                questionMap[qid] = qa.questionText || qa.questiontext || qid;
            }
        }
    }
    const questions = Object.entries(questionMap).sort((a, b) => a[1].localeCompare(b[1]));

    const typeOpts = cancerTypes.map(t => `<option value="${escapeHtml(t)}" style="text-transform:capitalize">${escapeHtml(t)}</option>`).join('');
    const genderOpts = genders.map(g => `<option value="${escapeHtml(g)}">${escapeHtml(g)}</option>`).join('');
    const questionOpts = questions.map(([qid, text]) =>
        `<option value="${escapeHtml(qid)}">${escapeHtml(text.length > 80 ? text.slice(0, 77) + '...' : text)}</option>`
    ).join('');

    section.innerHTML = `
        <h3 class="stats-section-title">Cohort Explorer</h3>
        <p style="font-size:0.82rem;color:var(--color-light-text);margin:0 0 12px">Filter participants to explore any combination of demographics and risk factors.</p>
        <div class="cohort-filter-grid">
            <div class="cohort-filter-item">
                <label for="cohort-cancer-type">Cancer Type</label>
                <select id="cohort-cancer-type"><option value="">All</option>${typeOpts}</select>
            </div>
            <div class="cohort-filter-item">
                <label for="cohort-gender">Gender</label>
                <select id="cohort-gender"><option value="">All</option>${genderOpts}</select>
            </div>
            <div class="cohort-filter-item">
                <label for="cohort-fh">Family History</label>
                <select id="cohort-fh">
                    <option value="">All</option>
                    <option value="true">Yes</option>
                    <option value="false">No</option>
                </select>
            </div>
            <div class="cohort-filter-item">
                <label for="cohort-risk-level">Risk Level</label>
                <select id="cohort-risk-level">
                    <option value="">All</option>
                    <option value="LOW">LOW</option>
                    <option value="MEDIUM">MEDIUM</option>
                    <option value="HIGH">HIGH</option>
                </select>
            </div>
            <div class="cohort-filter-item">
                <label for="cohort-age-min">Age Min</label>
                <input type="number" id="cohort-age-min" min="0" max="120" placeholder="Any">
            </div>
            <div class="cohort-filter-item">
                <label for="cohort-age-max">Age Max</label>
                <input type="number" id="cohort-age-max" min="0" max="120" placeholder="Any">
            </div>
            <div class="cohort-filter-item">
                <label for="cohort-score-min">Score Min %</label>
                <input type="number" id="cohort-score-min" min="0" max="100" placeholder="Any">
            </div>
            <div class="cohort-filter-item">
                <label for="cohort-score-max">Score Max %</label>
                <input type="number" id="cohort-score-max" min="0" max="100" placeholder="Any">
            </div>
        </div>
        <div class="cohort-question-row">
            <div class="cohort-filter-item" style="flex:1">
                <label for="cohort-question">Question Answered</label>
                <select id="cohort-question"><option value="">All questions</option>${questionOpts}</select>
            </div>
            <div class="cohort-filter-item" style="min-width:100px">
                <label for="cohort-q-answer">Answer</label>
                <select id="cohort-q-answer" ${questions.length === 0 ? 'disabled' : ''}>
                    <option value="Yes">Yes</option>
                    <option value="No">No</option>
                </select>
            </div>
            <button class="btn btn-secondary" id="cohort-reset" style="align-self:flex-end;padding:5px 12px">Reset</button>
        </div>
        <div id="cohort-results" class="cohort-results-panel"></div>
    `;

    const ids = ['cohort-cancer-type', 'cohort-gender', 'cohort-fh', 'cohort-risk-level',
                 'cohort-age-min', 'cohort-age-max', 'cohort-score-min', 'cohort-score-max',
                 'cohort-question', 'cohort-q-answer'];
    ids.forEach(id => {
        document.getElementById(id).addEventListener('change', filterAndRenderCohort);
        document.getElementById(id).addEventListener('input', filterAndRenderCohort);
    });
    document.getElementById('cohort-reset').addEventListener('click', () => {
        ids.forEach(id => { document.getElementById(id).value = ''; });
        filterAndRenderCohort();
    });

    filterAndRenderCohort();
}

function filterAndRenderCohort() {
    const cancerType = document.getElementById('cohort-cancer-type').value;
    const gender = document.getElementById('cohort-gender').value;
    const fh = document.getElementById('cohort-fh').value;
    const riskLevel = document.getElementById('cohort-risk-level').value;
    const ageMinRaw = document.getElementById('cohort-age-min').value;
    const ageMaxRaw = document.getElementById('cohort-age-max').value;
    const scoreMinRaw = document.getElementById('cohort-score-min').value;
    const scoreMaxRaw = document.getElementById('cohort-score-max').value;
    const ageMin = ageMinRaw !== '' ? parseInt(ageMinRaw) : null;
    const ageMax = ageMaxRaw !== '' ? parseInt(ageMaxRaw) : null;
    const scoreMin = scoreMinRaw !== '' ? parseFloat(scoreMinRaw) : null;
    const scoreMax = scoreMaxRaw !== '' ? parseFloat(scoreMaxRaw) : null;
    const questionId = document.getElementById('cohort-question').value;
    const questionAnswer = document.getElementById('cohort-q-answer').value;

    let rows = cachedRawRows;
    if (cancerType) rows = rows.filter(r => r.assessmentType === cancerType);
    if (gender) rows = rows.filter(r => r.gender === gender);
    if (fh !== '') rows = rows.filter(r => String(r.familyHistory) === fh);
    if (riskLevel) rows = rows.filter(r => r.riskLevel === riskLevel);
    if (ageMin !== null) rows = rows.filter(r => r.age !== null && r.age >= ageMin);
    if (ageMax !== null) rows = rows.filter(r => r.age !== null && r.age <= ageMax);
    if (scoreMin !== null) rows = rows.filter(r => r.riskScore >= scoreMin);
    if (scoreMax !== null) rows = rows.filter(r => r.riskScore <= scoreMax);
    if (questionId && questionAnswer) {
        rows = rows.filter(r => {
            const qa = (r.questionsAnswers || []).find(q => (q.questionId || q.questionid) === questionId);
            return qa && (qa.userAnswer || qa.useranswer) === questionAnswer;
        });
    }

    renderCohortResults(rows);
}

function renderCohortResults(rows) {
    const el = document.getElementById('cohort-results');
    const total = rows.length;

    if (total === 0) {
        el.innerHTML = `<p style="color:var(--color-light-text);font-size:0.85rem">No participants match the selected filters.</p>`;
        return;
    }

    const rl = { LOW: 0, MEDIUM: 0, HIGH: 0 };
    let totalScore = 0;
    const typeCount = {};
    const catMap = {};
    const qMap = {};

    for (const r of rows) {
        const level = r.riskLevel in rl ? r.riskLevel : 'LOW';
        rl[level]++;
        totalScore += r.riskScore;

        if (r.assessmentType) typeCount[r.assessmentType] = (typeCount[r.assessmentType] || 0) + 1;

        for (const [cat, val] of Object.entries(r.categoryRisks || {})) {
            if (!catMap[cat]) catMap[cat] = { total: 0, count: 0 };
            catMap[cat].total += parseFloat(val) || 0;
            catMap[cat].count++;
        }

        for (const qa of (r.questionsAnswers || [])) {
            const qid = qa.questionId || qa.questionid;
            if (!qid) continue;
            if (!qMap[qid]) qMap[qid] = { text: qa.questionText || qa.questiontext || '', category: qa.category || '', yes: 0, total: 0, contrib: 0 };
            qMap[qid].total++;
            if ((qa.userAnswer || qa.useranswer) === 'Yes') qMap[qid].yes++;
            qMap[qid].contrib += parseFloat(qa.riskContribution || qa.riskcontribution) || 0;
        }
    }

    const avgRisk = (totalScore / total).toFixed(1);
    const topType = Object.entries(typeCount).sort((a, b) => b[1] - a[1])[0] || null;

    const cats = Object.entries(catMap)
        .map(([c, s]) => ({ category: c, avg: s.count > 0 ? Math.round(s.total / s.count * 100) / 100 : 0 }))
        .sort((a, b) => b.avg - a.avg);
    const catMax = cats.length > 0 ? Math.max(...cats.map(c => c.avg), 1) : 1;

    const topQs = Object.entries(qMap)
        .map(([qid, s]) => ({
            qid,
            text: s.text,
            category: s.category,
            yesRate: s.total > 0 ? (s.yes / s.total * 100).toFixed(1) : 0,
            avgContrib: s.total > 0 ? Math.round(s.contrib / s.total * 100) / 100 : 0
        }))
        .sort((a, b) => b.yesRate - a.yesRate)
        .slice(0, 10);

    const riskBar = `
        <div class="stats-bar-row" style="margin-bottom:6px">
            <div class="stats-bar-label" style="font-size:0.75rem">LOW</div>
            <div class="stats-bar-track">${barFill('level-low', parseFloat(pct(rl.LOW, total)))}</div>
            <div class="stats-bar-value" style="font-size:0.75rem">${rl.LOW} (${pct(rl.LOW, total)}%)</div>
        </div>
        <div class="stats-bar-row" style="margin-bottom:6px">
            <div class="stats-bar-label" style="font-size:0.75rem">MED</div>
            <div class="stats-bar-track">${barFill('level-medium', parseFloat(pct(rl.MEDIUM, total)))}</div>
            <div class="stats-bar-value" style="font-size:0.75rem">${rl.MEDIUM} (${pct(rl.MEDIUM, total)}%)</div>
        </div>
        <div class="stats-bar-row">
            <div class="stats-bar-label" style="font-size:0.75rem">HIGH</div>
            <div class="stats-bar-track">${barFill('level-high', parseFloat(pct(rl.HIGH, total)))}</div>
            <div class="stats-bar-value" style="font-size:0.75rem">${rl.HIGH} (${pct(rl.HIGH, total)}%)</div>
        </div>`;

    const catBars = cats.map(c => `
        <div class="stats-bar-row">
            <div class="stats-bar-label" style="font-size:0.75rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escapeHtml(c.category)}</div>
            <div class="stats-bar-track">${barFill('level-category', (c.avg / catMax) * 100)}</div>
            <div class="stats-bar-value" style="font-size:0.75rem">${c.avg}</div>
        </div>`).join('');

    const questionRows = topQs.map(q => `<tr>
        <td style="max-width:260px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${escapeHtml(q.text)}">${escapeHtml(q.text)}</td>
        <td>${escapeHtml(q.category)}</td>
        <td>${q.yesRate}%</td>
        <td>${q.avgContrib}</td>
    </tr>`).join('');

    el.innerHTML = `
        <div class="cohort-summary-row">
            <div class="cohort-summary-item">
                <div class="cohort-summary-label">Participants</div>
                <div class="cohort-summary-value">${total}</div>
            </div>
            <div class="cohort-summary-item">
                <div class="cohort-summary-label">Avg Risk</div>
                <div class="cohort-summary-value">${avgRisk}%</div>
            </div>
            <div class="cohort-summary-item">
                <div class="cohort-summary-label">Top Cancer Type</div>
                <div class="cohort-summary-value">${topType ? escapeHtml(topType[0]) : '—'}</div>
            </div>
        </div>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:20px;margin-bottom:16px">
            <div>
                <p style="font-size:0.78rem;font-weight:600;color:var(--color-light-text);margin:0 0 6px">Risk Distribution</p>
                ${riskBar}
            </div>
            <div>
                <p style="font-size:0.78rem;font-weight:600;color:var(--color-light-text);margin:0 0 6px">Category Breakdown</p>
                ${catBars || '<p style="color:var(--color-light-text);font-size:0.82rem">No category data.</p>'}
            </div>
        </div>
        ${topQs.length > 0 ? `
        <p style="font-size:0.78rem;font-weight:600;color:var(--color-light-text);margin:0 0 6px">Top Risk Questions</p>
        <table class="stats-table">
            <thead><tr><th>Question</th><th>Category</th><th>Yes Rate</th><th>Avg Contrib</th></tr></thead>
            <tbody>${questionRows}</tbody>
        </table>` : ''}
    `;
}

function renderAll(data) {
    renderKPI(data);
    renderRiskBars(data);
    renderCancerType(data);
    renderAge(data);
    renderAgeHeatmap(data);
    renderDemographics(data);
    renderCategories(data);
    renderQuestions(data);
    renderCohortExplorer(data);
}

// ── Init ───────────────────────────────────────────────────────────────────

initFilters();

window.loadStatistics = loadStatistics;
