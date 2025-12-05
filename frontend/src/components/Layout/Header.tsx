// ============================================
// HEADER - Fixed Top Navigation Bar
// Height: 80px (h-20), z-index: 50
// ============================================

import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Bell, Menu, Settings as SettingsIcon, LogOut, ChevronDown } from 'lucide-react';
import type { User } from '../../types';

interface HeaderProps {
    onToggleSidebar: () => void;
    currentUser: User | null;
    onLogout: () => void;
}

const Header: React.FC<HeaderProps> = ({ onToggleSidebar, currentUser, onLogout }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [notificationCount] = useState(3);
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const navigate = useNavigate();

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
        <header className="fixed top-0 left-0 right-0 h-20 bg-dark-surface border-b border-accent-teal/10 z-50">
            <div className="flex items-center justify-between h-full px-6 gap-6">
                {/* Left Section - Logo + Live Indicator */}
                <div className="flex items-center gap-6">
                    {/* Logo - Hidden on mobile */}
                    <div className="hidden sm:flex items-center gap-2">
                        <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                            <path
                                d="M16 2 L26 6 L26 14 Q26 22 16 30 Q6 22 6 14 L6 6 Z"
                                stroke="#32B8C6"
                                strokeWidth="1.5"
                                fill="rgba(50, 184, 198, 0.1)"
                            />
                            <rect x="13" y="14" width="6" height="6" rx="1" fill="#32B8C6" />
                        </svg>
                        <span className="text-base font-bold text-text-primary">RRS</span>
                    </div>

                    {/* Live Indicator */}
                    <div className="flex items-center gap-2">
                        <div className="relative">
                            <div className="w-2 h-2 bg-status-success rounded-full animate-pulse" />
                            <div
                                className="absolute inset-0 w-2 h-2 bg-status-success rounded-full opacity-75"
                                style={{
                                    animation: 'ping 2s cubic-bezier(0, 0, 0.2, 1) infinite',
                                }}
                            />
                        </div>
                        <span className="text-xs font-semibold text-status-success">LIVE</span>
                    </div>
                </div>

                {/* Center Section - Search Bar */}
                <div className="flex-1 max-w-md mx-4 hidden md:block">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-accent-teal" size={18} />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search incidents (e.g., INC-2025-11-21)"
                            className="w-full pl-10 pr-4 py-2 bg-accent-teal/10 border border-accent-teal/30 rounded-full text-sm font-mono text-text-primary placeholder-text-secondary/50 focus:outline-none focus:border-accent-teal focus:ring-2 focus:ring-accent-teal/20 transition-all"
                        />
                    </div>
                </div>

                {/* Right Section - Icons + User Menu */}
                <div className="flex items-center gap-4">
                    {/* Notification Bell */}
                    <button
                        className="relative p-2 hover:bg-dark-bg/50 rounded-lg transition-colors"
                        aria-label="Notifications"
                    >
                        <Bell size={24} className="text-accent-teal" />
                        {notificationCount > 0 && (
                            <span className="absolute -top-1 -right-1 w-5 h-5 bg-status-critical rounded-full flex items-center justify-center text-white text-xs font-bold">
                                {notificationCount}
                            </span>
                        )}
                    </button>

                    {/* Sidebar Toggle (Desktop only) */}
                    <button
                        onClick={onToggleSidebar}
                        className="hidden md:block p-2 hover:bg-dark-bg/50 rounded-lg transition-colors"
                        aria-label="Toggle sidebar"
                    >
                        <Menu size={24} className="text-accent-teal" />
                    </button>

                    {/* User Profile Dropdown */}
                    <div className="relative" ref={dropdownRef}>
                        <button
                            onClick={() => setDropdownOpen(!dropdownOpen)}
                            className="flex items-center gap-2 p-1 hover:bg-dark-bg/50 rounded-lg transition-colors"
                            aria-label="User menu"
                        >
                            {/* Avatar */}
                            <div className="w-10 h-10 bg-accent-teal rounded-full flex items-center justify-center">
                                <span className="text-white text-sm font-bold">
                                    {currentUser?.username?.charAt(0).toUpperCase() || 'U'}
                                </span>
                            </div>
                            <ChevronDown
                                size={16}
                                className={`text-text-secondary transition-transform ${dropdownOpen ? 'rotate-180' : ''
                                    }`}
                            />
                        </button>

                        {/* Dropdown Menu */}
                        {dropdownOpen && (
                            <div
                                className="absolute right-0 mt-2 w-52 bg-dark-bg border border-accent-teal/20 rounded-lg shadow-2xl"
                                style={{
                                    animation: 'dropdownEnter 150ms ease-out',
                                    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
                                }}
                            >
                                {/* User Info */}
                                <div className="px-4 py-3 border-b border-dark-border">
                                    <p className="text-sm font-semibold text-text-primary">
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
                                        className="w-full flex items-center gap-3 px-4 py-2 text-sm text-text-primary hover:bg-dark-surface transition-colors"
                                    >
                                        <SettingsIcon size={16} className="text-accent-teal" />
                                        Settings
                                    </button>

                                    <button
                                        onClick={handleLogout}
                                        className="w-full flex items-center gap-3 px-4 py-2 text-sm text-status-critical hover:bg-dark-surface transition-colors"
                                    >
                                        <LogOut size={16} />
                                        Logout
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Animation Keyframes */}
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
      `}</style>
        </header>
    );
};

export default Header;
