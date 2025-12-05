// src/components/Sidebar.tsx
import React from 'react';
import { Link, useLocation } from 'react-router-dom';

interface SidebarProps {
    onLogout: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ onLogout }) => {
    const location = useLocation();

    const navItems = [
        { path: '/dashboard', label: 'Dashboard', icon: '📊' },
        { path: '/incidents', label: 'Incidents', icon: '⚠️' },
        { path: '/threats', label: 'Threat Intel', icon: '🎯' },
        { path: '/workflows', label: 'Workflows', icon: '⚙️' },
        { path: '/logs', label: 'Audit Logs', icon: '📝' },
    ];

    return (
        <aside className="w-64 bg-gray-900 border-r border-gray-800 flex flex-col">
            {/* Logo */}
            <div className="p-6 border-b border-gray-800">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-r from-cyan-600 to-blue-600 rounded-lg flex items-center justify-center text-white font-bold">
                        🛡️
                    </div>
                    <div>
                        <h1 className="text-lg font-bold text-white">Darktrace</h1>
                        <p className="text-xs text-gray-400">Secure Web</p>
                    </div>
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 p-4 space-y-1">
                {navItems.map((item) => {
                    const isActive = location.pathname === item.path;
                    return (
                        <Link
                            key={item.path}
                            to={item.path}
                            className={`
                                flex items-center gap-3 px-4 py-3 rounded-lg transition-colors
                                ${isActive
                                    ? 'bg-cyan-600 text-white'
                                    : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                                }
                            `}
                        >
                            <span className="text-xl">{item.icon}</span>
                            <span className="font-medium">{item.label}</span>
                        </Link>
                    );
                })}
            </nav>

            {/* User Section */}
            <div className="p-4 border-t border-gray-800">
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                            A
                        </div>
                        <div>
                            <p className="text-sm font-medium text-white">admin</p>
                            <p className="text-xs text-gray-400">Security Analyst</p>
                        </div>
                    </div>
                </div>
                <button
                    onClick={() => {
                        localStorage.removeItem('token');
                        onLogout();
                    }}
                    className="w-full px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg text-sm transition-colors"
                >
                    Logout
                </button>
            </div>
        </aside>
    );
};

export default Sidebar;