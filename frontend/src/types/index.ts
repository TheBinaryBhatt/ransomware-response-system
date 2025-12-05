// ============================================
// CORE ENTITY TYPES
// ============================================

export interface User {
    id: string;
    username: string;
    email: string;
    role: 'admin' | 'analyst' | 'auditor' | 'viewer';
    is_active: boolean;
    is_superuser: boolean;
    created_at: string;
    full_name?: string;
}

export interface Incident {
    incident_id: string;
    alert_id: string;
    source_ip: string;
    destination_ip?: string;
    severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
    status: 'NEW' | 'INVESTIGATING' | 'RESOLVED' | 'ESCALATED' | 'PENDING';
    description: string;
    timestamp: string;
    created_at: string;
    updated_at: string;
    raw_data: Record<string, any>;
    ai_decision?: string;
    ai_confidence?: number;
    response_time?: number;
}

export interface TriageDecision {
    decision: 'confirmed_ransomware' | 'likely_malware' | 'suspicious' | 'benign' | 'false_positive';
    confidence: number;
    reasoning: string;
    timestamp: string;
}

export interface ResponseAction {
    action_id: string;
    incident_id: string;
    action_type: 'quarantine_host' | 'block_ip' | 'enrich_threat_intel' | 'escalate' | 'finalize';
    status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
    started_at?: string;
    completed_at?: string;
    duration?: number;
    result?: Record<string, any>;
    error_message?: string;
}

export interface Workflow {
    workflow_id: string;
    incident_id: string;
    status: 'QUEUED' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
    progress: number;
    current_task?: string;
    tasks: ResponseAction[];
    created_at: string;
    updated_at: string;
    elapsed_time: number;
}

export interface AuditLog {
    log_id: string;
    timestamp: string;
    event_type: 'incident.created' | 'incident.updated' | 'response.triggered' | 'response.completed' | 'user.login' | 'user.logout' | 'settings.changed';
    actor: string;
    incident_id?: string;
    action: string;
    status: 'SUCCESS' | 'PENDING' | 'FAILED' | 'INFO';
    details: Record<string, any>;
    hash: string;
    previous_hash?: string;
}

export interface ThreatIntelIP {
    ip: string;
    reputation_score: number;
    status: 'SAFE' | 'SUSPICIOUS' | 'MALICIOUS';
    abuseipdb?: {
        reports: number;
        last_reported: string;
        confidence_score: number;
    };
    virustotal?: {
        malicious_vendors: number;
        total_vendors: number;
        last_analysis: string;
    };
    malwarebazaar?: {
        samples: number;
        types: string[];
    };
    geolocation?: {
        country: string;
        country_code: string;
        city?: string;
        isp?: string;
        latitude?: number;
        longitude?: number;
    };
}

export interface ThreatIntelHash {
    hash: string;
    hash_type: 'MD5' | 'SHA1' | 'SHA256';
    reputation_score: number;
    filename?: string;
    file_size?: number;
    file_type?: string;
    first_seen?: string;
    last_seen?: string;
    malware_family?: string;
    threat_level: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
    virustotal?: {
        malicious_vendors: number;
        total_vendors: number;
    };
    yara_rules?: string[];
}

export interface Integration {
    integration_id: string;
    name: 'Wazuh' | 'pfSense' | 'AbuseIPDB' | 'MalwareBazaar' | 'VirusTotal' | 'Sigma' | 'YARA';
    enabled: boolean;
    status: 'CONNECTED' | 'DISCONNECTED' | 'ERROR';
    config: Record<string, any>;
    last_checked: string;
}

export interface SystemHealth {
    service: string;
    status: 'HEALTHY' | 'DEGRADED' | 'OFFLINE';
    latency?: number;
    metric?: string;
    last_checked: string;
}

// ============================================
// DASHBOARD STATS
// ============================================

export interface DashboardStats {
    total_incidents: number;
    critical_alerts: number;
    avg_response_time: number;
    success_rate: number;
}

export interface IncidentTrend {
    date: string;
    total: number;
    critical: number;
    resolved: number;
}

export interface ThreatBreakdown {
    threat_type: 'Ransomware' | 'Phishing' | 'Malware' | 'DDoS' | 'Insider' | 'Other';
    count: number;
    percentage: number;
}

export interface StatusBreakdown {
    status: 'PENDING' | 'INVESTIGATING' | 'RESOLVED' | 'ESCALATED';
    count: number;
    percentage: number;
}

// ============================================
// UI STATE TYPES
// ============================================

export interface Notification {
    id: string;
    message: string;
    type: 'success' | 'error' | 'warning' | 'info';
    duration?: number;
    timestamp: string;
}

export interface Filter {
    search?: string;
    severity?: string;
    status?: string;
    start_date?: string;
    end_date?: string;
}

export interface Pagination {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
}

// ============================================
// WEBSOCKET EVENT TYPES
// ============================================

export interface WebSocketEvent {
    event: string;
    payload: any;
    timestamp: string;
}

export type WebSocketEventType =
    | 'incident.received'
    | 'incident.triaged'
    | 'response.task.started'
    | 'response.task.completed'
    | 'response.workflow.started'
    | 'response.workflow.completed'
    | 'audit.log.created';
