// ============================================
// NOTIFICATION BELL - Real-time Analyst Alerts
// ============================================

import React, { useState, useEffect, useRef } from 'react';
import { Bell, X, AlertTriangle, Shield, Clock, ShieldOff } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useWebSocket } from '../../hooks/useWebSocket';
import { SECURITY_WS_EVENTS, ATTACK_TYPES } from '../../utils/constants';
import { securityApi } from '../../services/api';

interface ThreatNotification {
    id: string;
    incident_id: string;
    severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
    ai_confidence: number;
    threat_type: string;
    attack_type?: string;  // For security events
    source_ip?: string;
    message: string;
    timestamp: string;
    read: boolean;
    recommended_action?: string;
    is_security_alert?: boolean;  // Flag for security middleware alerts
    can_quarantine?: boolean;  // Show quarantine action
}

const NotificationBell: React.FC = () => {
    const [notifications, setNotifications] = useState<ThreatNotification[]>([]);
    const [showDrawer, setShowDrawer] = useState(false);
    const [filter, setFilter] = useState<'all' | 'unread' | 'critical' | 'security'>('all');
    const [quarantining, setQuarantining] = useState<string | null>(null);
    const drawerRef = useRef<HTMLDivElement>(null);
    const audioRef = useRef<HTMLAudioElement>(null);
    const navigate = useNavigate();
    const { on } = useWebSocket();

    // Get attack type label
    const getAttackTypeLabel = (attackType: string): string => {
        const attackTypeEntry = Object.values(ATTACK_TYPES).find(at => at.value === attackType);
        return attackTypeEntry?.label || attackType.replace(/_/g, ' ').toUpperCase();
    };

    // Handle quarantine action
    const handleQuarantine = async (notification: ThreatNotification, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!notification.source_ip) return;

        setQuarantining(notification.id);
        try {
            await securityApi.quarantineIP({
                ip_address: notification.source_ip,
                reason: `${notification.threat_type || notification.attack_type} - via notification`,
                attack_type: notification.attack_type || 'manual',
                threat_level: notification.severity === 'CRITICAL' ? 'critical' :
                    notification.severity === 'HIGH' ? 'high' : 'medium',
            });

            // Update notification to show quarantined
            setNotifications(prev => prev.map(n =>
                n.id === notification.id
                    ? { ...n, recommended_action: `✓ IP ${notification.source_ip} quarantined`, can_quarantine: false }
                    : n
            ));
        } catch (error) {
            console.error('Failed to quarantine IP:', error);
            setNotifications(prev => prev.map(n =>
                n.id === notification.id
                    ? { ...n, recommended_action: `⚠️ Quarantine failed - try manually` }
                    : n
            ));
        } finally {
            setQuarantining(null);
        }
    };

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
                    threat_type: data.threat_type || data.description || 'Unknown Threat',
                    attack_type: data.attack_type,
                    source_ip: data.source_ip,
                    message: data.message || `${data.severity} threat detected`,
                    timestamp: new Date().toISOString(),
                    read: false,
                    recommended_action: data.recommended_action,
                    is_security_alert: false,
                    can_quarantine: !!data.source_ip,
                };

                setNotifications(prev => [notification, ...prev]);

                // Play sound for critical alerts
                if (data.severity === 'CRITICAL' && audioRef.current) {
                    audioRef.current.play().catch(err => console.log('Audio play failed:', err));
                }
            }
        };

        // Handle security attack events
        const handleSecurityAlert = (data: any) => {
            console.log('[NotificationBell] 🛡️ Security alert received:', data);

            const severityMap: Record<string, 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'> = {
                'critical': 'CRITICAL',
                'high': 'HIGH',
                'medium': 'MEDIUM',
                'low': 'LOW',
            };

            const severity = severityMap[data.threat_level?.toLowerCase()] ||
                data.severity || 'HIGH';

            const notification: ThreatNotification = {
                id: `security-${Date.now()}-${Math.random()}`,
                incident_id: data.incident_id || '',
                severity,
                ai_confidence: 0.95,  // Security middleware has high confidence
                threat_type: getAttackTypeLabel(data.attack_type || 'unknown'),
                attack_type: data.attack_type,
                source_ip: data.source_ip,
                message: data.description || `🛡️ ${data.attack_type?.replace(/_/g, ' ')} attack detected from ${data.source_ip || 'unknown IP'}`,
                timestamp: data.timestamp || new Date().toISOString(),
                read: false,
                recommended_action: data.recommended_action ||
                    (severity === 'CRITICAL' ? 'Immediate action: Quarantine IP' : 'Review and investigate'),
                is_security_alert: true,
                can_quarantine: !!data.source_ip,
            };

            setNotifications(prev => [notification, ...prev]);

            // Always play sound for security alerts
            if (audioRef.current) {
                audioRef.current.play().catch(err => console.log('Audio play failed:', err));
            }
        };

        // Handle IP quarantined events
        const handleIPQuarantined = (data: any) => {
            console.log('[NotificationBell] IP quarantined:', data);
            const notification: ThreatNotification = {
                id: `quarantine-${Date.now()}`,
                incident_id: data.incident_id || '',
                severity: 'HIGH',
                ai_confidence: 1.0,
                threat_type: 'IP Quarantined',
                attack_type: data.attack_type,
                source_ip: data.ip,
                message: `IP ${data.ip} has been quarantined (${data.reason || data.attack_type})`,
                timestamp: data.timestamp || new Date().toISOString(),
                read: false,
                recommended_action: `Quarantined by ${data.quarantined_by || 'system'}`,
                is_security_alert: true,
                can_quarantine: false,
            };
            setNotifications(prev => [notification, ...prev]);
        };

        const unsubIncident = on('incident.received', handleNewIncident);
        const unsubTriaged = on('incident.triaged', handleNewIncident);
        const unsubSecurityAttack = on(SECURITY_WS_EVENTS.ATTACK_DETECTED, handleSecurityAlert);
        const unsubQuarantined = on(SECURITY_WS_EVENTS.IP_QUARANTINED, handleIPQuarantined);
        const unsubBruteForce = on(SECURITY_WS_EVENTS.BRUTE_FORCE_DETECTED, handleSecurityAlert);
        const unsubSqli = on(SECURITY_WS_EVENTS.SQLI_DETECTED, handleSecurityAlert);
        const unsubSsrf = on(SECURITY_WS_EVENTS.SSRF_BLOCKED, handleSecurityAlert);

        return () => {
            unsubIncident?.();
            unsubTriaged?.();
            unsubSecurityAttack?.();
            unsubQuarantined?.();
            unsubBruteForce?.();
            unsubSqli?.();
            unsubSsrf?.();
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
        if (filter === 'security') return n.is_security_alert;
        return true;
    });

    const securityCount = notifications.filter(n => n.is_security_alert && !n.read).length;

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
                        <div className="flex gap-2 flex-wrap">
                            {(['all', 'unread', 'critical', 'security'] as const).map(f => (
                                <button
                                    key={f}
                                    onClick={() => setFilter(f)}
                                    className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${filter === f
                                        ? f === 'security'
                                            ? 'bg-purple-500 text-white'
                                            : 'bg-accent-teal text-dark-bg'
                                        : 'bg-dark-bg text-text-secondary hover:bg-dark-bg/70'
                                        }`}
                                >
                                    {f === 'security' ? '🛡️ Security' : f.charAt(0).toUpperCase() + f.slice(1)}
                                    {f === 'unread' && unreadCount > 0 && ` (${unreadCount})`}
                                    {f === 'critical' && criticalCount > 0 && ` (${criticalCount})`}
                                    {f === 'security' && securityCount > 0 && ` (${securityCount})`}
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
                                            className={`p-4 hover:bg-dark-bg/50 transition-colors cursor-pointer ${!notification.read ? 'bg-accent-teal/5' : ''
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
                                                            <span className={`font-semibold ${notification.ai_confidence >= 0.8 ? 'text-green-400' :
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

                                                    {/* Quick Quarantine Button */}
                                                    {notification.can_quarantine && notification.source_ip && (
                                                        <button
                                                            onClick={(e) => handleQuarantine(notification, e)}
                                                            disabled={quarantining === notification.id}
                                                            className={`mt-2 w-full px-3 py-2 rounded-lg text-xs font-medium flex items-center justify-center gap-2 transition-all ${quarantining === notification.id
                                                                ? 'bg-gray-500/20 text-gray-400 cursor-wait'
                                                                : 'bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30'
                                                                }`}
                                                        >
                                                            <ShieldOff size={14} />
                                                            {quarantining === notification.id
                                                                ? 'Quarantining...'
                                                                : `Quarantine IP ${notification.source_ip}`}
                                                        </button>
                                                    )}

                                                    {/* Security Alert Badge */}
                                                    {notification.is_security_alert && (
                                                        <div className="mt-2 flex items-center gap-1 text-xs text-purple-400">
                                                            <Shield size={12} />
                                                            Security Middleware Alert
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
