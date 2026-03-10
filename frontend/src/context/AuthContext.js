'use client';

/**
 * =====================================================
 * Authentication Context Provider
 * Manages user authentication state across the app
 * =====================================================
 */

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authAPI, getToken, removeToken } from '@/lib/api';

// Create the auth context
const AuthContext = createContext(null);

/**
 * Auth Provider Component
 */
export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    /**
     * Load user profile from API
     */
    const loadUser = useCallback(async () => {
        const token = getToken();

        if (!token) {
            setLoading(false);
            return;
        }

        try {
            const response = await authAPI.getProfile();
            if (response.success) {
                setUser(response.data);
            } else {
                removeToken();
                setUser(null);
            }
        } catch (err) {
            console.error('Error loading user:', err);
            removeToken();
            setUser(null);
        } finally {
            setLoading(false);
        }
    }, []);

    /**
     * Initialize auth state on mount
     */
    useEffect(() => {
        loadUser();
    }, [loadUser]);

    /**
     * Login function
     */
    const login = async (email, password) => {
        setError(null);
        try {
            const response = await authAPI.login(email, password);
            if (response.success) {
                setUser(response.data.user);
                return { success: true };
            } else {
                setError(response.message);
                return { success: false, message: response.message };
            }
        } catch (err) {
            const message = err.message || 'Login failed';
            setError(message);
            return { success: false, message };
        }
    };

    /**
     * Register function
     */
    const register = async (userData) => {
        setError(null);
        try {
            const response = await authAPI.register(userData);
            if (response.success) {
                setUser(response.data.user);
                return { success: true };
            } else {
                setError(response.message);
                return { success: false, message: response.message };
            }
        } catch (err) {
            const message = err.message || 'Registration failed';
            setError(message);
            return { success: false, message };
        }
    };

    /**
     * Logout function
     */
    const logout = () => {
        setUser(null);
        authAPI.logout();
    };

    /**
     * Refresh user data
     */
    const refreshUser = async () => {
        await loadUser();
    };

    /**
     * Check if user has specific role
     */
    const hasRole = (role) => {
        if (!user) return false;
        if (Array.isArray(role)) {
            return role.includes(user.role);
        }
        return user.role === role;
    };

    /**
     * Check if user is admin
     */
    const isAdmin = () => hasRole('admin');

    /**
     * Check if user is manager
     */
    const isManager = () => hasRole(['manager', 'admin']);

    /**
     * Check if user is authenticated
     */
    const isAuthenticated = () => !!user;

    // Context value
    const value = {
        user,
        loading,
        error,
        login,
        register,
        logout,
        refreshUser,
        hasRole,
        isAdmin,
        isManager,
        isAuthenticated,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

/**
 * Hook to use auth context
 */
export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}

export default AuthContext;
