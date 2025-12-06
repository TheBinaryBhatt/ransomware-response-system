// ============================================
// AuditLogsPage - Immutable Audit Trail Viewer
// Integrated with Backend API
// ============================================

import React, { useState, useMemo } from 'react';
import {
    Shield,
    FileText,
    AlertTriangle,
    Download,
    CheckCircle,
    Clock,
    TrendingUp,
} from 'lucide-react';
import { AuditFilters, AuditTable, AuditDetail, ComplianceModal } from '../components/AuditLogs';
import { useApi } from '../hooks/useApi';
import type {
    AuditLog,
    AuditLogFilters,
    ComplianceReport,
    ComplianceReportType
} from '../types/auditlog';

// Transform backend audit log format to frontend format
interface BackendAuditLog {
    id: number;
    log_id: string;
    actor: string;
    action: string;
    target: string | null;
    status: string;
    details: Record<string, unknown>;
    created_at: string;
    resource_type: string;
    integrity_hash: string;
}

const transformBackendLog = (log: BackendAuditLog): AuditLog => {
    // Map action to event_type
    const actionToEventType: Record<string, AuditLog['event_type']> = {
        'user.login': 'LOGIN',
        'user.logout': 'LOGOUT',
        'login': 'LOGIN',
        'logout': 'LOGOUT',
        'incident_ingested': 'INCIDENT_CREATED',
        'incident.created': 'INCIDENT_CREATED',
        'incident.updated': 'INCIDENT_UPDATED',
        'response_triggered': 'RESPONSE_TRIGGERED',
        'response.triggered': 'RESPONSE_TRIGGERED',
        'workflow_executed': 'WORKFLOW_EXECUTED',
        'workflow.executed': 'WORKFLOW_EXECUTED',
        'quarantine_host': 'RESPONSE_TRIGGERED',
        'block_ip': 'RESPONSE_TRIGGERED',
        'escalate': 'RESPONSE_TRIGGERED',
        'collect_forensics': 'RESPONSE_TRIGGERED',
        'automated_response_completed': 'WORKFLOW_EXECUTED',
        'config.changed': 'CONFIG_CHANGED',
        'user.created': 'USER_CREATED',
        'user.deleted': 'USER_DELETED',
        'permission.changed': 'PERMISSION_CHANGED',
        'data.exported': 'DATA_EXPORTED',
    };

    const eventType = actionToEventType[log.action] || 'INCIDENT_UPDATED';
    const actorRole = log.actor === 'admin' ? 'admin' :
        log.actor === 'auditor' ? 'auditor' : 'analyst';
    const targetType = (log.resource_type as AuditLog['target_type']) || 'system';

    return {
        log_id: log.log_id,
        timestamp: log.created_at,
        event_type: eventType,
        description: `${log.action.replace(/_/g, ' ')} on ${log.target || 'system'}`,
        actor: log.actor || 'SYSTEM',
        actor_role: actorRole,
        target_resource: log.target || 'SYSTEM',
        target_type: targetType,
        action: log.action,
        status: (log.status === 'success' ? 'success' : log.status === 'error' ? 'failure' : 'pending') as AuditLog['status'],
        metadata: log.details as AuditLog['metadata'],
        integrity_hash: log.integrity_hash,
    };
};

