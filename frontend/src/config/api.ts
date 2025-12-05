// API Configuration - Single source of truth for all backend endpoints
// Based on docker-compose.yml service ports

// Base URLs for different environments
const API_BASE_URLS = {
    development: 'http://localhost:8000', // Gateway service (handles auth, routing)
    production: process.env.REACT_APP_API_URL || 'http://localhost:8000',
};

const BASE_URL = API_BASE_URLS[process.env.NODE_ENV as keyof typeof API_BASE_URLS] || API_BASE_URLS.development;

// API Endpoints mapped to backend services
export const API_ENDPOINTS = {
    // Auth endpoints (Gateway - port 8000)
    AUTH: {
        LOGIN: `${BASE_URL}/api/v1/token`,
        REFRESH: `${BASE_URL}/api/v1/token/refresh`,
    },

    // Incidents endpoints (Gateway proxies to services)
    INCIDENTS: {
        LIST: `${BASE_URL}/api/v1/incidents`,
        GET: (id: string) => `${BASE_URL}/api/v1/incidents/${id}`,
        CREATE: `${BASE_URL}/api/v1/incidents`,
        UPDATE: (id: string) => `${BASE_URL}/api/v1/incidents/${id}`,
        DELETE: (id: string) => `${BASE_URL}/api/v1/incidents/${id}`,
    },

    // Triage endpoints
    TRIAGE: {
        ANALYZE: `${BASE_URL}/api/v1/triage/analyze`,
        STATUS: (id: string) => `${BASE_URL}/api/v1/triage/${id}`,
    },

    // Response/Workflow endpoints
    RESPONSE: {
        TRIGGER: `${BASE_URL}/api/v1/response/trigger`,
        STATUS: (id: string) => `${BASE_URL}/api/v1/response/${id}`,
        WORKFLOWS: `${BASE_URL}/api/v1/workflows`,
    },

    // Threat Intelligence
    THREAT_INTEL: {
        IP_LOOKUP: (ip: string) => `${BASE_URL}/api/v1/threat-intel/ip/${ip}`,
        HASH_LOOKUP: (hash: string) => `${BASE_URL}/api/v1/threat-intel/hash/${hash}`,
        DOMAIN_LOOKUP: (domain: string) => `${BASE_URL}/api/v1/threat-intel/domain/${domain}`,
    },

    // Audit Logs
    AUDIT: {
        LIST: `${BASE_URL}/api/v1/audit-logs`,
        VERIFY: `${BASE_URL}/api/v1/audit-logs/verify`,
    },

    // Dashboard/Stats
    DASHBOARD: {
        STATS: `${BASE_URL}/api/v1/dashboard/stats`,
        TRENDS: `${BASE_URL}/api/v1/dashboard/trends`,
    },
};

// WebSocket endpoints (if needed for real-time updates)
export const WS_ENDPOINTS = {
    NOTIFICATIONS: `ws://localhost:8000/ws/notifications`,
    INCIDENTS: `ws://localhost:8000/ws/incidents`,
};

// Export base URL for direct use if needed
export const API_BASE_URL = BASE_URL;

export default API_ENDPOINTS;
