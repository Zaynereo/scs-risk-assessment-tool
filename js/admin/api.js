export const API_BASE = window.location.origin.includes('localhost')
    ? 'http://localhost:3000/api'
    : '/api';

export function getAuthHeaders(extraHeaders = {}) {
    const token = localStorage.getItem('adminToken');
    if (!token) return extraHeaders;
    return { ...extraHeaders, Authorization: `Bearer ${token}` };
}

export async function adminFetch(url, options = {}) {
    const headers = getAuthHeaders(options.headers || {});
    const response = await fetch(url, { ...options, headers });
    if (response.status === 401 || response.status === 403) {
        localStorage.removeItem('adminToken');
        window.location.href = '/login.html';
        throw new Error('Unauthorized');
    }
    return response;
}
