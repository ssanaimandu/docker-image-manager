/** API client for Docker Image Manager backend. */

const BASE_URL = import.meta.env.VITE_API_URL || '';

async function request(path, options = {}) {
    const url = `${BASE_URL}${path}`;

    // Auto-inject Authorization header if token exists
    const token = localStorage.getItem('dim_token');
    const headers = { 'Content-Type': 'application/json', ...options.headers };
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(url, {
        headers,
        ...options,
    });

    if (res.status === 401 && path !== '/api/auth/login' && path !== '/api/auth/status') {
        // Clear invalid token and reload to trigger login redirect
        localStorage.removeItem('dim_token');
        window.location.href = '/login';
    }

    if (!res.ok) {
        let text = "";
        try {
            const errJson = await res.json();
            text = errJson.detail || await res.text();
        } catch {
            text = await res.text();
        }
        throw new Error(text || `${res.status} Error`);
    }

    if (res.status === 204) return null;
    return res.json();
}

// Auth
export const login = (username, password) => {
    const formData = new URLSearchParams();
    formData.append('username', username);
    formData.append('password', password);
    return request('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: formData.toString()
    });
};
export const oauthLogin = (provider, code) => request('/api/auth/oauth', { method: 'POST', body: JSON.stringify({ provider, code }) });
export const getAuthStatus = () => request('/api/auth/status');

// Sources
export const getSources = () => request('/api/sources');
export const getSource = (id) => request(`/api/sources/${id}`);
export const createSource = (data) => request('/api/sources', { method: 'POST', body: JSON.stringify(data) });
export const updateSource = (id, data) => request(`/api/sources/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteSource = (id) => request(`/api/sources/${id}`, { method: 'DELETE' });
export const testSource = (id) => request(`/api/sources/${id}/test`, { method: 'POST' });

// Images
export const getAllImages = () => request('/api/images');
export const getImagesBySource = (sourceId) => request(`/api/images/by-source/${sourceId}`);

// Policies
export const getPolicies = () => request('/api/policies');
export const updateDefaultPolicy = (data) => request('/api/policies/default', { method: 'PUT', body: JSON.stringify(data) });
export const getImagePolicy = (name) => request(`/api/policies/${encodeURIComponent(name)}`);
export const updateImagePolicy = (name, data) => request(`/api/policies/${encodeURIComponent(name)}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteImagePolicy = (name) => request(`/api/policies/${encodeURIComponent(name)}`, { method: 'DELETE' });

// Cleanup
export const previewCleanup = (sourceIds = null) => request('/api/cleanup/preview', { method: 'POST', body: JSON.stringify({ source_ids: sourceIds }) });
export const executeCleanup = (sourceIds = null) => request('/api/cleanup/execute', { method: 'POST', body: JSON.stringify({ source_ids: sourceIds }) });

// Health
export const healthCheck = () => request('/api/health');
