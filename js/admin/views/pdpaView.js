import { API_BASE, adminFetch } from '../api.js';
import { showSuccess, showError } from '../notifications.js';

export async function loadPdpa() {
    const loading = document.getElementById('pdpa-loading');
    const form = document.getElementById('pdpa-form-container');
    const errEl = document.getElementById('pdpa-error');
    loading.style.display = 'block';
    form.style.display = 'none';
    errEl.style.display = 'none';

    try {
        const res = await adminFetch(`${API_BASE}/admin/pdpa`);
        const result = await res.json();
        if (!result.success) throw new Error(result.error);
        const data = result.data || {};

        const enabledCheckbox = document.getElementById('pdpa-enabled');
        enabledCheckbox.checked = !!data.enabled;
        document.getElementById('pdpa-enabled-label').textContent = data.enabled ? 'Enabled' : 'Disabled';
        enabledCheckbox.onchange = () => {
            document.getElementById('pdpa-enabled-label').textContent = enabledCheckbox.checked ? 'Enabled' : 'Disabled';
        };

        const fields = [
            { prefix: 'pdpa-title', key: 'title' },
            { prefix: 'pdpa-purpose', key: 'purpose' },
            { prefix: 'pdpa-data', key: 'dataCollected' },
            { prefix: 'pdpa-checkbox', key: 'checkboxLabel' },
            { prefix: 'pdpa-agree', key: 'agreeButtonText' }
        ];
        const langs = ['en', 'zh', 'ms', 'ta'];
        fields.forEach(({ prefix, key }) => {
            const obj = data[key] || {};
            langs.forEach(lang => {
                const el = document.getElementById(`${prefix}-${lang}`);
                if (el) el.value = obj[lang] || '';
            });
        });

        document.getElementById('pdpa-save-btn').onclick = savePdpa;

        loading.style.display = 'none';
        form.style.display = 'block';
    } catch (err) {
        loading.style.display = 'none';
        errEl.textContent = 'Error: ' + err.message;
        errEl.style.display = 'block';
    }
}

async function savePdpa() {
    const btn = document.getElementById('pdpa-save-btn');
    btn.disabled = true;
    btn.textContent = 'Saving...';
    try {
        const langs = ['en', 'zh', 'ms', 'ta'];
        const getLangValues = (prefix) => {
            const obj = {};
            langs.forEach(lang => {
                const el = document.getElementById(`${prefix}-${lang}`);
                obj[lang] = el ? el.value : '';
            });
            return obj;
        };

        const pdpa = {
            enabled: document.getElementById('pdpa-enabled').checked,
            title: getLangValues('pdpa-title'),
            purpose: getLangValues('pdpa-purpose'),
            dataCollected: getLangValues('pdpa-data'),
            checkboxLabel: getLangValues('pdpa-checkbox'),
            agreeButtonText: getLangValues('pdpa-agree')
        };

        const res = await adminFetch(`${API_BASE}/admin/pdpa`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(pdpa)
        });
        const result = await res.json();
        if (!result.success) throw new Error(result.error);
        showSuccess('PDPA settings saved.');
    } catch (err) {
        showError(err.message);
    } finally {
        btn.disabled = false;
        btn.textContent = 'Save PDPA Settings';
    }
}

window.loadPdpa = loadPdpa;
