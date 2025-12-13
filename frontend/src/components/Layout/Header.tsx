// ============================================
// HEADER - Fixed Top Navigation Bar
// Height: 80px (h-20), z-index: 50
// ============================================

import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Menu, LogOut, ChevronDown } from 'lucide-react';
import type { User } from '../../types';
import NotificationBell from '../Common/NotificationBell';
import { useTheme } from '../../contexts/ThemeContext';

interface HeaderProps {
    onToggleSidebar: () => void;
    currentUser: User | null;
    onLogout: () => void;
}

const Header: React.FC<HeaderProps> = ({ onToggleSidebar, currentUser, onLogout }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const navigate = useNavigate();
    const { theme } = useTheme();
    const isLight = theme === 'light';

    // Theme-aware colors
    const colors = {
        headerBg: isLight ? 'rgba(255, 255, 255, 0.95)' : 'rgba(10, 22, 40, 0.8)',
        borderColor: isLight ? '#e2e8f0' : 'rgba(59, 130, 246, 0.2)',
        textPrimary: isLight ? '#1e293b' : '#ffffff',
        textSecondary: isLight ? '#64748b' : '#9ca3af',
        accent: isLight ? '#0ea5e9' : '#3b82f6',
        inputBg: isLight ? '#f1f5f9' : 'rgba(59, 130, 246, 0.1)',
        inputBorder: isLight ? '#cbd5e1' : 'rgba(59, 130, 246, 0.3)',
        dropdownBg: isLight ? 'rgba(255, 255, 255, 0.98)' : 'rgba(15, 23, 42, 0.95)',
        hoverBg: isLight ? 'rgba(14, 165, 233, 0.1)' : 'rgba(59, 130, 246, 0.1)',
    };

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setDropdownOpen(false);
            }
        };

        if (dropdownOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [dropdownOpen]);

    const handleLogout = () => {
        onLogout();
        navigate('/login');
    };

    const getRoleBadgeColor = (role: string) => {
        switch (role) {
            case 'admin':
                return 'bg-status-critical text-white';
            case 'analyst':
                return 'bg-accent-teal text-dark-bg';
            case 'auditor':
                return 'bg-text-secondary text-dark-bg';
            default:
                return 'bg-text-secondary text-dark-bg';
        }
    };

    return (
        <header className="relative h-20 border-b z-50" style={{
            backgroundColor: colors.headerBg,
            backdropFilter: 'blur(12px)',
            borderColor: colors.borderColor
        }}>
            <div className="flex items-center justify-between h-full px-6 gap-6">
                {/* Left Section - Logo + Live Indicator */}
                <div className="flex items-center gap-6">
                    {/* Logo - Hidden on mobile */}
                    <div className="hidden sm:flex items-center gap-2">
                        <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                            <path
                                d="M16 2 L26 6 L26 14 Q26 22 16 30 Q6 22 6 14 L6 6 Z"
                                stroke={colors.accent}
                                strokeWidth="1.5"
                                fill={isLight ? 'rgba(14, 165, 233, 0.2)' : 'rgba(59, 130, 246, 0.2)'}
                            />
                            <rect x="13" y="14" width="6" height="6" rx="1" fill={colors.accent} />
                        </svg>
                        <span className="text-base font-bold" style={{ color: colors.textPrimary }}>RRS</span>
                    </div>

                    {/* Live Indicator */}
                    <div className="flex items-center gap-2">
                        <div className="relative">
                            <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: '#10b981' }} />
                            <div
                                className="absolute inset-0 w-2 h-2 rounded-full opacity-75"
                                style={{
                                    backgroundColor: '#10b981',
                                    animation: 'ping 2s cubic-bezier(0, 0, 0.2, 1) infinite',
                                }}
                            />
                        </div>
                        <span className="text-xs font-semibold" style={{ color: '#10b981' }}>LIVE</span>
                    </div>
                </div>

                {/* Center Section - Search Bar */}
                <div className="flex-1 max-w-md mx-4 hidden md:block">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: colors.accent }} size={18} />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search incidents (e.g., INC-2025-11-21)"
                            className="header-search-input w-full pl-10 pr-4 py-2 rounded-full text-sm font-mono focus:outline-none focus:ring-2 transition-all"
                            style={{
                                backgroundColor: colors.inputBg,
                                border: `1px solid ${colors.inputBorder}`,
                                color: colors.textPrimary
                            }}
                        />
                    </div>
                </div>

                {/* Right Section - Icons + User Menu */}
                <div className="flex items-center gap-4">
                    {/* Enhanced Notification Bell with Real-time Alerts */}
                    <div className="relative">
                        <NotificationBell />
                    </div>

                    {/* Sidebar Toggle (Desktop only) */}
                    <button
                        onClick={onToggleSidebar}
                        className="hidden md:block p-2 rounded-lg transition-colors"
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = colors.hoverBg}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                        aria-label="Toggle sidebar"
                    >
                        <Menu size={24} style={{ color: colors.accent }} />
                    </button>

                    {/* User Profile Dropdown */}
                    <div className="relative" ref={dropdownRef}>
                        <button
                            onClick={() => setDropdownOpen(!dropdownOpen)}
                            className="flex items-center gap-2 p-1 rounded-lg transition-colors"
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = colors.hoverBg}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                            aria-label="User menu"
                        >
                            {/* Avatar */}
                            <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: colors.accent }}>
                                <span className="text-white text-sm font-bold">
                                    {currentUser?.username?.charAt(0).toUpperCase() || 'U'}
                                </span>
                            </div>
                            <ChevronDown
                                size={16}
                                style={{ color: colors.textSecondary }}
                                className={`transition-transform ${dropdownOpen ? 'rotate-180' : ''}`}
                            />
                        </button>

                        {/* Dropdown Menu */}
                        {dropdownOpen && (
                            <div
                                className="absolute right-0 mt-2 w-52 rounded-lg shadow-2xl"
                                style={{
                                    backgroundColor: colors.dropdownBg,
                                    backdropFilter: 'blur(12px)',
                                    border: `1px solid ${colors.borderColor}`,
                                    animation: 'dropdownEnter 150ms ease-out',
                                    boxShadow: isLight ? '0 8px 24px rgba(0, 0, 0, 0.15)' : '0 8px 24px rgba(0, 0, 0, 0.6)',
                                }}
                            >
                                {/* User Info */}
                                <div className="px-4 py-3 border-b" style={{ borderColor: colors.borderColor }}>
                                    <p className="text-sm font-semibold" style={{ color: colors.textPrimary }}>
                                        {currentUser?.username || 'User'}
                                    </p>
                                    {currentUser?.role && (
                                        <span
                                            className={`inline-block mt-1 px-2 py-0.5 rounded text-xs font-medium ${getRoleBadgeColor(
                                                currentUser.role
                                            )}`}
                                        >
                                            {currentUser.role.charAt(0).toUpperCase() + currentUser.role.slice(1)}
                                        </span>
                                    )}
                                </div>

                                {/* Menu Items */}
                                <div className="py-2">
                                    <button
                                        onClick={() => {
                                            navigate('/settings');
                                            setDropdownOpen(false);
                                        }}
                                        className="w-full flex items-center gap-3 px-4 py-2 text-sm transition-colors"
                                        style={{ color: colors.textPrimary }}
                                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = colors.hoverBg}
                                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                    >
                                        Settings
                                    </button>

                                    <button
                                        onClick={handleLogout}
                                        className="w-full flex items-center gap-3 px-4 py-2 text-sm transition-colors"
                                        style={{ color: '#ef4444' }}
                                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.1)'}
                                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                    >
                                        <LogOut size={16} style={{ color: '#ef4444' }} />
                                        Logout
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Animation Keyframes & Placeholder Styling */}
            <style>{`
        @keyframes dropdownEnter {
          0% {
            opacity: 0;
            transform: scale(0.95) translateY(-10px);
          }
          100% {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
        .header-search-input::placeholder {
          color: #6b7280;
        }
      `}</style>
        </header>
    );
};

export default Header;
