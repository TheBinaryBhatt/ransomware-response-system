// ============================================
// AUDIT LOG TYPES - Phase 5 Audit Logs & Compliance
// ============================================

export type AuditEventType =
    | 'LOGIN'
    | 'LOGOUT'
    | 'INCIDENT_CREATED'
    | 'INCIDENT_UPDATED'
    | 'INCIDENT_RESOLVED'
    | 'RESPONSE_TRIGGERED'
    | 'WORKFLOW_EXECUTED'
    | 'CONFIG_CHANGED'
    | 'USER_CREATED'
    | 'USER_DELETED'
    | 'PERMISSION_CHANGED'
    | 'DATA_EXPORTED';

export type ActorRole = 'admin' | 'analyst' | 'auditor';
export type TargetType = 'incident' | 'workflow' | 'user' | 'config' | 'system';
export type AuditStatus = 'success' | 'failure' | 'pending';

export interface AuditLogMetadata {
    ip_address?: string;
    user_agent?: string;
    changes?: Record<string, unknown>;
    error_message?: string;
}

export interface AuditLog {
    log_id: string;
    timestamp: string;
    event_type: AuditEventType;
    description: string;
    actor: string;
    actor_role: ActorRole;
    target_resource: string;
    target_type: TargetType;
    action: string;
    status: AuditStatus;
    metadata?: AuditLogMetadata;
    integrity_hash: string;
    previous_hash?: string;
}

export interface AuditLogFilters {
    event_type?: string;
    actor?: string;
    target_type?: string;
    status?: string;
    date_from?: string;
    date_to?: string;
    search?: string;
}

export interface AuditStats {
    total_events: number;
    events_today: number;
    events_this_week: number;
    failed_events: number;
    unique_actors: number;
    last_event_timestamp: string;
}

export interface IntegrityVerification {
    is_valid: boolean;
    tampered_count: number;
    valid_count: number;
    chain_integrity: boolean;
}

export type ComplianceReportType = 'SOC2' | 'HIPAA' | 'ISO27001';

export interface ComplianceReport {
    report_name: string;
    report_type: ComplianceReportType;
    generated_at: string;
    period: {
        start: string;
        end: string;
    };
    statistics: {
        total_events: number;
        security_events: number;
        user_actions: number;
        system_changes: number;
        failed_attempts: number;
    };
    findings: Array<{
        title: string;
        description: string;
        severity: 'info' | 'warning' | 'critical';
        affected_count: number;
    }>;
    recommendations: string[];
}