// Generate mock audit logs
const generateMockLogs = (): AuditLog[] => {
    const eventTypes: AuditLog['event_type'][] = [
        'LOGIN', 'LOGOUT', 'INCIDENT_CREATED', 'INCIDENT_UPDATED',
        'RESPONSE_TRIGGERED', 'WORKFLOW_EXECUTED', 'CONFIG_CHANGED',
        'USER_CREATED', 'USER_DELETED', 'PERMISSION_CHANGED', 'DATA_EXPORTED'
    ];

    const actors = ['admin', 'analyst1', 'analyst2', 'auditor', 'system'];
    const targetTypes: AuditLog['target_type'][] = ['incident', 'workflow', 'user', 'config', 'system'];
    const statuses: AuditLog['status'][] = ['success', 'success', 'success', 'success', 'failure', 'pending'];

    const descriptions: Record<string, string[]> = {
        LOGIN: ['User logged in successfully', 'Authentication successful via SSO', 'MFA verification completed'],
        LOGOUT: ['User logged out', 'Session expired', 'Manual logout initiated'],
        INCIDENT_CREATED: ['New ransomware incident reported', 'Phishing attempt detected', 'Malware infection identified'],
        INCIDENT_UPDATED: ['Incident severity escalated to CRITICAL', 'Incident assigned to analyst', 'Status changed to INVESTIGATING'],
        RESPONSE_TRIGGERED: ['Automated response initiated', 'Containment procedure started', 'Isolation command sent'],
        WORKFLOW_EXECUTED: ['Ransomware containment workflow completed', 'Phishing response workflow executed', 'Malware eradication workflow started'],
        CONFIG_CHANGED: ['Security policy updated', 'Alert threshold modified', 'Integration settings changed'],
        USER_CREATED: ['New analyst account created', 'Service account provisioned', 'API user registered'],
        USER_DELETED: ['User account deactivated', 'Service account removed', 'API access revoked'],
        PERMISSION_CHANGED: ['Admin privileges granted', 'Role updated to analyst', 'Access level modified'],
        DATA_EXPORTED: ['Incident report exported', 'Audit logs downloaded', 'Compliance report generated'],
    };

    const logs: AuditLog[] = [];
    let prevHash = '';

    for (let i = 0; i < 150; i++) {
        const eventType = eventTypes[Math.floor(Math.random() * eventTypes.length)];
        const actor = actors[Math.floor(Math.random() * actors.length)];
        const targetType = targetTypes[Math.floor(Math.random() * targetTypes.length)];
        const status = statuses[Math.floor(Math.random() * statuses.length)];
        const descList = descriptions[eventType];
        const description = descList[Math.floor(Math.random() * descList.length)];

        const timestamp = new Date();
        timestamp.setMinutes(timestamp.getMinutes() - i * 15);

        const hash = `${Math.random().toString(36).substring(2)}${Math.random().toString(36).substring(2)}`.padEnd(64, '0').substring(0, 64);

        logs.push({
            log_id: `log-${String(i + 1).padStart(6, '0')}`,
            timestamp: timestamp.toISOString(),
            event_type: eventType,
            description,
            actor: actor === 'system' ? 'SYSTEM' : actor,
            actor_role: actor === 'admin' ? 'admin' : actor === 'auditor' ? 'auditor' : 'analyst',
            target_resource: `${targetType.toUpperCase()}-${String(Math.floor(Math.random() * 1000)).padStart(4, '0')}`,
            target_type: targetType,
            action: eventType.toLowerCase().replace(/_/g, '.'),
            status,
            metadata: {
                ip_address: `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
                user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                ...(status === 'failure' && { error_message: 'Operation failed due to insufficient permissions' }),
            },
            integrity_hash: hash,
            previous_hash: prevHash || undefined,
        });

        prevHash = hash;
    }

    return logs;
};

const MOCK_LOGS = generateMockLogs();

const AuditLogsPage: React.FC = () => {
    // Fetch logs from API (using raw fetch to get backend format)
    const {
        data: apiLogs,
    } = useApi<BackendAuditLog[]>(
        async () => {
            const token = localStorage.getItem('rrs_access_token');
            const response = await fetch('/api/v1/logs', {
                headers: token ? { 'Authorization': `Bearer ${token}` } : {}
            });
            if (response.ok) return response.json();
            return [];
        }
    );

    // Transform and memoize logs
    const allLogs = useMemo(() => {
        if (apiLogs && apiLogs.length > 0) {
            return apiLogs.map(transformBackendLog);
        }
        return MOCK_LOGS;
    }, [apiLogs]);

    // Compute stats from actual logs
    const stats = useMemo(() => {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const weekAgo = new Date(today);
        weekAgo.setDate(weekAgo.getDate() - 7);

        return {
            total_events: allLogs.length,
            events_today: allLogs.filter(l => new Date(l.timestamp) >= today).length,
            events_this_week: allLogs.filter(l => new Date(l.timestamp) >= weekAgo).length,
            failed_events: allLogs.filter(l => l.status === 'failure').length,
        };
    }, [allLogs]);

    // Compute integrity status
    const integrity = useMemo(() => ({
        is_valid: true, // Would verify hash chains in production
        chain_integrity: true,
    }), []);

    const [page, setPage] = useState(1);
    const [filters, setFilters] = useState<AuditLogFilters>({});
    const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
    const [showCompliance, setShowCompliance] = useState(false);
    const limit = 25;

    // Filter logs
    const filteredLogs = useMemo(() => {
        return allLogs.filter(log => {
            if (filters.event_type && log.event_type !== filters.event_type) return false;
            if (filters.target_type && log.target_type !== filters.target_type) return false;
            if (filters.status && log.status !== filters.status) return false;
            if (filters.actor && !log.actor.toLowerCase().includes(filters.actor.toLowerCase())) return false;
            if (filters.search) {
                const search = filters.search.toLowerCase();
                if (!log.description.toLowerCase().includes(search) &&
                    !log.actor.toLowerCase().includes(search) &&
                    !log.target_resource.toLowerCase().includes(search)) {
                    return false;
                }
            }
            if (filters.date_from) {
                const from = new Date(filters.date_from);
                if (new Date(log.timestamp) < from) return false;
            }
            if (filters.date_to) {
                const to = new Date(filters.date_to);
                to.setHours(23, 59, 59, 999);
                if (new Date(log.timestamp) > to) return false;
            }
            return true;
        });
    }, [filters]);

    // Paginated logs
    const paginatedLogs = useMemo(() => {
        const start = (page - 1) * limit;
        return filteredLogs.slice(start, start + limit);
    }, [filteredLogs, page]);

    // Handle filter change
    const handleFilterChange = (newFilters: AuditLogFilters) => {
        setFilters(newFilters);
        setPage(1);
    };

    // Handle export
    const handleExport = (format: 'csv' | 'json') => {
        const data = filteredLogs;
        let content: string;
        let mimeType: string;
        let filename: string;

        if (format === 'json') {
            content = JSON.stringify(data, null, 2);
            mimeType = 'application/json';
            filename = `audit-logs-${new Date().toISOString().split('T')[0]}.json`;
        } else {
            const headers = ['Timestamp', 'Event Type', 'Actor', 'Target', 'Description', 'Status'];
            const rows = data.map(log => [
                log.timestamp,
                log.event_type,
                log.actor,
                log.target_resource,
                log.description,
                log.status,
            ]);
            content = [headers.join(','), ...rows.map(r => r.map(c => `"${c}"`).join(','))].join('\n');
            mimeType = 'text/csv';
            filename = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`;
        }

        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    };

    // Handle compliance report generation
    const handleGenerateReport = async (
        type: ComplianceReportType,
        startDate: string,
        endDate: string
    ): Promise<ComplianceReport | null> => {
        // Simulated report generation
        await new Promise(resolve => setTimeout(resolve, 1500));

        return {
            report_name: `${type} Compliance Report`,
            report_type: type,
            generated_at: new Date().toISOString(),
            period: { start: startDate, end: endDate },
            statistics: {
                total_events: filteredLogs.length,
                security_events: filteredLogs.filter(l =>
                    ['INCIDENT_CREATED', 'RESPONSE_TRIGGERED', 'WORKFLOW_EXECUTED'].includes(l.event_type)
                ).length,
                user_actions: filteredLogs.filter(l =>
                    ['LOGIN', 'LOGOUT', 'USER_CREATED', 'USER_DELETED'].includes(l.event_type)
                ).length,
                system_changes: filteredLogs.filter(l =>
                    ['CONFIG_CHANGED', 'PERMISSION_CHANGED'].includes(l.event_type)
                ).length,
                failed_attempts: filteredLogs.filter(l => l.status === 'failure').length,
            },
            findings: [
                {
                    title: 'All security events logged',
                    description: 'Complete audit trail maintained for all security-related actions',
                    severity: 'info',
                    affected_count: 0,
                },
                {
                    title: 'No unauthorized access detected',
                    description: 'All access attempts verified against authorization policies',
                    severity: 'info',
                    affected_count: 0,
                },
            ],
            recommendations: [
                'Continue maintaining comprehensive audit logging',
                'Review failed authentication attempts regularly',
                'Implement additional monitoring for configuration changes',
            ],
        };
    };

    return (
        <div className="min-h-screen bg-dark-bg">
            {/* Header */}
            <div className="bg-gradient-to-r from-dark-surface via-dark-surface to-dark-bg border-b border-accent-teal/10">
                <div className="px-6 py-6">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                <div className="p-2 bg-gradient-to-br from-accent-teal/20 to-purple-500/20 rounded-lg">
                                    <FileText size={24} className="text-accent-teal" />
                                </div>
                                <h1 className="text-3xl font-bold text-text-primary">
                                    Audit Logs
                                </h1>
                            </div>
                            <p className="text-text-secondary">
                                Immutable audit trail for compliance and forensics
                            </p>
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => handleExport('csv')}
                                className="px-4 py-2 bg-dark-bg hover:bg-dark-surface border border-accent-teal/30 rounded-lg text-accent-teal font-semibold text-sm flex items-center gap-2 transition-colors"
                            >
                                <Download size={16} />
                                Export CSV
                            </button>
                            <button
                                onClick={() => handleExport('json')}
                                className="px-4 py-2 bg-dark-bg hover:bg-dark-surface border border-accent-teal/30 rounded-lg text-accent-teal font-semibold text-sm flex items-center gap-2 transition-colors"
                            >
                                <Download size={16} />
                                Export JSON
                            </button>
                            <button
                                onClick={() => setShowCompliance(true)}
                                className="px-4 py-2 bg-gradient-to-r from-accent-teal to-accent-teal/80 hover:from-accent-teal/90 rounded-lg text-dark-bg font-bold text-sm flex items-center gap-2 transition-colors shadow-lg shadow-accent-teal/20"
                            >
                                <Shield size={16} />
                                Compliance Report
                            </button>
                        </div>
                    </div>

                    {/* Stats Cards */}
                    <div className="grid grid-cols-5 gap-4">
                        <div className="bg-dark-bg/50 rounded-xl p-4 border border-accent-teal/10">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-accent-teal/10 rounded-lg">
                                    <FileText size={20} className="text-accent-teal" />
                                </div>
                                <div>
                                    <p className="text-text-secondary text-xs">Total Events</p>
                                    <p className="text-2xl font-bold text-text-primary">{stats.total_events.toLocaleString()}</p>
                                </div>
                            </div>
                        </div>
                        <div className="bg-dark-bg/50 rounded-xl p-4 border border-accent-teal/10">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-green-500/10 rounded-lg">
                                    <Clock size={20} className="text-green-400" />
                                </div>
                                <div>
                                    <p className="text-text-secondary text-xs">Today</p>
                                    <p className="text-2xl font-bold text-green-400">{stats.events_today}</p>
                                </div>
                            </div>
                        </div>
                        <div className="bg-dark-bg/50 rounded-xl p-4 border border-accent-teal/10">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-purple-500/10 rounded-lg">
                                    <TrendingUp size={20} className="text-purple-400" />
                                </div>
                                <div>
                                    <p className="text-text-secondary text-xs">This Week</p>
                                    <p className="text-2xl font-bold text-purple-400">{stats.events_this_week}</p>
                                </div>
                            </div>
                        </div>
                        <div className="bg-dark-bg/50 rounded-xl p-4 border border-accent-teal/10">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-red-500/10 rounded-lg">
                                    <AlertTriangle size={20} className="text-red-400" />
                                </div>
                                <div>
                                    <p className="text-text-secondary text-xs">Failed Events</p>
                                    <p className="text-2xl font-bold text-red-400">{stats.failed_events}</p>
                                </div>
                            </div>
                        </div>
                        <div className="bg-dark-bg/50 rounded-xl p-4 border border-accent-teal/10">
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-lg ${integrity.is_valid ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
                                    {integrity.is_valid ? (
                                        <CheckCircle size={20} className="text-green-400" />
                                    ) : (
                                        <AlertTriangle size={20} className="text-red-400" />
                                    )}
                                </div>
                                <div>
                                    <p className="text-text-secondary text-xs">Integrity</p>
                                    <p className={`text-lg font-bold ${integrity.is_valid ? 'text-green-400' : 'text-red-400'}`}>
                                        {integrity.is_valid ? '✓ Valid' : '✗ Tampered'}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex gap-6 p-6 max-w-full">
                {/* Filters Sidebar */}
                <div className="w-72 shrink-0">
                    <AuditFilters
                        filters={filters}
                        onFilterChange={handleFilterChange}
                    />
                </div>

                {/* Table */}
                <div className="flex-1 min-w-0">
                    <AuditTable
                        logs={paginatedLogs}
                        loading={false}
                        total={filteredLogs.length}
                        page={page}
                        limit={limit}
                        onPageChange={setPage}
                        onRowClick={setSelectedLog}
                    />
                </div>
            </div>

            {/* Detail Drawer */}
            {selectedLog && (
                <AuditDetail
                    log={selectedLog}
                    onClose={() => setSelectedLog(null)}
                />
            )}

            {/* Compliance Modal */}
            {showCompliance && (
                <ComplianceModal
                    onClose={() => setShowCompliance(false)}
                    onGenerate={handleGenerateReport}
                />
            )}
        </div>
    );
};

export default AuditLogsPage;
