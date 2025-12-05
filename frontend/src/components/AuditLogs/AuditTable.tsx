// ============================================
// AuditTable - Display audit logs in table format
// ============================================

import React from 'react';
import {
    ChevronLeft,
    ChevronRight,
    CheckCircle,
    AlertCircle,
    Clock,
    LogIn,
    LogOut,
    FileText,
    Settings,
    Users,
    Shield,
    Download,
    Zap
} from 'lucide-react';
import type { AuditLog, AuditEventType, AuditStatus } from '../../types/auditlog';

interface AuditTableProps {
    logs: AuditLog[];
    loading: boolean;
    total: number;
    page: number;
    limit: number;
    onPageChange: (page: number) => void;
    onRowClick: (log: AuditLog) => void;
}

// Event type styling
const eventConfig: Record<AuditEventType, { color: string; icon: React.ElementType }> = {
    LOGIN: { color: 'bg-blue-500/10 text-blue-400', icon: LogIn },
    LOGOUT: { color: 'bg-slate-500/10 text-slate-400', icon: LogOut },
    INCIDENT_CREATED: { color: 'bg-red-500/10 text-red-400', icon: FileText },
    INCIDENT_UPDATED: { color: 'bg-orange-500/10 text-orange-400', icon: FileText },
    RESPONSE_TRIGGERED: { color: 'bg-green-500/10 text-green-400', icon: Zap },
    WORKFLOW_EXECUTED: { color: 'bg-purple-500/10 text-purple-400', icon: Zap },
    CONFIG_CHANGED: { color: 'bg-yellow-500/10 text-yellow-400', icon: Settings },
    USER_CREATED: { color: 'bg-teal-500/10 text-teal-400', icon: Users },
    USER_DELETED: { color: 'bg-red-600/10 text-red-500', icon: Users },
    PERMISSION_CHANGED: { color: 'bg-indigo-500/10 text-indigo-400', icon: Shield },
    DATA_EXPORTED: { color: 'bg-cyan-500/10 text-cyan-400', icon: Download },
};

const statusConfig: Record<AuditStatus, { color: string; icon: React.ElementType }> = {
    success: { color: 'text-green-400', icon: CheckCircle },
    failure: { color: 'text-red-400', icon: AlertCircle },
    pending: { color: 'text-yellow-400', icon: Clock },
};

