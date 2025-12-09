// ============================================
// APP CONSTANTS
// ============================================

export const APP_NAME = 'Ransomware Response System';
export const APP_SHORT_NAME = 'RRS';
export const APP_VERSION = '1.1.0';

// API Configuration
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
export const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8000';

// LocalStorage Keys
export const STORAGE_KEYS = {
    TOKEN: 'rrs_access_token',
    USER: 'rrs_user_data',
    REMEMBER_ME: 'rrs_remember_me',
    SIDEBAR_COLLAPSED: 'sidebar_collapsed',
    THEME: 'rrs_theme',
} as const;

// Color Palette
export const COLORS = {
    PRIMARY_BG: '#1F2121',
    SURFACE_BG: '#252727',
    ACCENT_PRIMARY: '#32B8C6',
    TEXT_PRIMARY: '#FCFCF9',
    TEXT_SECONDARY: '#A7A9A9',
    STATUS_CRITICAL: '#EF4444',
    STATUS_WARNING: '#F59E0B',
    STATUS_SUCCESS: '#10B981',
    STATUS_INFO: '#32B8C6',
    DARK_BORDER: '#3A3C3C',
} as const;

// Severity Levels
export const SEVERITY_LEVELS = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'] as const;
export type SeverityLevel = typeof SEVERITY_LEVELS[number];

// Status Types
export const STATUS_TYPES = ['NEW', 'INVESTIGATING', 'RESOLVED', 'ESCALATED', 'PENDING', 'FALSE_POSITIVE'] as const;
export type StatusType = typeof STATUS_TYPES[number];

// User Roles
export const USER_ROLES = ['admin', 'analyst', 'auditor', 'viewer'] as const;
export type UserRole = typeof USER_ROLES[number];

// Pagination
export const DEFAULT_PAGE_SIZE = 50;
export const PAGE_SIZE_OPTIONS = [20, 50, 100];

// Websocket Events
export const WS_EVENTS = {
    INCIDENT_RECEIVED: 'incident.received',
    INCIDENT_TRIAGED: 'incident.triaged',
    RESPONSE_TASK_STARTED: 'response.task.started',
    RESPONSE_TASK_COMPLETED: 'response.task.completed',
    RESPONSE_WORKFLOW_STARTED: 'response.workflow.started',
    RESPONSE_WORKFLOW_COMPLETED: 'response.workflow.completed',
    AUDIT_LOG_CREATED: 'audit.log.created',
} as const;

// Notification Duration (ms)
export const NOTIFICATION_DURATION = {
    SUCCESS: 3000,
    ERROR: 5000,
    WARNING: 4000,
    INFO: 3000,
} as const;

// Chart Colors
export const CHART_COLORS = {
    TOTAL: '#32B8C6',
    CRITICAL: '#EF4444',
    RESOLVED: '#10B981',
    PENDING: '#F59E0B',
    INVESTIGATING: '#F59E0B',
    ESCALATED: '#EF4444',
} as const;

// Routes
export const ROUTES = {
    LOGIN: '/login',
    DASHBOARD: '/dashboard',
    INCIDENTS: '/incidents',
    INCIDENT_DETAIL: '/incidents/:id',
    THREAT_INTEL: '/threat-intel',
    WORKFLOWS: '/workflows',
    AUDIT_LOGS: '/audit-logs',
    SETTINGS: '/settings',
} as const;
