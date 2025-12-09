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

    ignore: async (id: string): Promise<ApiResponse> => {
        const response = await axiosInstance.post<ApiResponse>(
            `/api/v1/incidents/${id}/ignore`,
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
        // Gateway proxy: /api/v1/threatintel/abuseipdb?ip=...
        const response = await axiosInstance.get<{ status: string; data: any }>(
            '/api/v1/threatintel/abuseipdb',
            { params: { ip } },
        );

        const data = response.data?.data || {};

        // Map AbuseIPDB style payload into our IPReputation shape
        const mapped: IPReputation = {
            ip_address: data.ipAddress || ip,
            is_whitelisted: Boolean(data.isWhitelisted),
            abuse_confidence_score: Number(data.abuseConfidenceScore || 0),
            total_reports: Number(data.totalReports || 0),
            last_reported_at: data.lastReportedAt || undefined,
            threat_types: Array.isArray(data.categories)
                ? data.categories.map((c: any) => String(c))
                : [],
            country_code: data.countryCode || 'UN',
            country_name: data.countryName || 'Unknown',
            is_vpn: Boolean(data.isVpn),
            is_proxy: Boolean(data.isProxy),
            is_tor: Boolean(data.isTor),
            is_datacenter: Boolean(data.isHostingProvider),
            usage_type: data.usageType || 'Unknown',
            isp_name: data.isp || data.ispName || 'Unknown ISP',
            domain_name: data.domain || undefined,
        };

        return mapped;
    },

    lookupHash: async (hash: string): Promise<FileHash> => {
        // Gateway proxy: /api/v1/threatintel/malwarebazaar?hash=...
        const response = await axiosInstance.get<{ status: string; data: any }>(
            '/api/v1/threatintel/malwarebazaar',
            { params: { hash } },
        );

        const payload = response.data?.data;
        const first = Array.isArray(payload?.data) ? payload.data[0] : payload;

        const determineHashType = (h: string): FileHash['hash_type'] => {
            if (h.length === 32) return 'MD5';
            if (h.length === 40) return 'SHA1';
            return 'SHA256';
        };

        const file_hash = hash;
        const hash_type = determineHashType(hash);

        const threat_score = first?.intelligence?.threat_score ?? 0;
        const threat_level: FileHash['threat_level'] =
            threat_score >= 80 ? 'MALICIOUS' : threat_score >= 30 ? 'SUSPICIOUS' : 'CLEAN';

        const mapped: FileHash = {
            file_hash,
            hash_type,
            sha256: first?.sha256 || (hash.length === 64 ? hash : undefined),
            md5: first?.md5,
            sha1: first?.sha1,
            file_name: first?.file_name,
            file_size: first?.file_size,
            file_type: first?.file_type,
            magic: first?.file_type || 'unknown',
            threat_level,
            threat_score: Number(threat_score || 0),
            threat_names: Array.isArray(first?.detections)
                ? first.detections.map((d: any) => d.signature || d.family || 'malware')
                : [],
            first_seen: first?.first_seen,
            last_seen: first?.last_seen,
            reporter_count: Number(first?.intelligence?.reports || 0),
            detections: Array.isArray(first?.detections)
                ? first.detections.map((d: any) => ({
                      vendor: d.vendor || 'unknown',
                      category: d.category || 'malware',
                      engine_name: d.engine || d.engine_name || 'unknown',
                  }))
                : [],
        };

        return mapped;
    },

    // Optional: domain lookups can be wired to /api/v1/threatintel/virustotal?resource=...
    lookupDomain: async (domain: string): Promise<any> => {
        const response = await axiosInstance.get('/api/v1/threatintel/virustotal', {
            params: { resource: domain },
        });
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
