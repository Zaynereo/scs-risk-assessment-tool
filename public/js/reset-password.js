import { bindPasswordToggles } from './utils/passwordToggle.js';

// Move the reset token from the URL query string into sessionStorage on first load,
// then strip it from the URL via history.replaceState. This prevents the token from
// leaking into browser history, Referer headers of any sub-requests, and access logs
// for static assets loaded by this page.
const urlParams = new URLSearchParams(window.location.search);
const tokenFromUrl = urlParams.get('token');
if (tokenFromUrl) {
    sessionStorage.setItem('resetToken', tokenFromUrl);
    history.replaceState(null, '', window.location.pathname);
}
const token = sessionStorage.getItem('resetToken');

if (!token) {
    document.getElementById('errorMessage').textContent = 'Invalid or missing reset token';
    document.getElementById('errorMessage').style.display = 'block';
    document.getElementById('resetPasswordForm').style.display = 'none';
}

function validatePassword(password) {
    if (password.length < 8) return 'Password must be at least 8 characters';
    if (!/[A-Z]/.test(password)) return 'Password must contain at least one uppercase letter';
    if (!/[a-z]/.test(password)) return 'Password must contain at least one lowercase letter';
    if (!/[0-9]/.test(password)) return 'Password must contain at least one number';
    if (!/[^A-Za-z0-9]/.test(password)) return 'Password must contain at least one symbol';
    return null;
}

document.getElementById('resetPasswordForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const errorMessage = document.getElementById('errorMessage');
    const successMessage = document.getElementById('successMessage');
    const submitBtn = document.getElementById('submitBtn');
    const passwordError = validatePassword(newPassword);
    errorMessage.style.display = 'none';
    successMessage.style.display = 'none';

    if (newPassword !== confirmPassword) {
        errorMessage.textContent = 'Passwords do not match';
        errorMessage.style.display = 'block';
        return;
    }
    if (passwordError) {
        errorMessage.textContent = passwordError;
        errorMessage.style.display = 'block';
        return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Resetting...';

    try {
        const response = await fetch('/api/admin/reset-password', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ token, newPassword })
        });
        const data = await response.json();
        if (response.ok) {
            // Token is now consumed — remove it so it can't be reused from a back button.
            sessionStorage.removeItem('resetToken');
            successMessage.textContent = data.message;
            successMessage.appendChild(document.createElement('br'));
            successMessage.append('Redirecting to login...');
            successMessage.style.display = 'block';

            // Redirect to login after 2 seconds
            setTimeout(() => {
                window.location.href = '/login.html';
            }, 2000);
        } else {
            errorMessage.textContent = data.message || 'An error occurred. Please try again.';
            errorMessage.style.display = 'block';
        }
    } catch (error) {
        console.error('Reset password error:', error);
        errorMessage.textContent = 'An error occurred. Please try again.';
        errorMessage.style.display = 'block';
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Reset Password';
    }
});

bindPasswordToggles();
