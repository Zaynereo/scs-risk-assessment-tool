function logout() {
    localStorage.removeItem('adminToken');
    window.location.href = '/login.html';
}

// Logout functionality is now handled by the HTML button
// The dynamic button creation has been removed to avoid duplicates
