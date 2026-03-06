import { API_BASE, adminFetch } from '../api.js';
import { showSuccess, showError } from '../notifications.js';
import { currentUser } from '../state.js';
import { escapeHtml } from '../../utils/escapeHtml.js';

export async function loadAdminUsers() {
    const loading = document.getElementById('admin-users-loading');
    const error = document.getElementById('admin-users-error');
    const table = document.getElementById('admin-users-table');
    const tbody = document.getElementById('admin-users-tbody');

    loading.style.display = 'block';
    error.style.display = 'none';
    table.style.display = 'none';

    try {
        const response = await adminFetch(`${API_BASE}/admin/admins`);
        const result = await response.json();

        if (!result.success) throw new Error(result.error);

        tbody.innerHTML = result.data.map(admin => {
            const date = new Date(admin.createdAt).toLocaleDateString();
            const isSelf = currentUser && admin.id === currentUser.id;
            const statusBadge = admin.requirePasswordReset
                ? '<span class="badge badge-medium">Pending Setup</span>'
                : '<span class="badge badge-low">Active</span>';

            return `
                <tr>
                    <td>${escapeHtml(admin.name)}${isSelf ? ' <small>(You)</small>' : ''}</td>
                    <td>${escapeHtml(admin.email)}</td>
                    <td>
                        <span class="badge ${admin.role === 'super_admin' ? 'badge-high' : 'badge-medium'}">
                            ${admin.role === 'super_admin' ? 'Super Admin' : 'Admin'}
                        </span>
                    </td>
                    <td>${statusBadge}</td>
                    <td>${escapeHtml(date)}</td>
                    <td>
                        <button class="btn btn-sm btn-outline" data-action="edit" data-id="${escapeHtml(admin.id)}">Edit</button>
                        ${!isSelf ? `<button class="btn btn-sm btn-danger" data-action="delete" data-id="${escapeHtml(admin.id)}" data-name="${escapeHtml(admin.name)}">Delete</button>` : ''}
                    </td>
                </tr>
            `;
        }).join('');

        loading.style.display = 'none';
        table.style.display = 'table';
    } catch (err) {
        loading.style.display = 'none';
        error.textContent = `Error: ${err.message}`;
        error.style.display = 'block';
    }
}

export function showCreateAdminModal() {
    document.getElementById('admin-modal-title').textContent = 'Add Admin';
    document.getElementById('admin-id').value = '';
    document.getElementById('admin-name').value = '';
    document.getElementById('admin-email').value = '';

    document.getElementById('password-group').style.display = 'none';
    document.getElementById('admin-password').required = false;

    document.getElementById('admin-role').value = 'admin';
    document.getElementById('admin-user-modal').classList.add('active');
}

export async function editAdmin(id) {
    try {
        const admins = await (await adminFetch(`${API_BASE}/admin/admins`)).json();
        const admin = admins.data.find(a => a.id === id);

        if (!admin) throw new Error('Admin not found');

        document.getElementById('admin-modal-title').textContent = 'Edit Admin';
        document.getElementById('admin-id').value = admin.id;
        document.getElementById('admin-name').value = admin.name;
        document.getElementById('admin-email').value = admin.email;

        document.getElementById('password-group').style.display = 'none';
        document.getElementById('admin-password').value = '';
        document.getElementById('admin-password').required = false;

        document.getElementById('admin-role').value = admin.role;
        document.getElementById('admin-user-modal').classList.add('active');
    } catch (err) {
        showError(err.message);
    }
}

export function closeAdminModal() {
    document.getElementById('admin-user-modal').classList.remove('active');
    document.getElementById('password-group').style.display = 'none';
}

export async function deleteAdmin(id, name) {
    if (!confirm(`Are you sure you want to delete admin "${name}"?`)) return;

    try {
        const response = await adminFetch(`${API_BASE}/admin/admins/${id}`, {
            method: 'DELETE'
        });

        const result = await response.json();
        if (!result.success) throw new Error(result.error);

        showSuccess('Admin deleted successfully');
        loadAdminUsers();
    } catch (err) {
        showError(err.message);
    }
}

// Bind form event listeners
export function initAdminUsersView(loadCurrentUserFn) {
    document.getElementById('admin-users-tbody').addEventListener('click', (e) => {
        const btn = e.target.closest('[data-action]');
        if (!btn) return;
        if (btn.dataset.action === 'edit') editAdmin(btn.dataset.id);
        else if (btn.dataset.action === 'delete') deleteAdmin(btn.dataset.id, btn.dataset.name);
    });

    document.getElementById('admin-user-form').addEventListener('submit', async function (e) {
        e.preventDefault();

        const id = document.getElementById('admin-id').value;
        const name = document.getElementById('admin-name').value;
        const email = document.getElementById('admin-email').value;
        const password = document.getElementById('admin-password').value;
        const role = document.getElementById('admin-role').value;

        const saveBtn = document.getElementById('save-admin-btn');
        saveBtn.disabled = true;
        saveBtn.textContent = 'Saving...';

        try {
            let response;
            if (id) {
                const updates = { name, email, role };
                if (password) updates.password = password;

                response = await adminFetch(`${API_BASE}/admin/admins/${id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(updates)
                });
            } else {
                response = await adminFetch(`${API_BASE}/admin/admins`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name, email, role })
                });
            }

            const result = await response.json();
            if (!result.success) throw new Error(result.error);

            if (!id && result.tempPassword) {
                alert(`Admin created successfully!\n\nTemporary Password: ${result.tempPassword}\n\nPlease save this password and share it with the new admin. They will be required to change it on first login.`);
            }

            closeAdminModal();
            showSuccess(id ? 'Admin updated successfully' : 'Admin created successfully');
            if (id === currentUser.id) {
                await loadCurrentUserFn();
            }

            loadAdminUsers();
        } catch (err) {
            showError(err.message);
        } finally {
            saveBtn.disabled = false;
            saveBtn.textContent = 'Save';
        }
    });
}

window.loadAdminUsers = loadAdminUsers;
window.showCreateAdminModal = showCreateAdminModal;
window.editAdmin = editAdmin;
window.closeAdminModal = closeAdminModal;
window.deleteAdmin = deleteAdmin;
