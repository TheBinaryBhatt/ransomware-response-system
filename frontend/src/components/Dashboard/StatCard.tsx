// ============================================
// STAT CARD - KPI Display Card
// Padding: p-6 (24px), Gap: 24px between cards
// ============================================

import { Shield, AlertTriangle, Timer, Target } from 'lucide-react';

interface StatCardProps {
    title: string;
    value: string | number;
    icon: 'shield' | 'alert' | 'timer' | 'target';
    color: 'teal' | 'red' | 'green' | 'amber';
    isPulsing?: boolean;
    progress?: number; // 0-100
    isLoading?: boolean;
    onClick?: () => void;  // Optional click handler for navigation
}

const StatCard: React.FC<StatCardProps> = ({
    title,
    value,
    icon,
    color,
    isPulsing = false,
    progress,
    isLoading = false,
    onClick,
}) => {
    // Icon mapping
    const iconMap = {
        shield: Shield,
        alert: AlertTriangle,
        timer: Timer,
        target: Target,
    };

    const Icon = iconMap[icon];

    // Color classes
    const colorClasses = {
        teal: {
            bg: 'from-accent-teal/10 to-accent-teal/5',
            border: 'border-accent-teal/30',
            text: 'text-accent-teal',
            icon: 'text-accent-teal',
        },
        red: {
            bg: 'from-status-critical/10 to-status-critical/5',
            border: 'border-status-critical/30',
            text: 'text-status-critical',
            icon: 'text-status-critical',
        },
        green: {
            bg: 'from-status-success/10 to-status-success/5',
            border: 'border-status-success/30',
            text: 'text-status-success',
            icon: 'text-status-success',
        },
        amber: {
            bg: 'from-status-warning/10 to-status-warning/5',
            border: 'border-status-warning/30',
            text: 'text-status-warning',
            icon: 'text-status-warning',
        },
    };

    const styles = colorClasses[color];

    return (
        <div
            onClick={onClick}
            className={`
        bg-gradient-to-br ${styles.bg}
        border ${styles.border}
        ${isPulsing ? 'animate-pulse' : ''}
        ${onClick ? 'cursor-pointer' : ''}
        rounded-lg p-6 shadow-lg
        transform transition-all duration-300
        hover:shadow-xl hover:-translate-y-1
      `}
        >
            {/* Icon */}
            <div className="flex items-center justify-between mb-4">
                <Icon className={`${styles.icon}`} size={32} />
            </div>

            {/* Value */}
            <div>
                {isLoading ? (
                    <div className="animate-pulse">
                        <div className="h-10 bg-text-secondary/20 rounded w-24 mb-2"></div>
                        <div className="h-4 bg-text-secondary/20 rounded w-32"></div>
                    </div>
                ) : (
                    <>
                        <div className={`text-4xl font-bold ${styles.text} mb-1 font-mono`}>
                            {value}
                        </div>
                        <div className="text-sm text-text-secondary font-medium">{title}</div>

                        {/* Progress Ring (optional) */}
                        {progress !== undefined && (
                            <div className="mt-3">
                                <div className="w-full bg-dark-bg/50 rounded-full h-2">
                                    <div
                                        className={`h-2 rounded-full ${styles.bg} transition-all duration-500`}
                                        style={{ width: `${progress}%` }}
                                    ></div>
                                </div>
                                <div className="text-xs text-text-secondary mt-1">{progress}%</div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export default StatCard;
