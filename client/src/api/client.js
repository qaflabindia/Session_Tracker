import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Handle auth errors
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

// Auth
export const auth = {
    register: (email, password) => api.post('/auth/register', { email, password }),
    login: (email, password) => api.post('/auth/login', { email, password }),
};

// Semesters
export const semesters = {
    getAll: () => api.get('/semesters'),
    getOne: (id) => api.get(`/semesters/${id}`),
    create: (data) => api.post('/semesters', data),
    update: (id, data) => api.put(`/semesters/${id}`, data),
    delete: (id) => api.delete(`/semesters/${id}`),
    propagate: (id) => api.post(`/semesters/${id}/propagate`),
    rebuild: (id) => api.post(`/semesters/${id}/rebuild`, { confirm: 'REBUILD' }),
};

// Courses
export const courses = {
    getBySemester: (semesterId) => api.get(`/courses/semester/${semesterId}`),
    getOne: (id) => api.get(`/courses/${id}`),
    create: (data) => api.post('/courses', data),
    update: (id, data) => api.put(`/courses/${id}`, data),
    delete: (id) => api.delete(`/courses/${id}`),
};

// Schedules
export const schedules = {
    getByCourse: (courseId) => api.get(`/schedules/course/${courseId}`),
    create: (data) => api.post('/schedules', data),
    update: (id, data) => api.put(`/schedules/${id}`, data),
    delete: (id) => api.delete(`/schedules/${id}`),
    addHoliday: (data) => api.post('/schedules/holidays', data),
    getHolidays: (semesterId) => api.get(`/schedules/holidays/semester/${semesterId}`),
};

// Sessions
export const sessions = {
    getAll: (params) => api.get('/sessions', { params }),
    getOne: (id) => api.get(`/sessions/${id}`),
    create: (data) => api.post('/sessions', data),
    delete: (id, mode) => api.delete(`/sessions/${id}`, { params: { mode } }),
    mark: (id, status) => api.post(`/sessions/${id}/mark`, { status }),
    bulkUpdate: (sessionIds, status) => api.post('/sessions/bulk-update', { session_ids: sessionIds, status }),
    undoBulk: (bulkOpId) => api.post(`/sessions/bulk/${bulkOpId}/undo`),
    getRecentBulkOps: () => api.get('/sessions/bulk/recent'),
    getAudit: (id) => api.get(`/sessions/${id}/audit`),
};

// Analytics
export const analytics = {
    getBySemester: (semesterId) => api.get(`/analytics/semester/${semesterId}`),
    getByCourse: (courseId) => api.get(`/analytics/course/${courseId}`),
};

// Export
export const exportData = {
    downloadCSV: (semesterId) => {
        const token = localStorage.getItem('token');
        window.open(`${API_BASE_URL}/export/semester/${semesterId}/csv?token=${token}`, '_blank');
    },
    getData: (semesterId) => api.get(`/export/semester/${semesterId}/data`),
};

// API Keys
export const apiKeys = {
    getStatus: () => api.get('/api-keys/status'),
    set: (apiKey) => api.post('/api-keys/set', { apiKey }),
    delete: () => api.delete('/api-keys'),
};

// AI Extraction
export const aiExtraction = {
    parseTimetable: (formData) => api.post('/ai/parse', formData, {
        headers: { 'Content-Type': 'multipart/form-formdata' }
    }),
    getExtraction: (extractionId) => api.get(`/ai/extraction/${extractionId}`),
    deleteExtraction: (extractionId) => api.delete(`/ai/extraction/${extractionId}`),
};

export default api;
