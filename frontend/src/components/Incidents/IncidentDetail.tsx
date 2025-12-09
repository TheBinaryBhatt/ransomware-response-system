// ============================================
// IncidentDetail Component - Detail drawer/modal
// ============================================

import React from 'react';
import {
    X,
    AlertTriangle,
    Clock,
    Shield,
    Activity,
    Globe,
    Cpu,
    FileText,
    Zap,
    CheckCircle
} from 'lucide-react';
import type { Incident } from '../../types';

interface IncidentDetailProps {
    incident: Incident;
    detailData?: any;
    onClose: () => void;
    onTriggerResponse?: (incidentId: string) => void;
    onMarkFalsePositive?: (incidentId: string) => void;
}

const IncidentDetail: React.FC<IncidentDetailProps> = ({
    incident,
    detailData,
    onClose,
    onTriggerResponse,
    onMarkFalsePositive,
}) => {
    const data = detailData || incident;
    const incidentId = incident.incident_id || incident.alert_id || 'unknown';

    const severityColors: Record<string, { bg: string; text: string; icon: string }> = {
        CRITICAL: { bg: 'bg-red-500/15', text: 'text-red-400', icon: 'text-red-400' },
        HIGH: { bg: 'bg-orange-500/15', text: 'text-orange-400', icon: 'text-orange-400' },
        MEDIUM: { bg: 'bg-yellow-500/15', text: 'text-yellow-400', icon: 'text-yellow-400' },
        LOW: { bg: 'bg-green-500/15', text: 'text-green-400', icon: 'text-green-400' },
        INFO: { bg: 'bg-blue-500/15', text: 'text-blue-400', icon: 'text-blue-400' },
    };

    const statusColors: Record<string, { bg: string; text: string }> = {
        NEW: { bg: 'bg-blue-500/20', text: 'text-blue-400' },
        PENDING: { bg: 'bg-yellow-500/20', text: 'text-yellow-400' },
        INVESTIGATING: { bg: 'bg-orange-500/20', text: 'text-orange-400' },
        RESOLVED: { bg: 'bg-green-500/20', text: 'text-green-400' },
        ESCALATED: { bg: 'bg-red-500/20', text: 'text-red-400' },
        FALSE_POSITIVE: { bg: 'bg-slate-500/20', text: 'text-slate-300' },
    };

    const formatTime = (timestamp: string | null | undefined) => {
        if (!timestamp) return '—';
        try {
            const date = new Date(timestamp);
            return date.toLocaleString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
            });
        } catch {
            return '—';
        }
    };

    const sevConfig = severityColors[incident.severity] || severityColors.MEDIUM;
    const statConfig = statusColors[incident.status] || statusColors.NEW;

    return (
        <>
            {/* Overlay */}
            <div
                onClick={onClose}
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity"
            />

            {/* Drawer */}
            <div className="fixed right-0 top-0 bottom-0 w-[480px] bg-dark-surface border-l border-accent-teal/20 z-50 overflow-hidden flex flex-col shadow-2xl shadow-black/50">
                {/* Header */}
                <div className="sticky top-0 bg-gradient-to-r from-dark-surface to-dark-bg border-b border-accent-teal/10 px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${sevConfig.bg}`}>
                            <AlertTriangle size={20} className={sevConfig.icon} />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-text-primary font-mono">
                                {incidentId.slice(-8).toUpperCase()}
                            </h2>
                            <div className="flex items-center gap-2 mt-0.5">
                                <span className={`px-2 py-0.5 rounded text-xs font-bold ${sevConfig.bg} ${sevConfig.text}`}>
                                    {incident.severity}
                                </span>
                                <span className={`px-2 py-0.5 rounded text-xs font-medium ${statConfig.bg} ${statConfig.text}`}>
                                    {incident.status}
                                </span>
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-dark-bg rounded-lg transition-colors group"
                    >
                        <X size={20} className="text-text-secondary group-hover:text-text-primary" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
                    {/* Network Information */}
                    <div className="bg-dark-bg/50 rounded-xl border border-accent-teal/10 p-4">
                        <div className="flex items-center gap-2 mb-4">
                            <Globe size={16} className="text-accent-teal" />
                            <h3 className="text-sm font-semibold text-text-primary uppercase tracking-wider">
                                Network Information
                            </h3>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-text-secondary text-xs mb-1">Source IP</p>
                                <p className="text-text-primary font-mono text-sm bg-dark-surface px-2 py-1 rounded">
                                    {incident.source_ip || '—'}
                                </p>
                            </div>
                            <div>
                                <p className="text-text-secondary text-xs mb-1">Destination IP</p>
                                <p className="text-text-primary font-mono text-sm bg-dark-surface px-2 py-1 rounded">
                                    {incident.destination_ip || '—'}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Description */}
                    <div className="bg-dark-bg/50 rounded-xl border border-accent-teal/10 p-4">
                        <div className="flex items-center gap-2 mb-3">
                            <FileText size={16} className="text-accent-teal" />
                            <h3 className="text-sm font-semibold text-text-primary uppercase tracking-wider">
                                Description
                            </h3>
                        </div>
                        <p className="text-text-secondary text-sm leading-relaxed">
                            {incident.description || 'No description available for this incident.'}
                        </p>
                    </div>

                    {/* Timeline */}
                    <div className="bg-dark-bg/50 rounded-xl border border-accent-teal/10 p-4">
                        <div className="flex items-center gap-2 mb-4">
                            <Clock size={16} className="text-accent-teal" />
                            <h3 className="text-sm font-semibold text-text-primary uppercase tracking-wider">
                                Timeline
                            </h3>
                        </div>
                        <div className="space-y-3">
                            <div className="flex items-start gap-3">
                                <div className="w-2 h-2 rounded-full bg-blue-400 mt-1.5 shrink-0" />
                                <div>
                                    <p className="text-text-primary text-sm font-medium">Created</p>
                                    <p className="text-text-secondary text-xs">{formatTime(incident.created_at)}</p>
                                </div>
                            </div>
                            {incident.timestamp && incident.timestamp !== incident.created_at && (
                                <div className="flex items-start gap-3">
                                    <div className="w-2 h-2 rounded-full bg-yellow-400 mt-1.5 shrink-0" />
                                    <div>
                                        <p className="text-text-primary text-sm font-medium">Event Timestamp</p>
                                        <p className="text-text-secondary text-xs">{formatTime(incident.timestamp)}</p>
                                    </div>
                                </div>
                            )}
                            {incident.updated_at && incident.updated_at !== incident.created_at && (
                                <div className="flex items-start gap-3">
                                    <div className="w-2 h-2 rounded-full bg-green-400 mt-1.5 shrink-0" />
                                    <div>
                                        <p className="text-text-primary text-sm font-medium">Last Updated</p>
                                        <p className="text-text-secondary text-xs">{formatTime(incident.updated_at)}</p>
                                    </div>
                                </div>
                            )}
                            {incident.response_time && (
                                <div className="flex items-start gap-3">
                                    <div className="w-2 h-2 rounded-full bg-accent-teal mt-1.5 shrink-0" />
                                    <div>
                                        <p className="text-text-primary text-sm font-medium">Response Time</p>
                                        <p className="text-text-secondary text-xs">{incident.response_time}s</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* AI Analysis - Enhanced with full triage results */}
                    {(data.ai_decision || data.ai_confidence || data.threat_score || data.triage_result) && (
                        <div className="bg-gradient-to-br from-purple-500/10 to-accent-teal/10 rounded-xl border border-purple-500/20 p-4">
                            <div className="flex items-center gap-2 mb-4">
                                <Cpu size={16} className="text-purple-400" />
                                <h3 className="text-sm font-semibold text-text-primary uppercase tracking-wider">
                                    AI Analysis & Detection
                                </h3>
                            </div>
                            <div className="space-y-4">
                                {/* Threat Score */}
                                {(data.threat_score !== undefined || data.triage_result?.threat_score !== undefined) && (
                                    <div>
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-text-secondary text-sm">Threat Score</span>
                                            <span className={`font-bold text-lg ${(data.threat_score || data.triage_result?.threat_score) >= 80 ? 'text-red-400' :
                                                (data.threat_score || data.triage_result?.threat_score) >= 60 ? 'text-orange-400' :
                                                    (data.threat_score || data.triage_result?.threat_score) >= 30 ? 'text-yellow-400' : 'text-green-400'
                                                }`}>
                                                {data.threat_score || data.triage_result?.threat_score}/100
                                            </span>
                                        </div>
                                        <div className="h-3 bg-dark-bg rounded-full overflow-hidden">
                                            <div
                                                className={`h-full rounded-full transition-all ${(data.threat_score || data.triage_result?.threat_score) >= 80 ? 'bg-gradient-to-r from-red-600 to-red-400' :
                                                    (data.threat_score || data.triage_result?.threat_score) >= 60 ? 'bg-gradient-to-r from-orange-600 to-orange-400' :
                                                        (data.threat_score || data.triage_result?.threat_score) >= 30 ? 'bg-gradient-to-r from-yellow-600 to-yellow-400' : 'bg-gradient-to-r from-green-600 to-green-400'
                                                    }`}
                                                style={{ width: `${data.threat_score || data.triage_result?.threat_score || 0}%` }}
                                            />
                                        </div>
                                        <p className="text-xs text-text-secondary mt-1">
                                            {(data.threat_score || data.triage_result?.threat_score) >= 80 ? '⚠️ CRITICAL - Immediate analyst review required' :
                                                (data.threat_score || data.triage_result?.threat_score) >= 60 ? '🔶 HIGH - Recommend investigation' :
                                                    (data.threat_score || data.triage_result?.threat_score) >= 30 ? '🟡 MEDIUM - Monitor closely' : '🟢 LOW - Likely benign'}
                                        </p>
                                    </div>
                                )}

                                {/* AI Decision */}
                                {(data.ai_decision || data.triage_result?.decision) && (
                                    <div className="flex items-center justify-between py-2 border-t border-purple-500/20">
                                        <span className="text-text-secondary text-sm">AI Decision</span>
                                        <span className={`font-semibold text-sm px-2 py-0.5 rounded ${(data.ai_decision || data.triage_result?.decision) === 'confirmed_ransomware' ? 'bg-red-500/20 text-red-400' :
                                            (data.ai_decision || data.triage_result?.decision) === 'escalate_human' ? 'bg-orange-500/20 text-orange-400' : 'bg-blue-500/20 text-blue-400'
                                            }`}>
                                            {(data.ai_decision || data.triage_result?.decision)?.replace(/_/g, ' ').toUpperCase()}
                                        </span>
                                    </div>
                                )}

                                {/* AI Confidence */}
                                {(data.ai_confidence || data.triage_result?.confidence) && (
                                    <div className="flex items-center justify-between py-2 border-t border-purple-500/20">
                                        <span className="text-text-secondary text-sm">AI Confidence</span>
                                        <span className="text-text-primary font-mono text-sm">
                                            {((data.ai_confidence || data.triage_result?.confidence) * 100).toFixed(0)}%
                                        </span>
                                    </div>
                                )}

                                {/* AI Reasoning */}
                                {(data.triage_result?.reasoning) && (
                                    <div className="pt-2 border-t border-purple-500/20">
                                        <p className="text-text-secondary text-xs uppercase tracking-wider mb-2">AI Reasoning</p>
                                        <p className="text-text-primary text-sm bg-dark-surface/50 p-3 rounded-lg italic">
                                            "{data.triage_result.reasoning}"
                                        </p>
                                    </div>
                                )}

                                {/* Sigma Matches */}
                                {data.triage_result?.sigma_matches?.length > 0 && (
                                    <div className="pt-2 border-t border-purple-500/20">
                                        <p className="text-text-secondary text-xs uppercase tracking-wider mb-2">
                                            🔍 Sigma Rule Matches ({data.triage_result.sigma_matches.length})
                                        </p>
                                        <div className="flex flex-wrap gap-2">
                                            {data.triage_result.sigma_matches.map((match: string, i: number) => (
                                                <span key={i} className="px-2 py-1 bg-blue-500/20 text-blue-400 text-xs rounded font-mono">
                                                    {typeof match === 'string' ? match : JSON.stringify(match)}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* YARA Matches */}
                                {data.triage_result?.yara_matches?.length > 0 && (
                                    <div className="pt-2 border-t border-purple-500/20">
                                        <p className="text-text-secondary text-xs uppercase tracking-wider mb-2">
                                            🦠 YARA Rule Matches ({data.triage_result.yara_matches.length})
                                        </p>
                                        <div className="flex flex-wrap gap-2">
                                            {data.triage_result.yara_matches.map((match: string, i: number) => (
                                                <span key={i} className="px-2 py-1 bg-red-500/20 text-red-400 text-xs rounded font-mono">
                                                    {typeof match === 'string' ? match : JSON.stringify(match)}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Recommended Actions */}
                                {(data.triage_result?.recommended_actions?.length > 0 || data.recommended_actions?.length > 0) && (
                                    <div className="pt-2 border-t border-purple-500/20">
                                        <p className="text-text-secondary text-xs uppercase tracking-wider mb-2">
                                            💡 Recommended Actions
                                        </p>
                                        <div className="space-y-1">
                                            {(data.triage_result?.recommended_actions || data.recommended_actions).map((action: string, i: number) => (
                                                <div key={i} className="flex items-center gap-2 text-sm">
                                                    <span className="text-accent-teal">→</span>
                                                    <span className="text-text-primary">{action.replace(/_/g, ' ')}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Raw Data Preview */}
                    {incident.raw_data && Object.keys(incident.raw_data).length > 0 && (
                        <div className="bg-dark-bg/50 rounded-xl border border-accent-teal/10 p-4">
                            <div className="flex items-center gap-2 mb-3">
                                <Activity size={16} className="text-accent-teal" />
                                <h3 className="text-sm font-semibold text-text-primary uppercase tracking-wider">
                                    Raw Data
                                </h3>
                            </div>
                            <pre className="text-text-secondary text-xs font-mono bg-dark-surface p-3 rounded-lg overflow-x-auto max-h-40">
                                {JSON.stringify(incident.raw_data, null, 2)}
                            </pre>
                        </div>
                    )}
                </div>

                {/* Footer Actions */}
                <div className="sticky bottom-0 bg-dark-surface border-t border-accent-teal/10 p-4 flex gap-3">
                    {incident.status === 'RESOLVED' || incident.status === 'FALSE_POSITIVE' ? (
                        <div className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-green-500/20 border border-green-500/30 rounded-lg text-green-400 font-bold text-sm">
                            <CheckCircle size={16} />
                            {incident.status === 'FALSE_POSITIVE' ? 'Marked as False Positive' : 'Incident Resolved'}
                        </div>
                    ) : (
                        <>
                            {data.triage_result?.decision === 'false_positive' && onMarkFalsePositive && (
                                <button
                                    onClick={() => onMarkFalsePositive(incidentId)}
                                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 border border-slate-400/40 bg-slate-700/40 hover:bg-slate-600/40 rounded-lg text-slate-100 font-semibold text-sm transition-all"
                                >
                                    <CheckCircle size={16} />
                                    Mark as False Positive
                                </button>
                            )}
                            <button
                                onClick={() => onTriggerResponse?.(incidentId)}
                                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-accent-teal to-accent-teal/80 hover:from-accent-teal/90 hover:to-accent-teal/70 rounded-lg text-dark-bg font-bold text-sm transition-all shadow-lg shadow-accent-teal/20"
                            >
                                <Zap size={16} />
                                Trigger Response
                            </button>
                        </>
                    )}
                    <button
                        onClick={onClose}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-3 border border-accent-teal/30 hover:bg-accent-teal/10 rounded-lg text-accent-teal font-semibold text-sm transition-all"
                    >
                        <Shield size={16} />
                        Close
                    </button>
                </div>
            </div>
        </>
    );
};

export default IncidentDetail;
