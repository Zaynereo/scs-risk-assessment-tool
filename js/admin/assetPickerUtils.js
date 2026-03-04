import { API_BASE, adminFetch } from './api.js';
import { showSuccess, showError } from './notifications.js';

export function fillAssetSelect(selectEl, paths, currentValue) {
    if (!selectEl) return;
    selectEl.innerHTML = '<option value="">(None)</option>';
    (paths || []).forEach(p => {
        const opt = document.createElement('option');
        opt.value = p;
        opt.textContent = p.split('/').pop();
        selectEl.appendChild(opt);
    });
    selectEl.value = currentValue || '';
    updateAssetPickerTrigger(selectEl);
}

export function updateAssetPickerTrigger(selectEl) {
    const wrap = selectEl && selectEl.closest('.asset-picker-wrap');
    if (!wrap) return;
    const trigger = wrap.querySelector('.asset-picker-trigger');
    if (!trigger) return;
    const opt = selectEl.options[selectEl.selectedIndex];
    trigger.querySelector('.asset-picker-trigger-label').textContent = opt ? opt.textContent : '(None)';
}

export function initAssetPickerDropdown(selectEl, { onDelete, onChange } = {}) {
    if (!selectEl || selectEl.closest('.asset-picker-wrap')) return;
    const wrap = document.createElement('div');
    wrap.className = 'asset-picker-wrap';
    const opt = selectEl.options[selectEl.selectedIndex];
    wrap.innerHTML = `
        <button type="button" class="asset-picker-trigger" aria-haspopup="listbox" aria-expanded="false">
            <span class="asset-picker-trigger-label">${opt ? opt.textContent : '(None)'}</span>
        </button>
        <div class="asset-picker-dropdown" role="listbox"></div>
    `;
    selectEl.parentNode.insertBefore(wrap, selectEl);
    wrap.appendChild(selectEl);

    const trigger = wrap.querySelector('.asset-picker-trigger');
    const dropdown = wrap.querySelector('.asset-picker-dropdown');

    function buildDropdown() {
        dropdown.innerHTML = '';
        Array.from(selectEl.options).forEach(option => {
            const row = document.createElement('div');
            row.className = 'asset-picker-option';
            row.setAttribute('role', 'option');
            row.dataset.value = option.value;
            const label = document.createElement('span');
            label.className = 'asset-picker-option-label';
            label.textContent = option.textContent;
            row.appendChild(label);
            if (option.value) {
                const delBtn = document.createElement('button');
                delBtn.type = 'button';
                delBtn.className = 'asset-picker-option-delete';
                delBtn.setAttribute('aria-label', 'Delete this asset');
                delBtn.textContent = '\u00d7';
                row.appendChild(delBtn);
                delBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const path = option.value;
                    if (!path) return;
                    if (!confirm('Delete this asset from the server? It will be removed from all dropdowns.')) return;
                    adminFetch(`${API_BASE}/admin/assets`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ path }) })
                        .then(res => res.json())
                        .then(data => {
                            if (!data.success) throw new Error(data.error);
                            if (onDelete) onDelete(path);
                            buildDropdown();
                            showSuccess('Asset deleted.');
                        })
                        .catch(err => showError(err.message));
                });
            }
            row.addEventListener('click', (e) => {
                if (e.target.classList.contains('asset-picker-option-delete')) return;
                selectEl.value = option.value;
                trigger.querySelector('.asset-picker-trigger-label').textContent = option.textContent;
                wrap.classList.remove('open');
                trigger.setAttribute('aria-expanded', 'false');
                selectEl.dispatchEvent(new Event('change', { bubbles: true }));
                if (onChange) onChange(selectEl);
            });
            dropdown.appendChild(row);
        });
    }

    trigger.addEventListener('click', () => {
        const isOpen = wrap.classList.toggle('open');
        trigger.setAttribute('aria-expanded', isOpen);
        if (isOpen) buildDropdown();
    });

    document.addEventListener('click', (e) => {
        if (!wrap.contains(e.target)) { wrap.classList.remove('open'); trigger.setAttribute('aria-expanded', 'false'); }
    });

    wrap.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') { wrap.classList.remove('open'); trigger.setAttribute('aria-expanded', 'false'); }
    });
}
