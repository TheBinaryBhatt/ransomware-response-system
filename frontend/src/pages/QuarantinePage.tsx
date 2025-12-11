// ============================================
// QUARANTINE PAGE - IP Quarantine Management
// ============================================

import React from 'react';
import { Shield, ShieldAlert, Activity, Clock } from 'lucide-react';
import QuarantinePanel from '../components/Security/QuarantinePanel';
import AnimatedBackground from '../components/Common/AnimatedBackground';

const QuarantinePage: React.FC = () => {
    return (
        <div className="min-h-screen bg-dark-bg relative">
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
                        value="—"
                        icon={<Shield size={20} />}
                        color="red"
                    />
                    <StatCard
                        title="Attacks Blocked (24h)"
                        value="—"
                        icon={<ShieldAlert size={20} />}
                        color="orange"
                    />
                    <StatCard
                        title="Auto-Quarantined"
                        value="—"
                        icon={<Activity size={20} />}
                        color="purple"
                    />
                    <StatCard
                        title="Avg Block Duration"
                        value="—"
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
