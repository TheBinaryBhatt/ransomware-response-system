// ============================================
// SIDEBAR - Desktop Left Sidebar + Mobile Bottom Nav
// Desktop: w-64 (expanded) or w-20 (collapsed)
// Mobile: Hidden, replaced by bottom nav
// ============================================

import { Link, useLocation } from 'react-router-dom';
import {
    LayoutDashboard,
    AlertTriangle,
    Shield,
    Workflow,
    ScrollText,
    Settings,
} from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

interface NavItem {
    label: string;
    icon: React.ComponentType<{ size: number; className?: string; style?: React.CSSProperties }>;
    route: string;
}

const navItems: NavItem[] = [
    { label: 'Dashboard', icon: LayoutDashboard, route: '/dashboard' },
    { label: 'Incidents', icon: AlertTriangle, route: '/incidents' },
    { label: 'Quarantine', icon: Shield, route: '/quarantine' },
    { label: 'Workflows', icon: Workflow, route: '/workflows' },
    { label: 'Audit Logs', icon: ScrollText, route: '/audit-logs' },
    { label: 'Settings', icon: Settings, route: '/settings' },
];

interface SidebarProps {
    isCollapsed: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({ isCollapsed }) => {
    const location = useLocation();
    const { theme } = useTheme();
    const isLight = theme === 'light';

    // Theme-aware colors
    const colors = {
        sidebarBg: isLight ? 'rgba(255, 255, 255, 0.95)' : 'rgba(10, 22, 40, 0.7)',
        borderColor: isLight ? '#e2e8f0' : 'rgba(59, 130, 246, 0.2)',
        textPrimary: isLight ? '#1e293b' : '#ffffff',
        textSecondary: isLight ? '#64748b' : '#9ca3af',
        accent: isLight ? '#0ea5e9' : '#3b82f6',
        accentBg: isLight ? 'rgba(14, 165, 233, 0.15)' : 'rgba(59, 130, 246, 0.15)',
        hoverBg: isLight ? 'rgba(14, 165, 233, 0.1)' : 'rgba(59, 130, 246, 0.1)',
    };

    return (
        <>
            {/* Desktop Sidebar */}
            <aside
                className={`hidden md:flex flex-col h-screen border-r transition-all duration-300 ${isCollapsed ? 'w-20' : 'w-64'
                    }`}
                style={{
                    backgroundColor: colors.sidebarBg,
                    backdropFilter: 'blur(10px)',
                    borderColor: colors.borderColor
                }}
            >
                {/* Logo Section - Matches header height */}
                <div className="h-20 flex items-center justify-center border-b" style={{ borderColor: colors.borderColor }}>
                    {isCollapsed ? (
                        <span className="text-2xl font-bold" style={{ color: colors.accent }}>R</span>
                    ) : (
                        <div className="flex items-center gap-2">
                            <svg width="32" height="32" viewBox="0 0 40 40" fill="none">
                                <path
                                    d="M20 4 L34 8.8 L34 18 Q34 28 20 36.8 Q6 28 6 18 L6 8.8 Z"
                                    stroke={colors.accent}
                                    strokeWidth="1.2"
                                    fill={isLight ? 'rgba(14, 165, 233, 0.2)' : 'rgba(59, 130, 246, 0.2)'}
                                />
                                <text
                                    x="20"
                                    y="23"
                                    fontFamily="Arial, sans-serif"
                                    fontSize="11"
                                    fontWeight="bold"
                                    fill={colors.accent}
                                    textAnchor="middle"
                                    dominantBaseline="middle"
                                >
                                    RRS
                                </text>
                            </svg>
                            <span className="text-xl font-bold" style={{ color: colors.textPrimary }}>RRS</span>
                        </div>
                    )}
                </div>

                {/* Navigation Items */}
                <nav className="flex-1 px-3 py-6 space-y-2 overflow-y-auto">
                    {navItems.map((item) => {
                        const isActive = location.pathname === item.route;
                        const Icon = item.icon;

                        return (
                            <Link
                                key={item.route}
                                to={item.route}
                                title={isCollapsed ? item.label : undefined}
                                aria-current={isActive ? 'page' : undefined}
                                className={`
                  flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200
                  ${isActive
                                        ? 'border-l-4'
                                        : 'border-l-4 border-transparent'
                                    }
                  ${isCollapsed ? 'justify-center' : ''}
                `}
                                style={{
                                    borderLeftColor: isActive ? colors.accent : 'transparent',
                                    backgroundColor: isActive ? colors.accentBg : 'transparent',
                                    color: isActive ? colors.accent : colors.textSecondary
                                }}
                                onMouseEnter={(e) => {
                                    if (!isActive) e.currentTarget.style.backgroundColor = colors.hoverBg;
                                }}
                                onMouseLeave={(e) => {
                                    if (!isActive) e.currentTarget.style.backgroundColor = 'transparent';
                                }}
                            >
                                <Icon size={24} style={{ color: isActive ? colors.accent : colors.textSecondary }} />
                                {!isCollapsed && (
                                    <span className="text-sm font-medium">{item.label}</span>
                                )}
                            </Link>
                        );
                    })}
                </nav>

                {/* Footer */}
                {!isCollapsed && (
                    <div className="px-4 py-4 border-t" style={{ borderColor: colors.borderColor }}>
                        <p className="text-xs" style={{ color: colors.textSecondary }}>© 2025 RRS</p>
                    </div>
                )}
            </aside>

            {/* Mobile Bottom Navigation */}
            <nav className="md:hidden fixed bottom-0 left-0 right-0 h-20 z-50" style={{
                backgroundColor: colors.sidebarBg,
                backdropFilter: 'blur(10px)',
                borderTop: `1px solid ${colors.borderColor}`
            }}>
                <div className="flex items-center justify-around h-full px-2">
                    {navItems.map((item) => {
                        const isActive = location.pathname === item.route;
                        const Icon = item.icon;

                        return (
                            <Link
                                key={item.route}
                                to={item.route}
                                aria-current={isActive ? 'page' : undefined}
                                className="flex flex-col items-center justify-center flex-1 h-full relative"
                            >
                                {/* Active indicator - Line at top */}
                                {isActive && (
                                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-12 h-1 rounded-b-full" style={{ backgroundColor: colors.accent }} />
                                )}

                                {/* Icon */}
                                <Icon
                                    size={24}
                                    className="transition-colors"
                                    style={{ color: isActive ? colors.accent : colors.textSecondary }}
                                />

                                {/* Label - Small text below icon */}
                                <span
                                    className="text-xs mt-1"
                                    style={{ color: isActive ? colors.accent : colors.textSecondary }}
                                >
                                    {item.label.split(' ')[0]}{/* First word only on mobile */}
                                </span>
                            </Link>
                        );
                    })}
                </div>
            </nav>
        </>
    );
};

export default Sidebar;

