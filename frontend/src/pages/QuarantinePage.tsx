// ============================================
// QUARANTINE PAGE - IP Quarantine Management
// ============================================

import React, { useState, useEffect } from 'react';
import { Shield, ShieldAlert, Clock, Zap } from 'lucide-react';
import QuarantinePanel from '../components/Security/QuarantinePanel';
import AnimatedBackground from '../components/Common/AnimatedBackground';
import { securityApi } from '../services/api';
import { useWebSocket } from '../hooks/useWebSocket';
import { SECURITY_WS_EVENTS } from '../utils/constants';

interface QuarantineStats {
    activeQuarantines: number;
    attacksBlocked24h: number;
    autoQuarantined: number;
    avgBlockDuration: string;
}

const QuarantinePage: React.FC = () => {
    const [stats, setStats] = useState<QuarantineStats>({
        activeQuarantines: 0,
        attacksBlocked24h: 0,
        autoQuarantined: 0,
        avgBlockDuration: '—',
    });
    const { on } = useWebSocket();

    // Fetch quarantine stats
    const fetchStats = async () => {
        try {
            const [quarantineResponse, attacksResponse] = await Promise.all([
                securityApi.listQuarantinedIPs('active'),
                securityApi.getRecentAttacks(100),
            ]);

            const quarantined = quarantineResponse.quarantined_ips || [];
            const attacks = attacksResponse.attacks || [];

            // Calculate stats
            const now = Date.now();
            const last24h = attacks.filter((a: any) => {
                const attackTime = new Date(a.timestamp).getTime();
                return now - attackTime < 24 * 60 * 60 * 1000;
            });

            const autoQuarantinedCount = quarantined.filter(
                (q: any) => q.quarantined_by?.includes('auto') || q.quarantined_by?.includes('response_service')
            ).length;

            // Calculate average duration (simplified)
            let avgDuration = '—';
            const durations = quarantined
                .filter((q: any) => q.expires_at)
                .map((q: any) => {
                    const start = new Date(q.quarantined_at).getTime();
                    const end = new Date(q.expires_at).getTime();
                    return (end - start) / (1000 * 60 * 60); // hours
                });

            if (durations.length > 0) {
                const avgHours = durations.reduce((a: number, b: number) => a + b, 0) / durations.length;
                avgDuration = avgHours >= 24
                    ? `${Math.round(avgHours / 24)}d`
                    : `${Math.round(avgHours)}h`;
            }

            setStats({
                activeQuarantines: quarantined.length,
                attacksBlocked24h: last24h.length,
                autoQuarantined: autoQuarantinedCount,
                avgBlockDuration: avgDuration,
            });
        } catch (error) {
            console.error('Failed to fetch quarantine stats:', error);
        }
    };

    useEffect(() => {
        fetchStats();

        // Refresh on quarantine events
        const unsubQuarantined = on(SECURITY_WS_EVENTS.IP_QUARANTINED, () => {
            console.log('[QuarantinePage] IP quarantined - refreshing stats');
            fetchStats();
        });

        const unsubReleased = on(SECURITY_WS_EVENTS.IP_RELEASED, () => {
            console.log('[QuarantinePage] IP released - refreshing stats');
            fetchStats();
        });

        // Listen for auto-quarantine events
        const unsubAutoQuarantine = on('security.auto_quarantine', (data: any) => {
            console.log('[QuarantinePage] Auto-quarantine triggered:', data);
            fetchStats();
        });

        // Listen for attack detection
        const unsubAttack = on(SECURITY_WS_EVENTS.ATTACK_DETECTED, () => {
            fetchStats();
        });

        return () => {
            unsubQuarantined?.();
            unsubReleased?.();
            unsubAutoQuarantine?.();
            unsubAttack?.();
        };
    }, [on]);

    return (
        <div className="min-h-full bg-dark-bg relative">
            <AnimatedBackground />

            <div className="relative z-10 p-6">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center gap-4 mb-2">
                        <div className="p-3 bg-gradient-to-br from-red-500/20 to-orange-500/20 rounded-xl border border-red-500/30">
                            <ShieldAlert size={32} className="text-red-400" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold text-text-primary">
                                Security Quarantine
                            </h1>
                            <p className="text-text-secondary">
                                Manage quarantined IP addresses and view recent attack activity
                            </p>
                        </div>
                    </div>
                </div>

                {/* Stats Row */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    <StatCard
                        title="Active Quarantines"
                        value={stats.activeQuarantines.toString()}
                        icon={<Shield size={20} />}
                        color="red"
                    />
                    <StatCard
                        title="Attacks Blocked (24h)"
                        value={stats.attacksBlocked24h.toString()}
                        icon={<ShieldAlert size={20} />}
                        color="orange"
                    />
                    <StatCard
                        title="Auto-Quarantined"
                        value={stats.autoQuarantined.toString()}
                        icon={<Zap size={20} />}
                        color="purple"
                    />
                    <StatCard
                        title="Avg Block Duration"
                        value={stats.avgBlockDuration}
                        icon={<Clock size={20} />}
                        color="blue"
                    />
                </div>

                {/* Main Panel */}
                <QuarantinePanel />
            </div>
        </div>
    );
};

// Simple stat card component
interface StatCardProps {
    title: string;
    value: string;
    icon: React.ReactNode;
    color: 'red' | 'orange' | 'purple' | 'blue' | 'green';
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, color }) => {
    const colorClasses = {
        red: 'from-red-500/20 to-red-500/5 border-red-500/30 text-red-400',
        orange: 'from-orange-500/20 to-orange-500/5 border-orange-500/30 text-orange-400',
        purple: 'from-purple-500/20 to-purple-500/5 border-purple-500/30 text-purple-400',
        blue: 'from-blue-500/20 to-blue-500/5 border-blue-500/30 text-blue-400',
        green: 'from-green-500/20 to-green-500/5 border-green-500/30 text-green-400',
    };

    return (
        <div className={`bg-gradient-to-br ${colorClasses[color]} rounded-lg border p-4`}>
            <div className="flex items-center justify-between mb-2">
                <span className="text-text-secondary text-sm">{title}</span>
                {icon}
            </div>
            <div className="text-2xl font-bold text-text-primary">{value}</div>
        </div>
    );
};

export default QuarantinePage;

