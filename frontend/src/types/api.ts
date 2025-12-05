// ============================================
// API RESPONSE TYPES
// ============================================

export interface ApiResponse<T = any> {
    success: boolean;
    data?: T;
    message?: string;
    error?: string;
    status_code?: number;
    timestamp: string;
}

export interface PaginatedResponse<T> {
    success: boolean;
    data: T[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        total_pages: number;
    };
    timestamp: string;
}

export interface LoginRequest {
    username: string;
    password: string;
}

export interface LoginResponse {
    access_token: string;
    token_type: string;
    role?: string;
}

export interface UserCreateRequest {
    username: string;
    email: string;
    password: string;
    role: 'admin' | 'analyst' | 'auditor' | 'viewer';
    is_active?: boolean;
}

export interface UserUpdateRequest {
    password?: string;
    role?: 'admin' | 'analyst' | 'auditor' | 'viewer';
    is_active?: boolean;
}

export interface IncidentQuery {
    page?: number;
    limit?: number;
    search?: string;
    severity?: string;
    status?: string;
    start_date?: string;
    end_date?: string;
}

export interface TriggerResponseRequest {
    manual?: boolean;
    reason?: string;
}

export interface AuditLogQuery {
    page?: number;
    limit?: number;
    start_date?: string;
    end_date?: string;
    event_type?: string;
    actor?: string;
    search?: string;
}
