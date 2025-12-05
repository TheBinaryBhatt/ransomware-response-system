// ============================================
// IncidentTable Component - Table with pagination
// ============================================

import React from 'react';
import { ChevronLeft, ChevronRight, AlertTriangle, Clock, ExternalLink } from 'lucide-react';
import type { Incident } from '../../types';

interface IncidentTableProps {
    incidents: Incident[];
    loading: boolean;
    total: number;
    page: number;
    limit: number;
    onPageChange: (page: number) => void;
    onRowClick: (incident: Incident) => void;
}

const IncidentTable: React.FC<IncidentTableProps> = ({
    incidents,
    loading,
    total,
    page,
    limit,
    onPageChange,
    onRowClick,
}) => {
    const totalPages = Math.ceil(total / limit) || 1;

    // Severity color mapping
    const severityConfig: Record<string, { bg: string; text: string; border: string }> = {
        CRITICAL: { bg: 'bg-red-500/15', text: 'text-red-400', border: 'border-red-500/30' },
        HIGH: { bg: 'bg-orange-500/15', text: 'text-orange-400', border: 'border-orange-500/30' },
        MEDIUM: { bg: 'bg-yellow-500/15', text: 'text-yellow-400', border: 'border-yellow-500/30' },
        LOW: { bg: 'bg-green-500/15', text: 'text-green-400', border: 'border-green-500/30' },
        INFO: { bg: 'bg-blue-500/15', text: 'text-blue-400', border: 'border-blue-500/30' },
    };

    // Status color mapping
    const statusConfig: Record<string, { bg: string; text: string; dot: string }> = {
        NEW: { bg: 'bg-blue-500/10', text: 'text-blue-400', dot: 'bg-blue-400' },
        PENDING: { bg: 'bg-yellow-500/10', text: 'text-yellow-400', dot: 'bg-yellow-400' },
        INVESTIGATING: { bg: 'bg-orange-500/10', text: 'text-orange-400', dot: 'bg-orange-400' },
        RESOLVED: { bg: 'bg-green-500/10', text: 'text-green-400', dot: 'bg-green-400' },
        ESCALATED: { bg: 'bg-red-500/10', text: 'text-red-400', dot: 'bg-red-400' },
    };

    // Format timestamp
    const formatTime = (timestamp: string | null | undefined) => {
        if (!timestamp) return '—';
        try {
            const date = new Date(timestamp);
            return date.toLocaleString('en-US', {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
            });
        } catch {
            return '—';
        }
    };

    // Format IP address with fallback
    const formatIP = (ip: string | null | undefined) => {
        return ip || '—';
    };

    // Loading skeleton
    if (loading) {
        return (
            <div className="bg-dark-surface rounded-xl border border-accent-teal/20 overflow-hidden">
                <div className="p-4 border-b border-accent-teal/10">
                    <div className="h-6 w-32 bg-dark-bg rounded animate-pulse" />
                </div>
                <div className="divide-y divide-accent-teal/10">
                    {[...Array(8)].map((_, i) => (
                        <div key={i} className="p-4 flex gap-4">
                            <div className="h-4 w-20 bg-dark-bg rounded animate-pulse" />
                            <div className="h-4 w-28 bg-dark-bg rounded animate-pulse" />
                            <div className="h-4 w-28 bg-dark-bg rounded animate-pulse" />
                            <div className="h-4 w-16 bg-dark-bg rounded animate-pulse" />
                            <div className="h-4 w-20 bg-dark-bg rounded animate-pulse" />
                            <div className="flex-1" />
                            <div className="h-4 w-24 bg-dark-bg rounded animate-pulse" />
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    // Empty state
    if (incidents.length === 0) {
        return (
            <div className="bg-dark-surface rounded-xl border border-accent-teal/20 overflow-hidden">
                <div className="text-center py-16 px-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-accent-teal/10 mb-4">
                        <AlertTriangle size={32} className="text-accent-teal" />
                    </div>
                    <h3 className="text-lg font-semibold text-text-primary mb-2">No Incidents Found</h3>
                    <p className="text-text-secondary text-sm max-w-md mx-auto">
                        No incidents match your current filters. Try adjusting the filters or check back later.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-dark-surface rounded-xl border border-accent-teal/20 overflow-hidden">
            {/* Table Header */}
            <div className="overflow-x-auto">
                <table className="w-full min-w-[900px]">
                    <thead>
                        <tr className="bg-gradient-to-r from-dark-bg to-dark-surface border-b border-accent-teal/10">
                            <th className="px-4 py-3 text-left text-text-secondary text-xs font-semibold uppercase tracking-wider">
                                ID
                            </th>
                            <th className="px-4 py-3 text-left text-text-secondary text-xs font-semibold uppercase tracking-wider">
                                Source IP
                            </th>
                            <th className="px-4 py-3 text-left text-text-secondary text-xs font-semibold uppercase tracking-wider">
                                Dest IP
                            </th>
                            <th className="px-4 py-3 text-left text-text-secondary text-xs font-semibold uppercase tracking-wider">
                                Severity
                            </th>
                            <th className="px-4 py-3 text-left text-text-secondary text-xs font-semibold uppercase tracking-wider">
                                Status
                            </th>
                            <th className="px-4 py-3 text-left text-text-secondary text-xs font-semibold uppercase tracking-wider">
                                Description
                            </th>
                            <th className="px-4 py-3 text-left text-text-secondary text-xs font-semibold uppercase tracking-wider">
                                Created
                            </th>
                            <th className="px-4 py-3 text-center text-text-secondary text-xs font-semibold uppercase tracking-wider">
                                Action
                            </th>
                        </tr>
                    </thead>

                    <tbody className="divide-y divide-accent-teal/5">
                        {incidents.map((incident) => {
                            const sevConfig = severityConfig[incident.severity] || severityConfig.MEDIUM;
                            const statConfig = statusConfig[incident.status] || statusConfig.NEW;
                            const incidentId = incident.incident_id || incident.alert_id || 'unknown';

                            return (
                                <tr
                                    key={incidentId}
                                    onClick={() => onRowClick(incident)}
                                    className="hover:bg-accent-teal/5 cursor-pointer transition-colors group"
                                >
                                    {/* ID */}
                                    <td className="px-4 py-3">
                                        <span className="text-text-primary text-sm font-mono bg-dark-bg px-2 py-1 rounded">
                                            {incidentId.slice(-8)}
                                        </span>
                                    </td>

                                    {/* Source IP */}
                                    <td className="px-4 py-3">
                                        <span className="text-text-primary text-sm font-mono">
                                            {formatIP(incident.source_ip)}
                                        </span>
                                    </td>

                                    {/* Dest IP */}
                                    <td className="px-4 py-3">
                                        <span className="text-text-secondary text-sm font-mono">
                                            {formatIP(incident.destination_ip)}
                                        </span>
                                    </td>

                                    {/* Severity */}
                                    <td className="px-4 py-3">
                                        <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold border ${sevConfig.bg} ${sevConfig.text} ${sevConfig.border}`}>
                                            {incident.severity}
                                        </span>
                                    </td>

                                    {/* Status */}
                                    <td className="px-4 py-3">
                                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium ${statConfig.bg} ${statConfig.text}`}>
                                            <span className={`w-1.5 h-1.5 rounded-full ${statConfig.dot}`} />
                                            {incident.status}
                                        </span>
                                    </td>

                                    {/* Description */}
                                    <td className="px-4 py-3 max-w-[200px]">
                                        <p className="text-text-secondary text-sm truncate">
                                            {incident.description || 'No description'}
                                        </p>
                                    </td>

                                    {/* Created */}
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-1.5 text-text-secondary text-sm">
                                            <Clock size={14} />
                                            {formatTime(incident.created_at)}
                                        </div>
                                    </td>

                                    {/* Action */}
                                    <td className="px-4 py-3 text-center">
                                        <button
                                            className="inline-flex items-center gap-1 text-accent-teal text-sm opacity-0 group-hover:opacity-100 transition-opacity"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onRowClick(incident);
                                            }}
                                        >
                                            View <ExternalLink size={14} />
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between px-4 py-3 border-t border-accent-teal/10 bg-dark-bg/30">
                <p className="text-text-secondary text-sm">
                    Showing <span className="text-text-primary font-medium">{((page - 1) * limit) + 1}</span> to{' '}
                    <span className="text-text-primary font-medium">{Math.min(page * limit, total)}</span> of{' '}
                    <span className="text-text-primary font-medium">{total}</span> incidents
                </p>

                <div className="flex items-center gap-2">
                    <button
                        onClick={() => onPageChange(page - 1)}
                        disabled={page === 1}
                        className="flex items-center gap-1 px-3 py-1.5 text-sm text-text-secondary hover:text-text-primary hover:bg-dark-surface disabled:opacity-40 disabled:hover:bg-transparent disabled:cursor-not-allowed rounded-lg transition-all"
                    >
                        <ChevronLeft size={16} />
                        Previous
                    </button>

                    <div className="flex items-center gap-1">
                        {/* Page numbers */}
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
                                    className={`min-w-[32px] h-8 text-sm rounded-lg transition-all ${page === pageNum
                                            ? 'bg-accent-teal text-dark-bg font-bold'
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
                        disabled={page >= totalPages}
                        className="flex items-center gap-1 px-3 py-1.5 text-sm text-text-secondary hover:text-text-primary hover:bg-dark-surface disabled:opacity-40 disabled:hover:bg-transparent disabled:cursor-not-allowed rounded-lg transition-all"
                    >
                        Next
                        <ChevronRight size={16} />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default IncidentTable;
