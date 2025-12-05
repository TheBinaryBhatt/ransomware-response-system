// ============================================
// API SERVICE - CENTRALIZED API CALLS
// ============================================

import axios, { AxiosInstance, AxiosError } from 'axios';
import { API_BASE_URL } from '../utils/constants';
import { storage } from './storage';
import type {
    ApiResponse,
    LoginResponse,
    UserCreateRequest,
    UserUpdateRequest,
    IncidentQuery,
    TriggerResponseRequest,
    AuditLogQuery,
} from '../types/api';
import type {
    User,
    Incident,
    Workflow,
    AuditLog,
    Integration,
    SystemHealth,
    DashboardStats,
    IncidentTrend,
    ThreatBreakdown,
    StatusBreakdown,
} from '../types';

// Create Axios instance
const axiosInstance: AxiosInstance = axios.create({
    baseURL: API_BASE_URL,
    timeout: 10000, // 10 seconds
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request interceptor - Add JWT token
axiosInstance.interceptors.request.use(
    (config) => {
        const token = storage.getToken();
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response interceptor - Handle errors globally
axiosInstance.interceptors.response.use(
    (response) => response,
    (error: AxiosError) => {
        if (error.response?.status === 401) {
            // Unauthorized - clear auth and redirect to login
            storage.clearAuth();
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

// ============================================
// AUTH API
// ============================================

export const authApi = {
    login: async (username: string, password: string): Promise<LoginResponse> => {
        // FastAPI OAuth2PasswordRequestForm expects application/x-www-form-urlencoded
        const formData = new URLSearchParams();
        formData.append('username', username);
        formData.append('password', password);

        const response = await axiosInstance.post<LoginResponse>('/api/v1/token', formData, {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
        });

        return response.data;
    },

    logout: (): void => {
        storage.clearAuth();
    },
};

// ============================================
// INCIDENTS API
// ============================================

export const incidentsApi = {
    getAll: async (query?: IncidentQuery): Promise<Incident[]> => {
        const response = await axiosInstance.get<Incident[]>('/api/v1/incidents', {
            params: query,
        });
        return response.data;
    },

    getById: async (id: string): Promise<Incident> => {
        const response = await axiosInstance.get<Incident>(`/api/v1/incidents/${id}`);
        return response.data;
    },

    triggerResponse: async (id: string, data?: TriggerResponseRequest): Promise<ApiResponse> => {
        const response = await axiosInstance.post<ApiResponse>(
            `/api/v1/incidents/${id}/respond`,
            data || {}
        );
        return response.data;
    },

    getTimeline: async (id: string): Promise<any> => {
        const response = await axiosInstance.get(`/api/v1/incidents/${id}/timeline`);
        return response.data;
    },

    getAuditTrail: async (id: string): Promise<AuditLog[]> => {
        const response = await axiosInstance.get<AuditLog[]>(`/api/v1/incidents/${id}/audit-trail`);
        return response.data;
    },
};

// ============================================
// DASHBOARD / STATS API
// ============================================

export const dashboardApi = {
    getStats: async (): Promise<DashboardStats> => {
        const response = await axiosInstance.get<DashboardStats>('/api/v1/dashboard/stats');
        return response.data;
    },

    getTrends: async (days: number = 7): Promise<IncidentTrend[]> => {
        const response = await axiosInstance.get<IncidentTrend[]>('/api/v1/dashboard/trends', {
            params: { days },
        });
        return response.data;
    },

    getThreatBreakdown: async (): Promise<ThreatBreakdown[]> => {
        const response = await axiosInstance.get<ThreatBreakdown[]>('/api/v1/dashboard/threat-breakdown');
        return response.data;
    },

    getStatusBreakdown: async (): Promise<StatusBreakdown[]> => {
        const response = await axiosInstance.get<StatusBreakdown[]>('/api/v1/dashboard/status-breakdown');
        return response.data;
    },
};

// ============================================
// THREAT INTEL API
// ============================================

import type {
    IPReputation,
    FileHash,
} from '../types/threatintel';

// ... (existing imports)

// ============================================
// THREAT INTEL API
// ============================================

export const threatIntelApi = {
    lookupIP: async (ip: string): Promise<IPReputation> => {
        const response = await axiosInstance.get<IPReputation>(`/api/v1/threat-intel/ip/${ip}`);
        return response.data;
    },

    lookupHash: async (hash: string): Promise<FileHash> => {
        const response = await axiosInstance.get<FileHash>(`/api/v1/threat-intel/hash/${hash}`);
        return response.data;
    },

    lookupDomain: async (domain: string): Promise<any> => {
        const response = await axiosInstance.get(`/api/v1/threat-intel/domain/${domain}`);
        return response.data;
    },
};

// ============================================
// WORKFLOWS API
// ============================================

export const workflowsApi = {
    getAll: async (): Promise<Workflow[]> => {
        const response = await axiosInstance.get<Workflow[]>('/api/v1/workflows');
        return response.data;
    },

    getById: async (id: string): Promise<Workflow> => {
        const response = await axiosInstance.get<Workflow>(`/api/v1/workflows/${id}`);
        return response.data;
    },
};

// ============================================
// AUDIT LOGS API
// ============================================

export const auditLogsApi = {
    getLogs: async (query?: AuditLogQuery): Promise<AuditLog[]> => {
        const response = await axiosInstance.get<AuditLog[]>('/api/v1/logs', {
            params: query,
        });
        return response.data;
    },

    verifyHash: async (hash: string): Promise<ApiResponse> => {
        const response = await axiosInstance.post<ApiResponse>('/api/v1/audit-logs/verify', {
            hash,
        });
        return response.data;
    },
};

// ============================================
// SYSTEM / HEALTH API
// ============================================

export const systemApi = {
    getHealth: async (): Promise<SystemHealth[]> => {
        const response = await axiosInstance.get<SystemHealth[]>('/api/v1/system/health');
        return response.data;
    },
};

// ============================================
// INTEGRATIONS API
// ============================================

export const integrationsApi = {
    getAll: async (): Promise<Integration[]> => {
        const response = await axiosInstance.get<Integration[]>('/api/v1/integrations');
        return response.data;
    },

    toggle: async (id: string, enabled: boolean): Promise<ApiResponse> => {
        const response = await axiosInstance.patch<ApiResponse>(`/api/v1/integrations/${id}`, {
            enabled,
        });
        return response.data;
    },

    configure: async (id: string, config: Record<string, any>): Promise<ApiResponse> => {
        const response = await axiosInstance.patch<ApiResponse>(`/api/v1/integrations/${id}/config`, config);
        return response.data;
    },
};

// ============================================
// USERS API
// ============================================

export const usersApi = {
    getAll: async (): Promise<User[]> => {
        const response = await axiosInstance.get<User[]>('/api/v1/users');
        return response.data;
    },

    getById: async (id: string): Promise<User> => {
        const response = await axiosInstance.get<User>(`/api/v1/users/${id}`);
        return response.data;
    },

    create: async (data: UserCreateRequest): Promise<User> => {
        const response = await axiosInstance.post<User>('/api/v1/users', data);
        return response.data;
    },

    update: async (id: string, data: UserUpdateRequest): Promise<User> => {
        const response = await axiosInstance.patch<User>(`/api/v1/users/${id}`, data);
        return response.data;
    },

    delete: async (id: string): Promise<ApiResponse> => {
        const response = await axiosInstance.delete<ApiResponse>(`/api/v1/users/${id}`);
        return response.data;
    },
};

// ============================================
// EXPORT ALL APIs
// ============================================

export const api = {
    auth: authApi,
    incidents: incidentsApi,
    dashboard: dashboardApi,
    threatIntel: threatIntelApi,
    workflows: workflowsApi,
    auditLogs: auditLogsApi,
    system: systemApi,
    integrations: integrationsApi,
    users: usersApi,
};

export default api;
