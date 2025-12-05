// ============================================
// LOCALSTORAGE SERVICE
// ============================================

import { STORAGE_KEYS } from '../utils/constants';
import type { User } from '../types';

export const storage = {
    // Token
    getToken: (): string | null => {
        return localStorage.getItem(STORAGE_KEYS.TOKEN);
    },

    setToken: (token: string): void => {
        localStorage.setItem(STORAGE_KEYS.TOKEN, token);
    },

    removeToken: (): void => {
        localStorage.removeItem(STORAGE_KEYS.TOKEN);
    },

    // User
    getUser: (): User | null => {
        const userStr = localStorage.getItem(STORAGE_KEYS.USER);
        if (!userStr) return null;

        try {
            return JSON.parse(userStr);
        } catch (e) {
            console.error('Failed to parse user data from localStorage');
            return null;
        }
    },

    setUser: (user: User): void => {
        localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
    },

    removeUser: (): void => {
        localStorage.removeItem(STORAGE_KEYS.USER);
    },

    // Remember Me
    getRememberMe: (): boolean => {
        return localStorage.getItem(STORAGE_KEYS.REMEMBER_ME) === 'true';
    },

    setRememberMe: (value: boolean): void => {
        localStorage.setItem(STORAGE_KEYS.REMEMBER_ME, value.toString());
    },

    // Sidebar State
    getSidebarCollapsed: (): boolean => {
        const saved = localStorage.getItem(STORAGE_KEYS.SIDEBAR_COLLAPSED);
        return saved ? JSON.parse(saved) : false;
    },

    setSidebarCollapsed: (collapsed: boolean): void => {
        localStorage.setItem(STORAGE_KEYS.SIDEBAR_COLLAPSED, JSON.stringify(collapsed));
    },

    // Clear all auth data
    clearAuth: (): void => {
        storage.removeToken();
        storage.removeUser();
        localStorage.removeItem(STORAGE_KEYS.REMEMBER_ME);
    },

    // Generic get/set for custom data
    get: <T>(key: string, defaultValue?: T): T | null => {
        const item = localStorage.getItem(key);
        if (!item) return defaultValue || null;

        try {
            return JSON.parse(item);
        } catch (e) {
            return item as T;
        }
    },

    set: <T>(key: string, value: T): void => {
        localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
    },

    remove: (key: string): void => {
        localStorage.removeItem(key);
    },
};
