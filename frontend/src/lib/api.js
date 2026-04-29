/**
 * =====================================================
 * API Service Layer
 * Handles all HTTP requests to the backend API
 * =====================================================
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

/**
 * Get authentication token from localStorage
 */
const getToken = () => {
    if (typeof window !== 'undefined') {
        return localStorage.getItem('token');
    }
    return null;
};

/**
 * Set authentication token in localStorage
 */
const setToken = (token) => {
    if (typeof window !== 'undefined') {
        localStorage.setItem('token', token);
    }
};

/**
 * Remove authentication token from localStorage
 */
const removeToken = () => {
    if (typeof window !== 'undefined') {
        localStorage.removeItem('token');
    }
};

/**
 * Base fetch wrapper with authentication and error handling
 */
const fetchAPI = async (endpoint, options = {}) => {
    const token = getToken();

    const headers = {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
    };

    try {
        const response = await fetch(`${API_URL}${endpoint}`, {
            ...options,
            headers,
        });

        const data = await response.json();

        if (!response.ok) {
            // Handle token expiration
            if (response.status === 401) {
                removeToken();
                if (typeof window !== 'undefined') {
                    window.location.href = '/login';
                }
            }
            throw new Error(data.message || 'API request failed');
        }

        return data;
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
};

// =====================================================
// AUTH API
// =====================================================

export const authAPI = {
    login: async (email, password) => {
        const response = await fetchAPI('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password }),
        });
        if (response.success && response.data.token) {
            setToken(response.data.token);
        }
        return response;
    },

    register: async (userData) => {
        const response = await fetchAPI('/auth/register', {
            method: 'POST',
            body: JSON.stringify(userData),
        });
        if (response.success && response.data.token) {
            setToken(response.data.token);
        }
        return response;
    },

    getProfile: async () => {
        return fetchAPI('/auth/me');
    },

    updateProfile: async (data) => {
        return fetchAPI('/auth/profile', {
            method: 'PUT',
            body: JSON.stringify(data),
        });
    },

    changePassword: async (currentPassword, newPassword) => {
        return fetchAPI('/auth/password', {
            method: 'PUT',
            body: JSON.stringify({ currentPassword, newPassword }),
        });
    },

    logout: () => {
        removeToken();
        if (typeof window !== 'undefined') {
            window.location.href = '/login';
        }
    },

    isAuthenticated: () => {
        return !!getToken();
    },
};

// =====================================================
// USERS API
// =====================================================

export const usersAPI = {
    getAll: async (params = {}) => {
        const query = new URLSearchParams(params).toString();
        return fetchAPI(`/users${query ? `?${query}` : ''}`);
    },

    getById: async (id) => {
        return fetchAPI(`/users/${id}`);
    },

    create: async (userData) => {
        return fetchAPI('/users', {
            method: 'POST',
            body: JSON.stringify(userData),
        });
    },

    update: async (id, userData) => {
        return fetchAPI(`/users/${id}`, {
            method: 'PUT',
            body: JSON.stringify(userData),
        });
    },

    updateRole: async (id, role) => {
        return fetchAPI(`/users/${id}/role`, {
            method: 'PUT',
            body: JSON.stringify({ role }),
        });
    },

    assignManager: async (id, managerId) => {
        return fetchAPI(`/users/${id}/manager`, {
            method: 'PUT',
            body: JSON.stringify({ manager_id: managerId }),
        });
    },

    delete: async (id) => {
        return fetchAPI(`/users/${id}`, {
            method: 'DELETE',
        });
    },

    getManagers: async () => {
        return fetchAPI('/users/managers');
    },

    getDepartments: async () => {
        return fetchAPI('/users/departments');
    },
};

// =====================================================
// TASKS API
// =====================================================

export const tasksAPI = {
    getAll: async (params = {}) => {
        const query = new URLSearchParams(params).toString();
        return fetchAPI(`/tasks${query ? `?${query}` : ''}`);
    },

    getById: async (id) => {
        return fetchAPI(`/tasks/${id}`);
    },

    getSummary: async (employeeId = null) => {
        const params = employeeId ? `?employee_id=${employeeId}` : '';
        return fetchAPI(`/tasks/summary${params}`);
    },

    create: async (taskData) => {
        return fetchAPI('/tasks', {
            method: 'POST',
            body: JSON.stringify(taskData),
        });
    },

    update: async (id, taskData) => {
        return fetchAPI(`/tasks/${id}`, {
            method: 'PUT',
            body: JSON.stringify(taskData),
        });
    },

    updateProgress: async (id, progress) => {
        return fetchAPI(`/tasks/${id}/progress`, {
            method: 'PUT',
            body: JSON.stringify({ progress }),
        });
    },

    updateStatus: async (id, status) => {
        return fetchAPI(`/tasks/${id}/status`, {
            method: 'PUT',
            body: JSON.stringify({ status }),
        });
    },

    delete: async (id) => {
        return fetchAPI(`/tasks/${id}`, {
            method: 'DELETE',
        });
    },
};

