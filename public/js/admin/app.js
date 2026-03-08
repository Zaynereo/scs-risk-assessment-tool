import { API_BASE, adminFetch } from './api.js';
import { showSuccess, showError } from './notifications.js';
import { currentUser, setCurrentUser } from './state.js';
import { registerView, initRouter } from './router.js';

// Import views
import { loadCancerTypes, initContentView } from './views/contentView.js';
import { loadQuestionBank, initQuestionBankView } from './views/questionBankView.js';
import { loadAssessments } from './views/assessmentsView.js';
import { loadStatistics } from './views/statisticsView.js';
import { loadAppearance } from './views/appearanceView.js';
import { loadPdpa } from './views/pdpaView.js';
import { loadTranslations } from './views/translationsView.js';
import { loadAdminUsers, initAdminUsersView } from './views/adminUsersView.js';

// ==================== CURRENT USER ====================

async function loadCurrentUser() {
    try {
        const response = await adminFetch(`${API_BASE}/admin/me`);
        const result = await response.json();
        if (result.success) {
            setCurrentUser(result.data);

            document.getElementById('profileEmail').textContent = result.data.email;
            document.getElementById('profileRole').textContent =
                result.data.role === 'super_admin' ? 'Super Admin' : 'Admin';

            // Hide admin users sidebar item if not super admin
            const adminUsersTab = document.querySelector('.sidebar-item[data-tab="admin-users"]');
            if (adminUsersTab) {
                if (result.data.role !== 'super_admin') {
                    adminUsersTab.style.display = 'none';

                    if (adminUsersTab.classList.contains('active')) {
                        document.querySelector('.sidebar-item[data-tab="content"]').click();
                    }
                } else {
                    adminUsersTab.style.display = 'block';
                }
            }

            if (result.data.requirePasswordReset) {
                setTimeout(() => {
                    showChangePasswordModal(true);
                }, 500);
            }
        }
    } catch (err) {
        console.error('Failed to load current user:', err);
    }
}

// ==================== CHANGE PASSWORD ====================

window.showChangePasswordModal = function (required = false) {
    const modal = document.getElementById('change-password-modal');
    const modalBody = modal.querySelector('.modal-body');

    const existingWarning = modal.querySelector('.password-warning');
    if (existingWarning) {
        existingWarning.remove();
    }

    modal.classList.add('active');

    if (required) {
        const closeBtn = modal.querySelector('.close-btn');
        const cancelBtn = modal.querySelector('.btn-secondary');
        closeBtn.style.display = 'none';
        cancelBtn.style.display = 'none';

        const warningDiv = document.createElement('div');
        warningDiv.className = 'password-warning';
        warningDiv.style.cssText = 'background: #fff3cd; border: 1px solid #ffc107; padding: 16px; border-radius: 4px; margin-bottom: 20px; color: #856404;';
        warningDiv.innerHTML = `
            <div style="display: flex; align-items: center; gap: 12px;">
                <span style="font-size: 24px;">\u26A0\uFE0F</span>
                <div>
                    <strong style="display: block; margin-bottom: 4px;">Password Change Required</strong>
                    <span>You must change your password before you can continue using the admin panel.</span>
                </div>
            </div>
        `;
        modalBody.insertBefore(warningDiv, modalBody.firstChild);
    } else {
        const closeBtn = modal.querySelector('.close-btn');
        const cancelBtn = modal.querySelector('.btn-secondary');
        if (closeBtn) closeBtn.style.display = 'block';
        if (cancelBtn) cancelBtn.style.display = 'block';
    }
};

window.closeChangePasswordModal = function () {
    if (currentUser && currentUser.requirePasswordReset) {
        alert('You must change your password to continue.');
        return;
    }
    document.getElementById('change-password-modal').classList.remove('active');
    document.getElementById('change-password-form').reset();
};

window.toggleProfileMenu = function () {
    const menu = document.getElementById('profileMenu');
    menu.classList.toggle('active');
};

// Close profile menu when clicking outside
document.addEventListener('click', function (event) {
    const profileDropdown = document.querySelector('.profile-dropdown');
    const profileMenu = document.getElementById('profileMenu');
    if (profileDropdown && profileMenu && !profileDropdown.contains(event.target)) {
        profileMenu.classList.remove('active');
    }
});

// Handle change password form
document.getElementById('change-password-form').addEventListener('submit', async function (e) {
    e.preventDefault();

    const currentPassword = document.getElementById('current-password').value;
    const newPassword = document.getElementById('new-password').value;
    const confirmPassword = document.getElementById('confirm-password').value;

    if (newPassword !== confirmPassword) {
        showError('New passwords do not match');
        return;
    }

    if (newPassword === currentPassword) {
        showError('New password must be different from current password');
        return;
    }

    const btn = document.getElementById('change-password-btn');
    btn.disabled = true;
    btn.textContent = 'Changing...';

    try {
        const response = await adminFetch(`${API_BASE}/admin/change-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ currentPassword, newPassword })
        });

        const result = await response.json();
        if (!result.success) throw new Error(result.error);

        if (currentUser) {
            currentUser.requirePasswordReset = false;
        }

        window.closeChangePasswordModal();
        document.getElementById('change-password-form').reset();

        const modal = document.getElementById('change-password-modal');
        modal.querySelector('.close-btn').style.display = 'block';
        modal.querySelector('.btn-secondary').style.display = 'block';

        const warning = modal.querySelector('.password-warning');
        if (warning) warning.remove();

        showSuccess('Password changed successfully');

        await loadCurrentUser();
    } catch (err) {
        showError(err.message);
    } finally {
        btn.disabled = false;
        btn.textContent = 'Change Password';
    }
});

// ==================== REGISTER VIEWS ====================

registerView('content', loadCancerTypes);
registerView('question-bank', loadQuestionBank);
registerView('assessments', loadAssessments);
registerView('statistics', loadStatistics);
registerView('appearance', loadAppearance);
registerView('pdpa', loadPdpa);
registerView('translations', loadTranslations);
registerView('admin-users', loadAdminUsers);

// ==================== INIT ====================

initRouter();
initContentView();
initQuestionBankView();
initAdminUsersView(loadCurrentUser);

// Initial load
loadCancerTypes();
loadCurrentUser();
