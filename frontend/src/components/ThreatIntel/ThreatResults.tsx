// ============================================
// ThreatResults - Display IP and Hash Analysis Results
// ============================================

import React from 'react';
import {
    Shield,
    AlertTriangle,
    CheckCircle,
    Server,
    Clock,
    FileText,
    Database,
    Skull,
    MapPin,
    Eye
} from 'lucide-react';
import type { IPReputation, FileHash } from '../../types/threatintel';

interface ThreatResultsProps {
    data: IPReputation | FileHash;
    type: 'ip' | 'hash';
    loading: boolean;
}

const ThreatResults: React.FC<ThreatResultsProps> = ({ data, type, loading }) => {
    // Threat level color and label mapping based on score
    const getThreatConfig = (score: number) => {
        if (score < 15) return {
            color: 'text-green-400',
            bg: 'bg-green-500/10',
            border: 'border-green-500/30',
            label: 'CLEAN',
            icon: CheckCircle
        };
        if (score < 40) return {
            color: 'text-accent-teal',
            bg: 'bg-accent-teal/10',
            border: 'border-accent-teal/30',
            label: 'LOW RISK',
            icon: Shield
        };
        if (score < 70) return {
            color: 'text-orange-400',
            bg: 'bg-orange-500/10',
            border: 'border-orange-500/30',
            label: 'SUSPICIOUS',
            icon: AlertTriangle
        };
        return {
            color: 'text-red-400',
            bg: 'bg-red-500/10',
            border: 'border-red-500/30',
            label: 'MALICIOUS',
            icon: Skull
        };
    };

    // Loading skeleton
    if (loading) {
        return (
            <div className="space-y-6 animate-pulse">
                <div className="h-32 bg-dark-surface rounded-xl" />
                <div className="grid grid-cols-3 gap-4">
                    <div className="h-40 bg-dark-surface rounded-xl" />
                    <div className="h-40 bg-dark-surface rounded-xl" />
                    <div className="h-40 bg-dark-surface rounded-xl" />
                </div>
            </div>
        );
    }

    // IP Reputation Results
    if (type === 'ip') {
        const ipData = data as IPReputation;
        const threatScore = ipData.abuse_confidence_score || 0;
        const config = getThreatConfig(threatScore);
        const ThreatIcon = config.icon;

        return (
            <div className="space-y-6">
                {/* Threat Score Header */}
                <div className={`rounded-xl border-2 ${config.border} ${config.bg} p-6`}>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className={`p-4 rounded-xl ${config.bg}`}>
                                <ThreatIcon size={40} className={config.color} />
                            </div>
                            <div>
                                <p className="text-text-secondary text-sm font-medium mb-1">Threat Assessment</p>
                                <p className={`text-3xl font-bold ${config.color}`}>{config.label}</p>
                                <p className="text-text-primary font-mono text-lg mt-1">{ipData.ip_address}</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="text-text-secondary text-sm mb-1">Abuse Confidence</p>
                            <p className={`text-5xl font-bold ${config.color}`}>{threatScore}%</p>
                        </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="mt-6 h-3 bg-dark-bg rounded-full overflow-hidden">
                        <div
                            className={`h-full transition-all duration-500 rounded-full ${threatScore < 15 ? 'bg-green-500' :
                                    threatScore < 40 ? 'bg-accent-teal' :
                                        threatScore < 70 ? 'bg-orange-500' : 'bg-red-500'
                                }`}
                            style={{ width: `${threatScore}%` }}
                        />
                    </div>
                </div>

                {/* Information Grid */}
                <div className="grid grid-cols-3 gap-4">
                    {/* Location & Network */}
                    <div className="bg-dark-surface rounded-xl border border-accent-teal/10 p-5">
                        <div className="flex items-center gap-2 mb-4">
                            <MapPin size={16} className="text-accent-teal" />
                            <h3 className="text-sm font-semibold text-text-primary uppercase tracking-wider">
                                Location & Network
                            </h3>
                        </div>
                        <div className="space-y-3">
                            <div>
                                <p className="text-text-secondary text-xs mb-1">Country</p>
                                <p className="text-text-primary font-medium">
                                    {ipData.country_name || 'Unknown'}
                                </p>
                            </div>
                            <div>
                                <p className="text-text-secondary text-xs mb-1">ISP</p>
                                <p className="text-text-primary text-sm">{ipData.isp_name || 'Unknown'}</p>
                            </div>
                            <div>
                                <p className="text-text-secondary text-xs mb-1">Usage Type</p>
                                <p className="text-text-primary text-sm">{ipData.usage_type || 'Unknown'}</p>
                            </div>
                        </div>
                    </div>

                    {/* Threat Indicators */}
                    <div className="bg-dark-surface rounded-xl border border-accent-teal/10 p-5">
                        <div className="flex items-center gap-2 mb-4">
                            <Eye size={16} className="text-accent-teal" />
                            <h3 className="text-sm font-semibold text-text-primary uppercase tracking-wider">
                                Threat Indicators
                            </h3>
                        </div>
                        <div className="space-y-2">
                            <FlagIndicator label="VPN" active={ipData.is_vpn} color="orange" />
                            <FlagIndicator label="Proxy" active={ipData.is_proxy} color="orange" />
                            <FlagIndicator label="Tor Exit Node" active={ipData.is_tor} color="red" />
                            <FlagIndicator label="Datacenter" active={ipData.is_datacenter} color="blue" />
                            <FlagIndicator label="Whitelisted" active={ipData.is_whitelisted} color="green" />
                        </div>
                    </div>

                    {/* Report Statistics */}
                    <div className="bg-dark-surface rounded-xl border border-accent-teal/10 p-5">
                        <div className="flex items-center gap-2 mb-4">
                            <Database size={16} className="text-accent-teal" />
                            <h3 className="text-sm font-semibold text-text-primary uppercase tracking-wider">
                                Report Statistics
                            </h3>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <p className="text-text-secondary text-xs mb-1">Total Reports</p>
                                <p className={`text-3xl font-bold ${ipData.total_reports > 0 ? 'text-red-400' : 'text-green-400'}`}>
                                    {ipData.total_reports || 0}
                                </p>
                            </div>
                            <div>
                                <p className="text-text-secondary text-xs mb-1">Last Reported</p>
                                <p className="text-text-primary text-sm flex items-center gap-2">
                                    <Clock size={14} className="text-text-secondary" />
                                    {ipData.last_reported_at
                                        ? new Date(ipData.last_reported_at).toLocaleDateString()
                                        : 'Never'}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Threat Types */}
                {ipData.threat_types && ipData.threat_types.length > 0 && (
                    <div className="bg-dark-surface rounded-xl border border-red-500/20 p-5">
                        <div className="flex items-center gap-2 mb-4">
                            <AlertTriangle size={16} className="text-red-400" />
                            <h3 className="text-sm font-semibold text-text-primary uppercase tracking-wider">
                                Detected Threat Categories
                            </h3>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {ipData.threat_types.map((threat: string, i: number) => (
                                <span
                                    key={i}
                                    className="px-3 py-1.5 bg-red-500/15 text-red-400 border border-red-500/30 rounded-lg text-sm font-semibold"
                                >
                                    {threat}
                                </span>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        );
    }

    // File Hash Results
    const hashData = data as FileHash;
    const threatScore = hashData.threat_score || 0;
    const config = getThreatConfig(threatScore);
    const ThreatIcon = config.icon;

    return (
        <div className="space-y-6">
            {/* Threat Score Header */}
            <div className={`rounded-xl border-2 ${config.border} ${config.bg} p-6`}>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className={`p-4 rounded-xl ${config.bg}`}>
                            <ThreatIcon size={40} className={config.color} />
                        </div>
                        <div>
                            <p className="text-text-secondary text-sm font-medium mb-1">Malware Analysis</p>
                            <p className={`text-3xl font-bold ${config.color}`}>{hashData.threat_level || config.label}</p>
                            <p className="text-text-secondary text-xs mt-2">{hashData.hash_type || 'SHA256'} Hash</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="text-text-secondary text-sm mb-1">Threat Score</p>
                        <p className={`text-5xl font-bold ${config.color}`}>{threatScore}%</p>
                    </div>
                </div>

                {/* Progress Bar */}
                <div className="mt-6 h-3 bg-dark-bg rounded-full overflow-hidden">
                    <div
                        className={`h-full transition-all duration-500 rounded-full ${threatScore < 15 ? 'bg-green-500' :
                                threatScore < 40 ? 'bg-accent-teal' :
                                    threatScore < 70 ? 'bg-orange-500' : 'bg-red-500'
                            }`}
                        style={{ width: `${threatScore}%` }}
                    />
                </div>
            </div>

            {/* Hash Values */}
            <div className="bg-dark-surface rounded-xl border border-purple-500/20 p-5">
                <div className="flex items-center gap-2 mb-4">
                    <FileText size={16} className="text-purple-400" />
                    <h3 className="text-sm font-semibold text-text-primary uppercase tracking-wider">
                        Hash Values
                    </h3>
                </div>
                <div className="space-y-3">
                    <div>
                        <p className="text-text-secondary text-xs mb-1">File Hash</p>
                        <p className="text-text-primary font-mono text-xs bg-dark-bg px-3 py-2 rounded break-all">
                            {hashData.file_hash}
                        </p>
                    </div>
                </div>
            </div>

            {/* Information Grid */}
            <div className="grid grid-cols-3 gap-4">
                {/* File Info */}
                <div className="bg-dark-surface rounded-xl border border-accent-teal/10 p-5">
                    <div className="flex items-center gap-2 mb-4">
                        <Server size={16} className="text-accent-teal" />
                        <h3 className="text-sm font-semibold text-text-primary uppercase tracking-wider">
                            File Information
                        </h3>
                    </div>
                    <div className="space-y-3">
                        <div>
                            <p className="text-text-secondary text-xs mb-1">File Name</p>
                            <p className="text-text-primary text-sm truncate">
                                {hashData.file_name || 'Unknown'}
                            </p>
                        </div>
                        <div>
                            <p className="text-text-secondary text-xs mb-1">File Type</p>
                            <p className="text-text-primary text-sm">{hashData.file_type || 'Unknown'}</p>
                        </div>
                        <div>
                            <p className="text-text-secondary text-xs mb-1">Magic</p>
                            <p className="text-text-primary text-xs font-mono">{hashData.magic || 'Unknown'}</p>
                        </div>
                    </div>
                </div>

                {/* Detection Stats */}
                <div className="bg-dark-surface rounded-xl border border-accent-teal/10 p-5">
                    <div className="flex items-center gap-2 mb-4">
                        <Database size={16} className="text-accent-teal" />
                        <h3 className="text-sm font-semibold text-text-primary uppercase tracking-wider">
                            Detection Stats
                        </h3>
                    </div>
                    <div className="space-y-4">
                        <div>
                            <p className="text-text-secondary text-xs mb-1">Reporter Count</p>
                            <p className={`text-3xl font-bold ${hashData.reporter_count > 0 ? 'text-red-400' : 'text-green-400'}`}>
                                {hashData.reporter_count || 0}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Timeline */}
                <div className="bg-dark-surface rounded-xl border border-accent-teal/10 p-5">
                    <div className="flex items-center gap-2 mb-4">
                        <Clock size={16} className="text-accent-teal" />
                        <h3 className="text-sm font-semibold text-text-primary uppercase tracking-wider">
                            Timeline
                        </h3>
                    </div>
                    <div className="space-y-3">
                        <div>
                            <p className="text-text-secondary text-xs mb-1">First Seen</p>
                            <p className="text-text-primary text-sm">
                                {hashData.first_seen
                                    ? new Date(hashData.first_seen).toLocaleDateString()
                                    : 'Unknown'}
                            </p>
                        </div>
                        <div>
                            <p className="text-text-secondary text-xs mb-1">Last Seen</p>
                            <p className="text-text-primary text-sm">
                                {hashData.last_seen
                                    ? new Date(hashData.last_seen).toLocaleDateString()
                                    : 'Unknown'}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Malware Families */}
            {hashData.threat_names && hashData.threat_names.length > 0 && (
                <div className="bg-dark-surface rounded-xl border border-red-500/20 p-5">
                    <div className="flex items-center gap-2 mb-4">
                        <Skull size={16} className="text-red-400" />
                        <h3 className="text-sm font-semibold text-text-primary uppercase tracking-wider">
                            Detected Malware Families
                        </h3>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {hashData.threat_names.map((name: string, i: number) => (
                            <span
                                key={i}
                                className="px-3 py-1.5 bg-red-500/15 text-red-400 border border-red-500/30 rounded-lg text-sm font-semibold"
                            >
                                {name}
                            </span>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

// Helper component for flag indicators
const FlagIndicator: React.FC<{ label: string; active: boolean; color: string }> = ({ label, active, color }) => {
    const colorClasses: Record<string, string> = {
        red: active ? 'text-red-400 bg-red-500/10 border-red-500/30' : 'text-text-secondary bg-dark-bg border-transparent',
        orange: active ? 'text-orange-400 bg-orange-500/10 border-orange-500/30' : 'text-text-secondary bg-dark-bg border-transparent',
        green: active ? 'text-green-400 bg-green-500/10 border-green-500/30' : 'text-text-secondary bg-dark-bg border-transparent',
        blue: active ? 'text-blue-400 bg-blue-500/10 border-blue-500/30' : 'text-text-secondary bg-dark-bg border-transparent',
    };

    return (
        <div className={`flex items-center justify-between px-3 py-2 rounded-lg border ${colorClasses[color] || colorClasses.blue}`}>
            <span className="text-sm">{label}</span>
            <span className={`w-2 h-2 rounded-full ${active ? 'bg-current' : 'bg-text-secondary/30'}`} />
        </div>
    );
};

export default ThreatResults;
