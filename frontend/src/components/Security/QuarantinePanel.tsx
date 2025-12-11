// ============================================
// QUARANTINE PANEL - IP Quarantine Management
// ============================================

import React, { useState, useEffect } from 'react';
import {
    Shield,
    ShieldOff,
    Clock,
    AlertTriangle,
    Search,
    RefreshCw,
    CheckCircle,
    Loader2
} from 'lucide-react';
import { securityApi, type QuarantinedIP, type RecentAttack } from '../../services/api';
import { useWebSocket } from '../../hooks/useWebSocket';
import { SECURITY_WS_EVENTS, ATTACK_TYPES } from '../../utils/constants';

interface QuarantinePanelProps {
    className?: string;
    compact?: boolean;
}

const QuarantinePanel: React.FC<QuarantinePanelProps> = ({ className = '', compact = false }) => {
    const [quarantinedIPs, setQuarantinedIPs] = useState<QuarantinedIP[]>([]);
    const [recentAttacks, setRecentAttacks] = useState<RecentAttack[]>([]);
    const [loading, setLoading] = useState(true);
    const [releasing, setReleasing] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState<'quarantined' | 'attacks'>('quarantined');
    const { on } = useWebSocket();

    // Fetch data
    const fetchData = async () => {
        setLoading(true);
        try {
            const [quarantineResponse, attacksResponse] = await Promise.all([
                securityApi.listQuarantinedIPs('active'),
                securityApi.getRecentAttacks(50),
            ]);
            setQuarantinedIPs(quarantineResponse.quarantined_ips);
            setRecentAttacks(attacksResponse.attacks);
        } catch (error) {
            console.error('Failed to fetch security data:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();

        // Subscribe to real-time events
        const unsubQuarantined = on(SECURITY_WS_EVENTS.IP_QUARANTINED, (data: any) => {
            console.log('[QuarantinePanel] IP quarantined:', data);
            // Refresh data
            fetchData();
        });

        const unsubReleased = on(SECURITY_WS_EVENTS.IP_RELEASED, (data: any) => {
            console.log('[QuarantinePanel] IP released:', data);
            // Remove from list
            setQuarantinedIPs(prev => prev.filter(ip => ip.ip_address !== data.ip));
        });

        const unsubAttack = on(SECURITY_WS_EVENTS.ATTACK_DETECTED, (data: any) => {
            console.log('[QuarantinePanel] Attack detected:', data);
            // Add to recent attacks
            setRecentAttacks(prev => [{
                incident_id: data.incident_id || '',
                attack_type: data.attack_type || 'unknown',
                threat_level: data.threat_level || 'medium',
                source_ip: data.source_ip || '',
                severity: data.severity || 'MEDIUM',
                status: 'NEW',
                description: data.description || '',
                timestamp: data.timestamp || new Date().toISOString(),
                auto_quarantined: data.auto_quarantined || false,
            }, ...prev.slice(0, 49)]);
        });

        return () => {
            unsubQuarantined?.();
            unsubReleased?.();
            unsubAttack?.();
        };
    }, [on]);

    // Release IP from quarantine
    const handleRelease = async (ip: string) => {
        setReleasing(ip);
        try {
            await securityApi.releaseIP(ip);
            setQuarantinedIPs(prev => prev.filter(q => q.ip_address !== ip));
        } catch (error) {
            console.error('Failed to release IP:', error);
        } finally {
            setReleasing(null);
        }
    };

    // Get attack type config
    const getAttackConfig = (attackType: string) => {
        const config = Object.values(ATTACK_TYPES).find(t => t.value === attackType);
        return config || { value: attackType, label: attackType, severity: 'MEDIUM' };
    };

    // Filter data based on search
    const filteredQuarantined = quarantinedIPs.filter(ip =>
        ip.ip_address.includes(searchQuery) ||
        ip.attack_type?.includes(searchQuery) ||
        ip.reason?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const filteredAttacks = recentAttacks.filter(attack =>
        attack.source_ip?.includes(searchQuery) ||
        attack.attack_type?.includes(searchQuery) ||
        attack.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Format timestamp
    const formatTime = (timestamp: string) => {
        const date = new Date(timestamp);
        return date.toLocaleString();
    };

    // Time remaining for expiring quarantines
    const getTimeRemaining = (expiresAt: string | null) => {
        if (!expiresAt) return 'Permanent';
        const diff = new Date(expiresAt).getTime() - Date.now();
        if (diff <= 0) return 'Expired';
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const days = Math.floor(hours / 24);
        if (days > 0) return `${days}d ${hours % 24}h`;
        const minutes = Math.floor((diff / (1000 * 60)) % 60);
        return `${hours}h ${minutes}m`;
    };

    if (compact) {
        return (
            <div className={`bg-dark-surface rounded-lg border border-accent-teal/10 p-4 ${className}`}>
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-text-primary flex items-center gap-2">
                        <Shield size={20} className="text-red-400" />
                        Quarantined IPs
                    </h3>
                    <span className="px-2 py-1 bg-red-500/20 text-red-400 rounded text-sm font-bold">
                        {quarantinedIPs.length}
                    </span>
                </div>
                {loading ? (
                    <div className="flex items-center justify-center py-8">
                        <Loader2 size={24} className="animate-spin text-accent-teal" />
                    </div>
                ) : quarantinedIPs.length === 0 ? (
                    <div className="text-center py-8 text-text-secondary">
                        <Shield size={32} className="mx-auto mb-2 opacity-30" />
                        <p>No quarantined IPs</p>
                    </div>
                ) : (
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                        {quarantinedIPs.slice(0, 5).map(ip => (
                            <div
                                key={ip.id}
                                className="flex items-center justify-between p-2 bg-dark-bg/50 rounded"
                            >
                                <div>
                                    <span className="font-mono text-sm text-text-primary">{ip.ip_address}</span>
                                    <span className="ml-2 text-xs text-text-secondary">{ip.attack_type}</span>
                                </div>
                                <button
                                    onClick={() => handleRelease(ip.ip_address)}
                                    disabled={releasing === ip.ip_address}
                                    className="p-1 hover:bg-green-500/20 rounded text-green-400"
                                >
                                    {releasing === ip.ip_address
                                        ? <Loader2 size={14} className="animate-spin" />
                                        : <CheckCircle size={14} />}
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className={`bg-dark-surface rounded-lg border border-accent-teal/10 ${className}`}>
            {/* Header */}
            <div className="p-6 border-b border-accent-teal/10">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold text-text-primary flex items-center gap-3">
                        <div className="p-2 bg-red-500/20 rounded-lg">
                            <Shield size={24} className="text-red-400" />
                        </div>
                        Security Quarantine
                    </h2>
                    <button
                        onClick={fetchData}
                        disabled={loading}
                        className="p-2 hover:bg-dark-bg rounded-lg transition-colors"
                    >
                        <RefreshCw size={20} className={`text-text-secondary ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>

                {/* Search */}
                <div className="relative mb-4">
                    <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
                    <input
                        type="text"
                        placeholder="Search IPs, attack types..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-dark-bg border border-accent-teal/20 rounded-lg text-text-primary placeholder-text-secondary focus:border-accent-teal focus:outline-none"
                    />
                </div>

                {/* Tabs */}
                <div className="flex gap-2">
                    <button
                        onClick={() => setActiveTab('quarantined')}
                        className={`px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === 'quarantined'
                            ? 'bg-red-500/20 text-red-400'
                            : 'bg-dark-bg text-text-secondary hover:text-text-primary'
                            }`}
                    >
                        Quarantined IPs ({quarantinedIPs.length})
                    </button>
                    <button
                        onClick={() => setActiveTab('attacks')}
                        className={`px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === 'attacks'
                            ? 'bg-orange-500/20 text-orange-400'
                            : 'bg-dark-bg text-text-secondary hover:text-text-primary'
                            }`}
                    >
                        Recent Attacks ({recentAttacks.length})
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="p-6 max-h-[600px] overflow-y-auto">
                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 size={32} className="animate-spin text-accent-teal" />
                    </div>
                ) : activeTab === 'quarantined' ? (
                    filteredQuarantined.length === 0 ? (
                        <div className="text-center py-12 text-text-secondary">
                            <Shield size={48} className="mx-auto mb-4 opacity-30" />
                            <p className="text-lg">No quarantined IPs</p>
                            <p className="text-sm mt-2">The system is clean</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {filteredQuarantined.map(ip => {
                                const attackConfig = getAttackConfig(ip.attack_type);
                                const isExpiring = ip.expires_at && !ip.is_permanent;

                                return (
                                    <div
                                        key={ip.id}
                                        className="bg-dark-bg rounded-lg border border-red-500/20 p-4 hover:border-red-500/40 transition-colors"
                                    >
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-3 mb-2">
                                                    <span className="font-mono text-lg text-text-primary font-bold">
                                                        {ip.ip_address}
                                                    </span>
                                                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${attackConfig.severity === 'CRITICAL'
                                                        ? 'bg-red-500/20 text-red-400'
                                                        : attackConfig.severity === 'HIGH'
                                                            ? 'bg-orange-500/20 text-orange-400'
                                                            : 'bg-yellow-500/20 text-yellow-400'
                                                        }`}>
                                                        {attackConfig.label}
                                                    </span>
                                                    {ip.is_permanent && (
                                                        <span className="px-2 py-0.5 bg-purple-500/20 text-purple-400 rounded text-xs font-bold">
                                                            PERMANENT
                                                        </span>
                                                    )}
                                                </div>

                                                <p className="text-sm text-text-secondary mb-2">{ip.reason}</p>

                                                <div className="flex items-center gap-4 text-xs text-text-secondary">
                                                    <span className="flex items-center gap-1">
                                                        <Clock size={12} />
                                                        Quarantined: {formatTime(ip.quarantined_at)}
                                                    </span>
                                                    <span>By: {ip.quarantined_by}</span>
                                                    {isExpiring && (
                                                        <span className="flex items-center gap-1 text-yellow-400">
                                                            <AlertTriangle size={12} />
                                                            Expires in: {getTimeRemaining(ip.expires_at)}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            <button
                                                onClick={() => handleRelease(ip.ip_address)}
                                                disabled={releasing === ip.ip_address}
                                                className={`px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors ${releasing === ip.ip_address
                                                    ? 'bg-gray-500/20 text-gray-400 cursor-wait'
                                                    : 'bg-green-500/20 hover:bg-green-500/30 text-green-400 border border-green-500/30'
                                                    }`}
                                            >
                                                {releasing === ip.ip_address ? (
                                                    <>
                                                        <Loader2 size={16} className="animate-spin" />
                                                        Releasing...
                                                    </>
                                                ) : (
                                                    <>
                                                        <CheckCircle size={16} />
                                                        Release
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )
                ) : (
                    filteredAttacks.length === 0 ? (
                        <div className="text-center py-12 text-text-secondary">
                            <ShieldOff size={48} className="mx-auto mb-4 opacity-30" />
                            <p className="text-lg">No recent attacks</p>
                            <p className="text-sm mt-2">System is secure</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {filteredAttacks.map((attack, idx) => {
                                const attackConfig = getAttackConfig(attack.attack_type);

                                return (
                                    <div
                                        key={`${attack.incident_id}-${idx}`}
                                        className="bg-dark-bg rounded-lg border border-accent-teal/10 p-4 hover:border-accent-teal/30 transition-colors"
                                    >
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <span className={`px-2 py-0.5 rounded text-xs font-bold ${attack.severity === 'CRITICAL'
                                                        ? 'bg-red-500/20 text-red-400'
                                                        : attack.severity === 'HIGH'
                                                            ? 'bg-orange-500/20 text-orange-400'
                                                            : 'bg-yellow-500/20 text-yellow-400'
                                                        }`}>
                                                        {attack.severity}
                                                    </span>
                                                    <span className="text-sm font-medium text-text-primary">
                                                        {attackConfig.label}
                                                    </span>
                                                    {attack.auto_quarantined && (
                                                        <span className="px-2 py-0.5 bg-green-500/20 text-green-400 rounded text-xs">
                                                            Auto-Quarantined
                                                        </span>
                                                    )}
                                                </div>

                                                <p className="text-sm text-text-secondary mb-2">
                                                    {attack.description || `Attack from ${attack.source_ip || 'unknown'}`}
                                                </p>

                                                <div className="flex items-center gap-4 text-xs text-text-secondary">
                                                    {attack.source_ip && (
                                                        <span className="font-mono bg-dark-surface px-2 py-0.5 rounded">
                                                            {attack.source_ip}
                                                        </span>
                                                    )}
                                                    <span className="flex items-center gap-1">
                                                        <Clock size={12} />
                                                        {formatTime(attack.timestamp)}
                                                    </span>
                                                </div>
                                            </div>

                                            <span className={`px-2 py-1 rounded text-xs font-medium ${attack.status === 'NEW'
                                                ? 'bg-blue-500/20 text-blue-400'
                                                : attack.status === 'RESOLVED'
                                                    ? 'bg-green-500/20 text-green-400'
                                                    : 'bg-gray-500/20 text-gray-400'
                                                }`}>
                                                {attack.status}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )
                )}
            </div>
        </div>
    );
};

export default QuarantinePanel;