const AuditTable: React.FC<AuditTableProps> = ({
    logs,
    loading,
    total,
    page,
    limit,
    onPageChange,
    onRowClick,
}) => {
    const totalPages = Math.ceil(total / limit) || 1;

    const formatTime = (timestamp: string) => {
        const date = new Date(timestamp);
        return date.toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
        });
    };

    if (loading) {
        return (
            <div className="space-y-2">
                {[...Array(10)].map((_, i) => (
                    <div key={i} className="h-14 bg-dark-surface rounded-lg animate-pulse" />
                ))}
            </div>
        );
    }

    if (logs.length === 0) {
        return (
            <div className="text-center py-16 bg-dark-surface rounded-xl border border-accent-teal/10">
                <FileText size={48} className="mx-auto text-text-secondary/30 mb-4" />
                <p className="text-text-secondary text-lg font-medium">No audit logs found</p>
                <p className="text-text-secondary/60 text-sm mt-1">
                    Try adjusting your filters
                </p>
            </div>
        );
    }

    return (
        <div>
            {/* Table */}
            <div className="overflow-hidden rounded-xl border border-accent-teal/10">
                <table className="w-full">
                    <thead>
                        <tr className="bg-dark-surface/80">
                            <th className="px-4 py-3 text-left text-text-secondary text-xs font-semibold uppercase tracking-wider">
                                Timestamp
                            </th>
                            <th className="px-4 py-3 text-left text-text-secondary text-xs font-semibold uppercase tracking-wider">
                                Event
                            </th>
                            <th className="px-4 py-3 text-left text-text-secondary text-xs font-semibold uppercase tracking-wider">
                                Actor
                            </th>
                            <th className="px-4 py-3 text-left text-text-secondary text-xs font-semibold uppercase tracking-wider">
                                Target
                            </th>
                            <th className="px-4 py-3 text-left text-text-secondary text-xs font-semibold uppercase tracking-wider">
                                Description
                            </th>
                            <th className="px-4 py-3 text-left text-text-secondary text-xs font-semibold uppercase tracking-wider">
                                Status
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-accent-teal/5">
                        {logs.map((log) => {
                            const eventStyle = eventConfig[log.event_type] || eventConfig.CONFIG_CHANGED;
                            const EventIcon = eventStyle.icon;
                            const statusStyle = statusConfig[log.status] || statusConfig.pending;
                            const StatusIcon = statusStyle.icon;

                            return (
                                <tr
                                    key={log.log_id}
                                    onClick={() => onRowClick(log)}
                                    className="bg-dark-surface hover:bg-dark-surface/70 cursor-pointer transition-colors group"
                                >
                                    <td className="px-4 py-3">
                                        <span className="text-text-secondary text-sm font-mono">
                                            {formatTime(log.timestamp)}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-semibold ${eventStyle.color}`}>
                                            <EventIcon size={12} />
                                            <span>{log.event_type.replace(/_/g, ' ')}</span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div>
                                            <p className="text-text-primary text-sm font-medium group-hover:text-accent-teal transition-colors">
                                                {log.actor}
                                            </p>
                                            <p className="text-text-secondary text-xs capitalize">
                                                {log.actor_role}
                                            </p>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className="text-accent-teal text-sm font-mono">
                                            {log.target_resource.length > 20
                                                ? `${log.target_resource.slice(0, 20)}...`
                                                : log.target_resource}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <p className="text-text-secondary text-sm max-w-xs truncate">
                                            {log.description}
                                        </p>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className={`inline-flex items-center gap-1 ${statusStyle.color}`}>
                                            <StatusIcon size={14} />
                                            <span className="text-xs font-semibold capitalize">
                                                {log.status}
                                            </span>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between mt-4 px-2">
                <p className="text-text-secondary text-sm">
                    Showing <span className="font-semibold text-text-primary">{(page - 1) * limit + 1}</span> to{' '}
                    <span className="font-semibold text-text-primary">{Math.min(page * limit, total)}</span> of{' '}
                    <span className="font-semibold text-text-primary">{total}</span> logs
                </p>

                <div className="flex items-center gap-2">
                    <button
                        onClick={() => onPageChange(page - 1)}
                        disabled={page === 1}
                        className="p-2 hover:bg-dark-surface disabled:opacity-30 disabled:cursor-not-allowed rounded-lg transition-colors"
                    >
                        <ChevronLeft size={18} className="text-text-secondary" />
                    </button>

                    <div className="flex items-center gap-1">
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                            let pageNum: number;
                            if (totalPages <= 5) {
                                pageNum = i + 1;
                            } else if (page <= 3) {
                                pageNum = i + 1;
                            } else if (page >= totalPages - 2) {
                                pageNum = totalPages - 4 + i;
                            } else {
                                pageNum = page - 2 + i;
                            }

                            return (
                                <button
                                    key={pageNum}
                                    onClick={() => onPageChange(pageNum)}
                                    className={`w-8 h-8 rounded-lg text-sm font-semibold transition-all ${page === pageNum
                                            ? 'bg-accent-teal text-dark-bg'
                                            : 'text-text-secondary hover:bg-dark-surface hover:text-text-primary'
                                        }`}
                                >
                                    {pageNum}
                                </button>
                            );
                        })}
                    </div>

                    <button
                        onClick={() => onPageChange(page + 1)}
                        disabled={page === totalPages}
                        className="p-2 hover:bg-dark-surface disabled:opacity-30 disabled:cursor-not-allowed rounded-lg transition-colors"
                    >
                        <ChevronRight size={18} className="text-text-secondary" />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AuditTable;