// =====================================================
// WORKLOAD API
// =====================================================

export const workloadAPI = {
    getScore: async () => {
        return fetchAPI('/workload/score');
    },

    getUserScore: async (userId) => {
        return fetchAPI(`/workload/score/${userId}`);
    },

    getTeamWorkload: async () => {
        return fetchAPI('/workload/team');
    },

    getHistory: async (days = 30, userId = null) => {
        const params = new URLSearchParams({ days });
        if (userId) params.append('userId', userId);
        return fetchAPI(`/workload/history?${params}`);
    },

    calculate: async () => {
        return fetchAPI('/workload/calculate', {
            method: 'POST',
        });
    },

    calculateAll: async () => {
        return fetchAPI('/workload/calculate-all', {
            method: 'POST',
        });
    },

    getBurnoutAssessment: async () => {
        return fetchAPI('/workload/burnout');
    },

    getUserBurnoutAssessment: async (userId) => {
        return fetchAPI(`/workload/burnout/${userId}`);
    },

    getOrganizationStats: async () => {
        return fetchAPI('/workload/organization');
    },
};

// =====================================================
// ALERTS API
// =====================================================

export const alertsAPI = {
    getAll: async (limit = 50, offset = 0) => {
        return fetchAPI(`/alerts?limit=${limit}&offset=${offset}`);
    },

    getUnread: async () => {
        return fetchAPI('/alerts/unread');
    },

    getCount: async () => {
        return fetchAPI('/alerts/count');
    },

    markAsRead: async (id) => {
        return fetchAPI(`/alerts/${id}/read`, {
            method: 'PUT',
        });
    },

    markAllAsRead: async () => {
        return fetchAPI('/alerts/read-all', {
            method: 'PUT',
        });
    },

    dismiss: async (id) => {
        return fetchAPI(`/alerts/${id}`, {
            method: 'DELETE',
        });
    },
};

// =====================================================
// REPORTS API
// =====================================================

export const reportsAPI = {
    getWorkloadReport: async (days = 30, department = null) => {
        const params = new URLSearchParams({ days });
        if (department) params.append('department', department);
        return fetchAPI(`/reports/workload?${params}`);
    },

    getBurnoutReport: async () => {
        return fetchAPI('/reports/burnout');
    },

    getTaskReport: async (period = 'month') => {
        return fetchAPI(`/reports/tasks?period=${period}`);
    },

    getTeamReport: async () => {
        return fetchAPI('/reports/team');
    },

    getDashboard: async () => {
        return fetchAPI('/reports/dashboard');
    },
};

// =====================================================
// CONFIG API
// =====================================================

export const configAPI = {
    getAll: async (category = null) => {
        const params = category ? `?category=${category}` : '';
        return fetchAPI(`/config${params}`);
    },

    get: async (key) => {
        return fetchAPI(`/config/${key}`);
    },

    update: async (key, value) => {
        return fetchAPI(`/config/${key}`, {
            method: 'PUT',
            body: JSON.stringify({ value }),
        });
    },

    create: async (configData) => {
        return fetchAPI('/config', {
            method: 'POST',
            body: JSON.stringify(configData),
        });
    },

    delete: async (key) => {
        return fetchAPI(`/config/${key}`, {
            method: 'DELETE',
        });
    },

    getCategories: async () => {
        return fetchAPI('/config/categories');
    },
};

// =====================================================
// NOTIFICATIONS API
// =====================================================

export const notificationsAPI = {
    getAll: async (userId, customParams = {}) => {
        const queryParams = new URLSearchParams(customParams).toString();
        const queryStr = queryParams ? `?${queryParams}` : '';
        return fetchAPI(`/notifications/${userId}${queryStr}`);
    },

    markAsRead: async (id) => {
        return fetchAPI(`/notifications/read/${id}`, {
            method: 'PUT'
        });
    },

    markAllAsRead: async () => {
        return fetchAPI('/notifications/read-all', {
            method: 'PUT'
        });
    },

    getUnreadCount: async () => {
        return fetchAPI('/notifications/count/unread');
    }
};

// Export token utilities for external use
export { getToken, setToken, removeToken };
