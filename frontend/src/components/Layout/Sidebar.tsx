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
    Workflow,
    ScrollText,
    Settings,
} from 'lucide-react';

interface NavItem {
    label: string;
    icon: React.ComponentType<{ size: number; className?: string }>;
    route: string;
}

const navItems: NavItem[] = [
    { label: 'Dashboard', icon: LayoutDashboard, route: '/dashboard' },
    { label: 'Threat Intel', icon: Target, route: '/threat-intel' },
    { label: 'Incidents', icon: AlertTriangle, route: '/incidents' },
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
                className={`hidden md:flex flex-col h-screen bg-dark-surface border-r border-accent-teal/10 transition-all duration-300 ${isCollapsed ? 'w-20' : 'w-64'
                    }`}
            >
                {/* Logo Section - Matches header height */}
                <div className="h-20 flex items-center justify-center border-b border-accent-teal/10">
                    {isCollapsed ? (
                        <span className="text-2xl font-bold text-accent-teal">R</span>
                    ) : (
                        <div className="flex items-center gap-2">
                            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                                <path
                                    d="M16 2 L26 6 L26 14 Q26 22 16 30 Q6 22 6 14 L6 6 Z"
                                    stroke="#32B8C6"
                                    strokeWidth="1.5"
                                    fill="rgba(50, 184, 198, 0.1)"
                                />
                                <rect x="13" y="14" width="6" height="6" rx="1" fill="#32B8C6" />
                            </svg>
                            <span className="text-xl font-bold text-text-primary">RRS</span>
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
                                        ? 'bg-accent-teal/10 border-l-4 border-accent-teal text-accent-teal'
                                        : 'border-l-4 border-transparent text-text-secondary hover:bg-dark-bg/50 hover:text-accent-teal'
                                    }
                  ${isCollapsed ? 'justify-center' : ''}
                `}
                            >
                                <Icon size={24} className={isActive ? 'text-accent-teal' : ''} />
                                {!isCollapsed && (
                                    <span className="text-sm font-medium">{item.label}</span>
                                )}
                            </Link>
                        );
                    })}
                </nav>

                {/* Footer */}
                {!isCollapsed && (
                    <div className="px-4 py-4 border-t border-accent-teal/10">
                        <p className="text-xs text-text-secondary">© 2025 RRS</p>
                    </div>
                )}
            </aside>

            {/* Mobile Bottom Navigation */}
            <nav className="md:hidden fixed bottom-0 left-0 right-0 h-20 bg-dark-surface border-t border-accent-teal/10 z-50">
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
                                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-12 h-1 bg-accent-teal rounded-b-full" />
                                )}

                                {/* Icon */}
                                <Icon
                                    size={24}
                                    className={`${isActive ? 'text-accent-teal' : 'text-text-secondary'
                                        } transition-colors`}
                                />

                                {/* Label - Small text below icon */}
                                <span
                                    className={`text-xs mt-1 ${isActive ? 'text-accent-teal' : 'text-text-secondary'
                                        }`}
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
