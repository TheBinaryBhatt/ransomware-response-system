// ============================================
// INCIDENT TYPES - Phase 2 Incidents Management
// ============================================

export interface IncidentFilters {
    status?: string;
    severity?: string;
    threat_type?: string;
    search?: string;
}

export interface IncidentDetail {
    id: string;
    alert_id: string;
    severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
    status: 'NEW' | 'PENDING' | 'INVESTIGATING' | 'RESOLVED' | 'ESCALATED';
    description: string;
    source_ip: string | null;
    destination_ip: string | null;
    raw_data: Record<string, any>;
    timestamp: string | null;
    created_at: string | null;
    updated_at: string | null;
    triage?: {
        decision: string | null;
        confidence: number | null;
        reasoning: string | null;
        actions: string[];
    } | null;
}

export interface IncidentStats {
    total: number;
    critical: number;
    pending: number;
    resolved: number;
}

export type SeverityLevel = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
export type StatusLevel = 'NEW' | 'PENDING' | 'INVESTIGATING' | 'RESOLVED' | 'ESCALATED';
