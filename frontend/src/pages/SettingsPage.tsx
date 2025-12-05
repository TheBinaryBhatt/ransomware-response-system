// ============================================
// SettingsPage - Application Configuration
// ============================================

import React, { useState } from 'react';
import {
    Settings,
    User,
    Bell,
    Shield,
    Key,
    Save,
    Moon,
    Sun,
    Globe,
    Clock,
    Mail,
    Slack,
    Smartphone,
    LogOut
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

type TabType = 'general' | 'profile' | 'notifications' | 'security' | 'api';

const SettingsPage: React.FC = () => {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState<TabType>('general');
    const [loading, setLoading] = useState(false);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    // Mock Settings State
    const [settings, setSettings] = useState({
        theme: 'dark',
        language: 'en',
        timezone: 'UTC',
        emailAlerts: true,
        slackIntegration: false,
        mfaEnabled: true,
        sessionTimeout: 30
    });

    const handleSave = () => {
        setLoading(true);
        // Simulate API call
        setTimeout(() => {
            setLoading(false);
            setSuccessMessage('Settings saved successfully');
            setTimeout(() => setSuccessMessage(null), 3000);
        }, 1000);
    };

    const toggleSetting = (key: keyof typeof settings) => {
        setSettings(prev => ({
            ...prev,
            [key]: !prev[key]
        }));
    };

    const renderTabContent = () => {
        switch (activeTab) {
            case 'general':
                return (
                    <div className="space-y-6">
                        <div className="bg-dark-surface p-6 rounded-xl border border-accent-teal/10">
                            <h3 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
                                <Moon size={20} className="text-accent-teal" />
                                Appearance
                            </h3>
                            <div className="flex items-center justify-between p-4 bg-dark-bg rounded-lg border border-accent-teal/5">
                                <div>
                                    <p className="text-text-primary font-medium">Theme Mode</p>
                                    <p className="text-text-secondary text-sm">Select your preferred interface theme</p>
                                </div>
                                <div className="flex bg-dark-surface p-1 rounded-lg border border-accent-teal/10">
                                    <button
                                        onClick={() => setSettings({ ...settings, theme: 'light' })}
                                        className={`p-2 rounded-md transition-all ${settings.theme === 'light' ? 'bg-accent-teal text-dark-bg' : 'text-text-secondary hover:text-text-primary'}`}
                                    >
                                        <Sun size={18} />
                                    </button>
                                    <button
                                        onClick={() => setSettings({ ...settings, theme: 'dark' })}
                                        className={`p-2 rounded-md transition-all ${settings.theme === 'dark' ? 'bg-accent-teal text-dark-bg' : 'text-text-secondary hover:text-text-primary'}`}
                                    >
                                        <Moon size={18} />
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="bg-dark-surface p-6 rounded-xl border border-accent-teal/10">
                            <h3 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
                                <Globe size={20} className="text-accent-teal" />
                                Localization
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-text-secondary text-sm mb-2">Language</label>
                                    <select
                                        value={settings.language}
                                        onChange={(e) => setSettings({ ...settings, language: e.target.value })}
                                        className="w-full bg-dark-bg border border-accent-teal/20 rounded-lg px-4 py-2 text-text-primary focus:outline-none focus:border-accent-teal"
                                    >
                                        <option value="en">English (US)</option>
                                        <option value="es">Spanish</option>
                                        <option value="fr">French</option>
                                        <option value="de">German</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-text-secondary text-sm mb-2">Timezone</label>
                                    <div className="relative">
                                        <Clock size={16} className="absolute left-3 top-3 text-text-secondary" />
                                        <select
                                            value={settings.timezone}
                                            onChange={(e) => setSettings({ ...settings, timezone: e.target.value })}
                                            className="w-full bg-dark-bg border border-accent-teal/20 rounded-lg pl-10 pr-4 py-2 text-text-primary focus:outline-none focus:border-accent-teal"
                                        >
                                            <option value="UTC">UTC (Coordinated Universal Time)</option>
                                            <option value="EST">EST (Eastern Standard Time)</option>
                                            <option value="PST">PST (Pacific Standard Time)</option>
                                            <option value="IST">IST (Indian Standard Time)</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                );

            case 'profile':
                return (
                    <div className="space-y-6">
                        <div className="bg-dark-surface p-6 rounded-xl border border-accent-teal/10">
                            <div className="flex items-center gap-6 mb-8">
                                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-accent-teal to-purple-500 flex items-center justify-center text-3xl font-bold text-white">
                                    {user?.username?.charAt(0).toUpperCase() || 'A'}
                                </div>
                                <div>
                                    <h3 className="text-2xl font-bold text-text-primary">{user?.full_name || 'Admin User'}</h3>
                                    <p className="text-text-secondary">{user?.role || 'Administrator'}</p>
                                    <p className="text-text-secondary text-sm mt-1">{user?.email || 'admin@example.com'}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-text-secondary text-sm mb-2">Username</label>
                                    <input
                                        type="text"
                                        value={user?.username || ''}
                                        disabled
                                        className="w-full bg-dark-bg/50 border border-accent-teal/10 rounded-lg px-4 py-2 text-text-secondary cursor-not-allowed"
                                    />
                                </div>
                                <div>
                                    <label className="block text-text-secondary text-sm mb-2">Email</label>
                                    <input
                                        type="email"
                                        value={user?.email || ''}
                                        disabled
                                        className="w-full bg-dark-bg/50 border border-accent-teal/10 rounded-lg px-4 py-2 text-text-secondary cursor-not-allowed"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                );

            case 'notifications':
                return (
                    <div className="space-y-6">
                        <div className="bg-dark-surface p-6 rounded-xl border border-accent-teal/10">
                            <h3 className="text-lg font-semibold text-text-primary mb-4">Alert Channels</h3>
                            <div className="space-y-4">
                                <div className="flex items-center justify-between p-4 bg-dark-bg rounded-lg border border-accent-teal/5">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-blue-500/10 rounded-lg">
                                            <Mail size={20} className="text-blue-400" />
                                        </div>
                                        <div>
                                            <p className="text-text-primary font-medium">Email Notifications</p>
                                            <p className="text-text-secondary text-sm">Receive critical alerts via email</p>
                                        </div>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={settings.emailAlerts}
                                            onChange={() => toggleSetting('emailAlerts')}
                                            className="sr-only peer"
                                        />
                                        <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent-teal"></div>
                                    </label>
                                </div>

                                <div className="flex items-center justify-between p-4 bg-dark-bg rounded-lg border border-accent-teal/5">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-purple-500/10 rounded-lg">
                                            <Slack size={20} className="text-purple-400" />
                                        </div>
                                        <div>
                                            <p className="text-text-primary font-medium">Slack Integration</p>
                                            <p className="text-text-secondary text-sm">Post incidents to Slack channels</p>
                                        </div>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={settings.slackIntegration}
                                            onChange={() => toggleSetting('slackIntegration')}
                                            className="sr-only peer"
                                        />
                                        <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent-teal"></div>
                                    </label>
                                </div>
                            </div>
                        </div>
                    </div>
                );

            case 'security':
                return (
                    <div className="space-y-6">
                        <div className="bg-dark-surface p-6 rounded-xl border border-accent-teal/10">
                            <h3 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
                                <Shield size={20} className="text-accent-teal" />
                                Account Security
                            </h3>
                            <div className="space-y-4">
                                <div className="flex items-center justify-between p-4 bg-dark-bg rounded-lg border border-accent-teal/5">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-green-500/10 rounded-lg">
                                            <Smartphone size={20} className="text-green-400" />
                                        </div>
                                        <div>
                                            <p className="text-text-primary font-medium">Two-Factor Authentication</p>
                                            <p className="text-text-secondary text-sm">Secure your account with 2FA</p>
                                        </div>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={settings.mfaEnabled}
                                            onChange={() => toggleSetting('mfaEnabled')}
                                            className="sr-only peer"
                                        />
                                        <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent-teal"></div>
                                    </label>
                                </div>

                                <div className="flex items-center justify-between p-4 bg-dark-bg rounded-lg border border-accent-teal/5">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-red-500/10 rounded-lg">
                                            <LogOut size={20} className="text-red-400" />
                                        </div>
                                        <div>
                                            <p className="text-text-primary font-medium">Session Timeout</p>
                                            <p className="text-text-secondary text-sm">Auto-logout after inactivity</p>
                                        </div>
                                    </div>
                                    <select
                                        value={settings.sessionTimeout}
                                        onChange={(e) => setSettings({ ...settings, sessionTimeout: Number(e.target.value) })}
                                        className="bg-dark-surface border border-accent-teal/20 rounded-lg px-3 py-1 text-text-primary text-sm focus:outline-none focus:border-accent-teal"
                                    >
                                        <option value={15}>15 minutes</option>
                                        <option value={30}>30 minutes</option>
                                        <option value={60}>1 hour</option>
                                        <option value={120}>2 hours</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>
                );

            case 'api':
                return (
                    <div className="space-y-6">
                        <div className="bg-dark-surface p-6 rounded-xl border border-accent-teal/10">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-lg font-semibold text-text-primary flex items-center gap-2">
                                    <Key size={20} className="text-accent-teal" />
                                    API Keys
                                </h3>
                                <button className="px-4 py-2 bg-accent-teal/10 hover:bg-accent-teal/20 text-accent-teal rounded-lg text-sm font-medium transition-colors">
                                    Generate New Key
                                </button>
                            </div>

                            <div className="space-y-3">
                                <div className="p-4 bg-dark-bg rounded-lg border border-accent-teal/5 flex items-center justify-between">
                                    <div>
                                        <p className="text-text-primary font-mono text-sm">rrs_live_8x92...k92m</p>
                                        <p className="text-text-secondary text-xs mt-1">Created on Dec 01, 2025 • Read/Write</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="px-2 py-1 bg-green-500/10 text-green-400 text-xs rounded">Active</span>
                                        <button className="text-red-400 hover:text-red-300 text-sm">Revoke</button>
                                    </div>
                                </div>
                                <div className="p-4 bg-dark-bg rounded-lg border border-accent-teal/5 flex items-center justify-between opacity-60">
                                    <div>
                                        <p className="text-text-primary font-mono text-sm">rrs_test_4k21...m83p</p>
                                        <p className="text-text-secondary text-xs mt-1">Created on Nov 15, 2025 • Read Only</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="px-2 py-1 bg-gray-500/10 text-gray-400 text-xs rounded">Revoked</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                );

            default:
                return null;
        }
    };

    return (
        <div className="min-h-screen bg-dark-bg">
            {/* Header */}
            <div className="bg-gradient-to-r from-dark-surface via-dark-surface to-dark-bg border-b border-accent-teal/10">
                <div className="px-6 py-6">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-gradient-to-br from-accent-teal/20 to-purple-500/20 rounded-lg">
                                <Settings size={24} className="text-accent-teal" />
                            </div>
                            <div>
                                <h1 className="text-3xl font-bold text-text-primary">Settings</h1>
                                <p className="text-text-secondary">Manage application configuration and preferences</p>
                            </div>
                        </div>
                        <button
                            onClick={handleSave}
                            disabled={loading}
                            className="flex items-center gap-2 px-6 py-2 bg-accent-teal hover:bg-accent-teal/90 text-dark-bg font-bold rounded-lg transition-all disabled:opacity-50"
                        >
                            {loading ? (
                                <div className="w-5 h-5 border-2 border-dark-bg border-t-transparent rounded-full animate-spin" />
                            ) : (
                                <Save size={18} />
                            )}
                            Save Changes
                        </button>
                    </div>

                    {/* Tabs */}
                    <div className="flex gap-2 overflow-x-auto pb-1">
                        {[
                            { id: 'general', label: 'General', icon: Settings },
                            { id: 'profile', label: 'Profile', icon: User },
                            { id: 'notifications', label: 'Notifications', icon: Bell },
                            { id: 'security', label: 'Security', icon: Shield },
                            { id: 'api', label: 'API Keys', icon: Key },
                        ].map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as TabType)}
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all whitespace-nowrap ${activeTab === tab.id
                                        ? 'bg-accent-teal/10 text-accent-teal border border-accent-teal/20'
                                        : 'text-text-secondary hover:text-text-primary hover:bg-dark-surface'
                                    }`}
                            >
                                <tab.icon size={16} />
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="p-6 max-w-4xl mx-auto">
                {successMessage && (
                    <div className="mb-6 p-4 bg-green-500/10 border border-green-500/20 rounded-lg text-green-400 flex items-center gap-2 animate-fade-in">
                        <div className="w-2 h-2 bg-green-400 rounded-full" />
                        {successMessage}
                    </div>
                )}

                <div className="animate-fade-in">
                    {renderTabContent()}
                </div>
            </div>
        </div>
    );
};

export default SettingsPage;
