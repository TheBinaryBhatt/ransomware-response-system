// ============================================
// SIDEBAR - Desktop Left Sidebar + Mobile Bottom Nav
// Desktop: w-64 (expanded) or w-20 (collapsed)
// Mobile: Hidden, replaced by bottom nav
// ============================================

import { Link, useLocation } from 'react-router-dom';
import {
    LayoutDashboard,
    Target,
    AlertTriangle,
    Shield,
    Workflow,
    ScrollText,
    Settings,
} from 'lucide-react';

interface NavItem {
    label: string;
    icon: React.ComponentType<{ size: number; className?: string; style?: React.CSSProperties }>;
    route: string;
}

const navItems: NavItem[] = [
    { label: 'Dashboard', icon: LayoutDashboard, route: '/dashboard' },
    { label: 'Threat Intel', icon: Target, route: '/threat-intel' },
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

    return (
        <>
            {/* Desktop Sidebar */}
            <aside
                className={`hidden md:flex flex-col h-screen border-r transition-all duration-300 ${isCollapsed ? 'w-20' : 'w-64'
                    }`}
                style={{
                    backgroundColor: 'rgba(10, 22, 40, 0.7)',
                    backdropFilter: 'blur(10px)',
                    borderColor: 'rgba(59, 130, 246, 0.2)'
                }}
            >
                {/* Logo Section - Matches header height */}
                <div className="h-20 flex items-center justify-center border-b" style={{ borderColor: 'rgba(59, 130, 246, 0.2)' }}>
                    {isCollapsed ? (
                        <span className="text-2xl font-bold" style={{ color: '#3b82f6' }}>R</span>
                    ) : (
                        <div className="flex items-center gap-2">
                            <svg width="32" height="32" viewBox="0 0 40 40" fill="none">
                                <path
                                    d="M20 4 L34 8.8 L34 18 Q34 28 20 36.8 Q6 28 6 18 L6 8.8 Z"
                                    stroke="#3b82f6"
                                    strokeWidth="1.2"
                                    fill="rgba(59, 130, 246, 0.2)"
                                />
                                <text
                                    x="20"
                                    y="23"
                                    fontFamily="Arial, sans-serif"
                                    fontSize="11"
                                    fontWeight="bold"
                                    fill="#3b82f6"
                                    textAnchor="middle"
                                    dominantBaseline="middle"
                                >
                                    RRS
                                </text>
                            </svg>
                            <span className="text-xl font-bold text-white">RRS</span>
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
                                        ? 'bg-blue-500/20 border-l-4 text-blue-400'
                                        : 'border-l-4 border-transparent text-gray-400 hover:text-blue-400'
                                    }
                  ${isCollapsed ? 'justify-center' : ''}
                `}
                                style={{
                                    borderLeftColor: isActive ? '#3b82f6' : 'transparent',
                                    backgroundColor: isActive ? 'rgba(59, 130, 246, 0.15)' : 'transparent'
                                }}
                            >
                                <Icon size={24} className={isActive ? '' : ''} style={{ color: isActive ? '#3b82f6' : undefined }} />
                                {!isCollapsed && (
                                    <span className="text-sm font-medium">{item.label}</span>
                                )}
                            </Link>
                        );
                    })}
                </nav>

                {/* Footer */}
                {!isCollapsed && (
                    <div className="px-4 py-4 border-t" style={{ borderColor: 'rgba(59, 130, 246, 0.2)' }}>
                        <p className="text-xs text-gray-500">© 2025 RRS</p>
                    </div>
                )}
            </aside>

            {/* Mobile Bottom Navigation */}
            <nav className="md:hidden fixed bottom-0 left-0 right-0 h-20 z-50" style={{
                backgroundColor: 'rgba(10, 22, 40, 0.9)',
                backdropFilter: 'blur(10px)',
                borderTop: '1px solid rgba(59, 130, 246, 0.2)'
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
                                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-12 h-1 rounded-b-full" style={{ backgroundColor: '#3b82f6' }} />
                                )}

                                {/* Icon */}
                                <Icon
                                    size={24}
                                    className="transition-colors"
                                    style={{ color: isActive ? '#3b82f6' : '#9ca3af' }}
                                />

                                {/* Label - Small text below icon */}
                                <span
                                    className="text-xs mt-1"
                                    style={{ color: isActive ? '#3b82f6' : '#9ca3af' }}
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
