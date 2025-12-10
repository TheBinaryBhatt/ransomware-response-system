// ============================================
// NOTIFICATION BELL - Real-time Analyst Alerts
// ============================================

import React, { useState, useEffect, useRef } from 'react';
import { Bell, X, AlertTriangle, Shield, Clock, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useWebSocket } from '../../hooks/useWebSocket';

interface ThreatNotification {
    id: string;
    incident_id: string;
    severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
    ai_confidence: number;
    threat_type: string;
    source_ip?: string;
    message: string;
    timestamp: string;
    read: boolean;
    recommended_action?: string;
}

const NotificationBell: React.FC = () => {
    const [notifications, setNotifications] = useState<ThreatNotification[]>([]);
    const [showDrawer, setShowDrawer] = useState(false);
    const [filter, setFilter] = useState<'all' | 'unread' | 'critical'>('all');
    const drawerRef = useRef<HTMLDivElement>(null);
    const audioRef = useRef<HTMLAudioElement>(null);
    const navigate = useNavigate();
    const { on } = useWebSocket();

    // Subscribe to real-time incident events
    useEffect(() => {
        const handleNewIncident = (data: any) => {
            // Only notify for high-confidence threats
            if (data.severity === 'CRITICAL' || data.severity === 'HIGH') {
                const notification: ThreatNotification = {
                    id: `notif-${Date.now()}-${Math.random()}`,
                    incident_id: data.incident_id || data.id,
                    severity: data.severity,
                    ai_confidence: data.ai_confidence || data.confidence || 0.5,
                    threat_type: data.threat_type || 'Unknown Threat',
                    source_ip: data.source_ip,
                    message: data.message || `${data.severity} threat detected`,
                    timestamp: new Date().toISOString(),
                    read: false,
                    recommended_action: data.recommended_action,
                };
                
                setNotifications(prev => [notification, ...prev]);
                
                // Play sound for critical alerts
                if (data.severity === 'CRITICAL' && audioRef.current) {
                    audioRef.current.play().catch(err => console.log('Audio play failed:', err));
                }
            }
        };

        const unsubIncident = on('incident.received', handleNewIncident);
        const unsubTriaged = on('incident.triaged', handleNewIncident);

        return () => {
            unsubIncident?.();
            unsubTriaged?.();
        };
    }, [on]);

    // Close drawer when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (drawerRef.current && !drawerRef.current.contains(event.target as Node)) {
                setShowDrawer(false);
            }
        };

        if (showDrawer) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [showDrawer]);

    const unreadCount = notifications.filter(n => !n.read).length;
    const criticalCount = notifications.filter(n => n.severity === 'CRITICAL' && !n.read).length;

    const getSeverityConfig = (severity: string) => {
        const configs = {
            CRITICAL: { bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500/40', icon: AlertTriangle },
            HIGH: { bg: 'bg-orange-500/20', text: 'text-orange-400', border: 'border-orange-500/40', icon: AlertTriangle },
            MEDIUM: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', border: 'border-yellow-500/40', icon: Shield },
            LOW: { bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500/40', icon: Shield },
        };
        return configs[severity as keyof typeof configs] || configs.MEDIUM;
    };

    const markAsRead = (id: string) => {
        setNotifications(prev => 
            prev.map(n => n.id === id ? { ...n, read: true } : n)
        );
    };

    const markAllAsRead = () => {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    };

    const removeNotification = (id: string) => {
        setNotifications(prev => prev.filter(n => n.id !== id));
    };

    const clearAll = () => {
        setNotifications([]);
    };

    const viewIncident = (notification: ThreatNotification) => {
        markAsRead(notification.id);
        setShowDrawer(false);
        navigate(`/incidents?id=${notification.incident_id}`);
    };

    const filteredNotifications = notifications.filter(n => {
        if (filter === 'unread') return !n.read;
        if (filter === 'critical') return n.severity === 'CRITICAL';
        return true;
    });

    const formatTimeAgo = (timestamp: string) => {
        const seconds = Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000);
        if (seconds < 60) return `${seconds}s ago`;
        if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
        if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
        return `${Math.floor(seconds / 86400)}d ago`;
    };

    return (
        <>
            {/* Hidden audio element for critical alerts */}
            <audio ref={audioRef} src="/alert-sound.mp3" preload="auto" />

            {/* Notification Bell Button */}
            <button
                onClick={() => setShowDrawer(!showDrawer)}
                className="relative p-2 hover:bg-dark-bg/50 rounded-lg transition-colors group"
                aria-label="Notifications"
            >
                <Bell 
                    size={24} 
                    className={`transition-colors ${unreadCount > 0 ? 'text-accent-teal animate-pulse' : 'text-accent-teal group-hover:text-accent-teal/80'}`}
                />
                {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 bg-status-critical rounded-full flex items-center justify-center text-white text-xs font-bold animate-bounce">
                        {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                )}
                {criticalCount > 0 && (
                    <span className="absolute -bottom-1 -right-1 w-3 h-3 bg-red-600 rounded-full border-2 border-dark-surface animate-pulse" />
                )}
            </button>

            {/* Notification Drawer */}
            {showDrawer && (
                <div
                    ref={drawerRef}
                    className="absolute right-0 top-16 w-96 max-h-[600px] bg-dark-surface border border-accent-teal/20 rounded-lg shadow-2xl overflow-hidden flex flex-col"
                    style={{
                        animation: 'slideInRight 0.2s ease-out',
                        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
                    }}
                >
                    {/* Header */}
                    <div className="bg-gradient-to-r from-dark-surface to-dark-bg border-b border-accent-teal/10 p-4">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-lg font-bold text-text-primary flex items-center gap-2">
                                <Bell size={20} className="text-accent-teal" />
                                Threat Alerts
                                {unreadCount > 0 && (
                                    <span className="px-2 py-0.5 bg-status-critical rounded-full text-xs font-bold text-white">
                                        {unreadCount}
                                    </span>
                                )}
                            </h3>
                            <button
                                onClick={() => setShowDrawer(false)}
                                className="p-1 hover:bg-dark-bg rounded transition-colors"
                            >
                                <X size={18} className="text-text-secondary" />
                            </button>
                        </div>

                        {/* Filter Tabs */}
                        <div className="flex gap-2">
                            {(['all', 'unread', 'critical'] as const).map(f => (
                                <button
                                    key={f}
                                    onClick={() => setFilter(f)}
                                    className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                                        filter === f
                                            ? 'bg-accent-teal text-dark-bg'
                                            : 'bg-dark-bg text-text-secondary hover:bg-dark-bg/70'
                                    }`}
                                >
                                    {f.charAt(0).toUpperCase() + f.slice(1)}
                                    {f === 'unread' && unreadCount > 0 && ` (${unreadCount})`}
                                    {f === 'critical' && criticalCount > 0 && ` (${criticalCount})`}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Notifications List */}
                    <div className="flex-1 overflow-y-auto">
                        {filteredNotifications.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-48 text-text-secondary">
                                <Shield size={48} className="mb-3 opacity-20" />
                                <p className="text-sm">No threat alerts</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-accent-teal/10">
                                {filteredNotifications.map(notification => {
                                    const config = getSeverityConfig(notification.severity);
                                    const Icon = config.icon;
                                    
                                    return (
                                        <div
                                            key={notification.id}
                                            className={`p-4 hover:bg-dark-bg/50 transition-colors cursor-pointer ${
                                                !notification.read ? 'bg-accent-teal/5' : ''
                                            }`}
                                            onClick={() => viewIncident(notification)}
                                        >
                                            <div className="flex items-start gap-3">
                                                {/* Severity Icon */}
                                                <div className={`p-2 rounded-lg ${config.bg} shrink-0`}>
                                                    <Icon size={16} className={config.text} />
                                                </div>

                                                {/* Content */}
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className={`px-2 py-0.5 rounded text-xs font-bold ${config.bg} ${config.text}`}>
                                                            {notification.severity}
                                                        </span>
                                                        {!notification.read && (
                                                            <span className="w-2 h-2 bg-accent-teal rounded-full" />
                                                        )}
                                                    </div>
                                                    
                                                    <p className="text-sm text-text-primary font-medium mb-1">
                                                        {notification.threat_type}
                                                    </p>
                                                    
                                                    <p className="text-xs text-text-secondary mb-2">
                                                        {notification.message}
                                                    </p>

                                                    {notification.source_ip && (
                                                        <p className="text-xs text-text-secondary font-mono mb-2">
                                                            Source: {notification.source_ip}
                                                        </p>
                                                    )}

                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-3 text-xs text-text-secondary">
                                                            <span className="flex items-center gap-1">
                                                                <Clock size={12} />
                                                                {formatTimeAgo(notification.timestamp)}
                                                            </span>
                                                            <span className={`font-semibold ${
                                                                notification.ai_confidence >= 0.8 ? 'text-green-400' :
                                                                notification.ai_confidence >= 0.6 ? 'text-yellow-400' : 'text-orange-400'
                                                            }`}>
                                                                {(notification.ai_confidence * 100).toFixed(0)}% confidence
                                                            </span>
                                                        </div>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                removeNotification(notification.id);
                                                            }}
                                                            className="p-1 hover:bg-dark-bg rounded transition-colors"
                                                        >
                                                            <X size={14} className="text-text-secondary" />
                                                        </button>
                                                    </div>

                                                    {notification.recommended_action && (
                                                        <div className="mt-2 px-2 py-1 bg-accent-teal/10 rounded text-xs text-accent-teal">
                                                            → {notification.recommended_action}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Footer Actions */}
                    {notifications.length > 0 && (
                        <div className="border-t border-accent-teal/10 p-3 bg-dark-bg flex gap-2">
                            {unreadCount > 0 && (
                                <button
                                    onClick={markAllAsRead}
                                    className="flex-1 px-3 py-2 bg-accent-teal/10 hover:bg-accent-teal/20 border border-accent-teal/30 rounded-lg text-accent-teal text-xs font-medium transition-all"
                                >
                                    Mark All Read
                                </button>
                            )}
                            <button
                                onClick={clearAll}
                                className="flex-1 px-3 py-2 bg-dark-surface hover:bg-dark-surface/70 border border-accent-teal/20 rounded-lg text-text-secondary text-xs font-medium transition-all"
                            >
                                Clear All
                            </button>
                        </div>
                    )}
                </div>
            )}

            <style>{`
                @keyframes slideInRight {
                    from {
                        opacity: 0;
                        transform: translateX(20px);
                    }
                    to {
                        opacity: 1;
                        transform: translateX(0);
                    }
                }
            `}</style>
        </>
    );
};

export default NotificationBell;
