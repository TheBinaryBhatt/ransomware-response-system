// ============================================
// AuditDetail - Drawer showing full audit log details
// ============================================

import React, { useState } from 'react';
import {
    X,
    Copy,
    Check,
    AlertTriangle,
    Shield,
    User,
    Clock,
    Hash,
    Link2,
    Globe,
    Monitor
} from 'lucide-react';
import type { AuditLog } from '../../types/auditlog';

interface AuditDetailProps {
    log: AuditLog;
    onClose: () => void;
}

const AuditDetail: React.FC<AuditDetailProps> = ({ log, onClose }) => {
    const [copied, setCopied] = useState<string | null>(null);

    const copyToClipboard = (text: string, label: string) => {
        navigator.clipboard.writeText(text);
        setCopied(label);
        setTimeout(() => setCopied(null), 2000);
    };

    const formatTime = (timestamp: string) => {
        return new Date(timestamp).toLocaleString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            timeZoneName: 'short',
        });
    };

    const statusConfig = {
        success: { color: 'text-green-400 bg-green-500/10 border-green-500/30', icon: Check, label: 'Success' },
        failure: { color: 'text-red-400 bg-red-500/10 border-red-500/30', icon: AlertTriangle, label: 'Failure' },
        pending: { color: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30', icon: Clock, label: 'Pending' },
    };

    const status = statusConfig[log.status] || statusConfig.pending;
    const StatusIcon = status.icon;

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
                onClick={onClose}
            />

            {/* Drawer */}
            <div className="fixed right-0 top-0 bottom-0 w-full max-w-2xl bg-dark-surface border-l border-accent-teal/20 z-50 overflow-hidden flex flex-col">
                {/* Header */}
                <div className="shrink-0 bg-gradient-to-r from-dark-surface to-dark-bg border-b border-accent-teal/10 px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-accent-teal/10 rounded-lg">
                                <Shield size={20} className="text-accent-teal" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-text-primary">
                                    Audit Log Detail
                                </h2>
                                <p className="text-text-secondary text-sm">
                                    {log.event_type.replace(/_/g, ' ')}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-dark-bg rounded-lg transition-colors"
                        >
                            <X size={20} className="text-text-secondary" />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
                    {/* Status Badge */}
                    <div className={`flex items-center gap-2 px-4 py-3 rounded-lg border ${status.color}`}>
                        <StatusIcon size={18} />
                        <span className="font-semibold">{status.label}</span>
                        <span className="text-sm opacity-80">- {log.description}</span>
                    </div>

                    {/* Timestamp */}
                    <div className="bg-dark-bg rounded-lg p-4 border border-accent-teal/10">
                        <div className="flex items-center gap-2 text-text-secondary text-sm mb-2">
                            <Clock size={14} />
                            Timestamp
                        </div>
                        <p className="text-text-primary font-mono">{formatTime(log.timestamp)}</p>
                    </div>

                    {/* Actor Information */}
                    <div>
                        <h3 className="text-lg font-bold text-text-primary mb-3 flex items-center gap-2">
                            <User size={18} className="text-accent-teal" />
                            Actor
                        </h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-dark-bg rounded-lg p-4 border border-accent-teal/10">
                                <p className="text-text-secondary text-xs uppercase tracking-wider mb-1">Username</p>
                                <p className="text-text-primary font-semibold">{log.actor}</p>
                            </div>
                            <div className="bg-dark-bg rounded-lg p-4 border border-accent-teal/10">
                                <p className="text-text-secondary text-xs uppercase tracking-wider mb-1">Role</p>
                                <p className="text-text-primary font-semibold capitalize">{log.actor_role}</p>
                            </div>
                        </div>
                    </div>

                    {/* Target Information */}
                    <div>
                        <h3 className="text-lg font-bold text-text-primary mb-3 flex items-center gap-2">
                            <Link2 size={18} className="text-accent-teal" />
                            Target
                        </h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-dark-bg rounded-lg p-4 border border-accent-teal/10">
                                <p className="text-text-secondary text-xs uppercase tracking-wider mb-1">Resource</p>
                                <p className="text-accent-teal font-mono text-sm break-all">{log.target_resource}</p>
                            </div>
                            <div className="bg-dark-bg rounded-lg p-4 border border-accent-teal/10">
                                <p className="text-text-secondary text-xs uppercase tracking-wider mb-1">Type</p>
                                <p className="text-text-primary font-semibold capitalize">{log.target_type}</p>
                            </div>
                        </div>
                    </div>

                    {/* Metadata */}
                    {log.metadata && (
                        <div>
                            <h3 className="text-lg font-bold text-text-primary mb-3 flex items-center gap-2">
                                <Monitor size={18} className="text-accent-teal" />
                                Request Metadata
                            </h3>
                            <div className="bg-dark-bg rounded-lg border border-accent-teal/10 divide-y divide-accent-teal/10">
                                {log.metadata.ip_address && (
                                    <div className="px-4 py-3 flex items-center justify-between">
                                        <div className="flex items-center gap-2 text-text-secondary">
                                            <Globe size={14} />
                                            <span className="text-sm">IP Address</span>
                                        </div>
                                        <span className="text-text-primary font-mono text-sm">{log.metadata.ip_address}</span>
                                    </div>
                                )}
                                {log.metadata.user_agent && (
                                    <div className="px-4 py-3">
                                        <p className="text-text-secondary text-sm mb-1">User Agent</p>
                                        <p className="text-text-primary text-xs font-mono break-all">{log.metadata.user_agent}</p>
                                    </div>
                                )}
                                {log.metadata.error_message && (
                                    <div className="px-4 py-3 bg-red-500/5">
                                        <p className="text-red-400 text-sm font-semibold mb-1">Error Message</p>
                                        <p className="text-red-400/80 text-sm">{log.metadata.error_message}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Integrity Hash */}
                    <div>
                        <h3 className="text-lg font-bold text-text-primary mb-3 flex items-center gap-2">
                            <Hash size={18} className="text-accent-teal" />
                            Integrity Verification
                        </h3>
                        <div className="space-y-3">
                            {/* Current Hash */}
                            <div className="bg-dark-bg rounded-lg p-4 border border-accent-teal/10">
                                <div className="flex items-center justify-between mb-2">
                                    <p className="text-text-secondary text-xs uppercase tracking-wider">SHA-256 Hash</p>
                                    <button
                                        onClick={() => copyToClipboard(log.integrity_hash, 'hash')}
                                        className="p-1 hover:bg-accent-teal/10 rounded text-text-secondary hover:text-accent-teal transition-colors"
                                    >
                                        {copied === 'hash' ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
                                    </button>
                                </div>
                                <p className="text-text-primary font-mono text-xs break-all select-all">
                                    {log.integrity_hash}
                                </p>
                            </div>

                            {/* Previous Hash */}
                            {log.previous_hash && (
                                <div className="bg-dark-bg rounded-lg p-4 border border-accent-teal/10">
                                    <div className="flex items-center justify-between mb-2">
                                        <p className="text-text-secondary text-xs uppercase tracking-wider">Previous Hash (Chain)</p>
                                        <button
                                            onClick={() => copyToClipboard(log.previous_hash!, 'prev')}
                                            className="p-1 hover:bg-accent-teal/10 rounded text-text-secondary hover:text-accent-teal transition-colors"
                                        >
                                            {copied === 'prev' ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
                                        </button>
                                    </div>
                                    <p className="text-text-primary font-mono text-xs break-all select-all">
                                        {log.previous_hash}
                                    </p>
                                </div>
                            )}

                            {/* Verification Status */}
                            <div className="flex items-center gap-3 p-4 bg-green-500/10 rounded-lg border border-green-500/30">
                                <div className="p-2 bg-green-500/20 rounded-full">
                                    <Shield size={18} className="text-green-400" />
                                </div>
                                <div>
                                    <p className="text-green-400 font-semibold">Integrity Verified</p>
                                    <p className="text-green-400/70 text-sm">This log entry has not been tampered with</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Log ID */}
                    <div className="bg-dark-bg rounded-lg p-4 border border-accent-teal/10">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-text-secondary text-xs uppercase tracking-wider mb-1">Log ID</p>
                                <p className="text-text-primary font-mono text-sm">{log.log_id}</p>
                            </div>
                            <button
                                onClick={() => copyToClipboard(log.log_id, 'id')}
                                className="p-2 hover:bg-accent-teal/10 rounded-lg text-text-secondary hover:text-accent-teal transition-colors"
                            >
                                {copied === 'id' ? <Check size={16} className="text-green-400" /> : <Copy size={16} />}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="shrink-0 border-t border-accent-teal/10 px-6 py-4 bg-dark-surface">
                    <button
                        onClick={onClose}
                        className="w-full px-4 py-3 bg-dark-bg hover:bg-accent-teal/10 border border-accent-teal/30 rounded-lg text-text-primary font-semibold transition-colors"
                    >
                        Close
                    </button>
                </div>
            </div>
        </>
    );
};

export default AuditDetail;
