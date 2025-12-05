// ============================================
// AUTH CONTEXT - Authentication State Management
// ============================================

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { storage } from '../services/storage';
import type { User } from '../types';
import type { LoginResponse } from '../types/api';

interface AuthContextType {
    user: User | null;
    token: string | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    login: (username: string, password: string) => Promise<void>;
    logout: () => void;
    updateUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
    children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const navigate = useNavigate();

    // Initialize auth state from localStorage
    useEffect(() => {
        const initAuth = () => {
            const storedToken = storage.getToken();
            const storedUser = storage.getUser();

            if (storedToken && storedUser) {
                setToken(storedToken);
                setUser(storedUser);
            }

            setIsLoading(false);
        };

        initAuth();
    }, []);

    const login = async (username: string, password: string): Promise<void> => {
        try {
            setIsLoading(true);

            // Call login API
            const response: LoginResponse = await api.auth.login(username, password);

            // Store token
            storage.setToken(response.access_token);
            setToken(response.access_token);

            // Create user object from response
            const userData: User = {
                id: '', // Will be populated from token or separate API call
                username,
                email: '', // Will be populated from separate API call if needed
                role: (response.role || 'analyst') as User['role'],
                is_active: true,
                is_superuser: response.role === 'admin',
                created_at: new Date().toISOString(),
            };

            // Store user data
            storage.setUser(userData);
            setUser(userData);

            // Navigate to dashboard
            navigate('/dashboard');
        } catch (error: any) {
            console.error('Login failed:', error);
            throw new Error(error.response?.data?.detail || 'Login failed');
        } finally {
            setIsLoading(false);
        }
    };

    const logout = (): void => {
        // Clear storage
        storage.clearAuth();

        // Clear state
        setToken(null);
        setUser(null);

        // Redirect to login
        navigate('/login');
    };

    const updateUser = (updatedUser: User): void => {
        setUser(updatedUser);
        storage.setUser(updatedUser);
    };

    const value: AuthContextType = {
        user,
        token,
        isAuthenticated: !!token && !!user,
        isLoading,
        login,
        logout,
        updateUser,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

export default AuthContext;
