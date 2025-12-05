// ============================================
// IPLookupPanel - IP Address Reputation Search
// ============================================

import React, { useState } from 'react';
import { Search, Globe, Shield, Wifi } from 'lucide-react';

interface IPLookupPanelProps {
    onSearch: (ip: string) => Promise<void>;
    loading: boolean;
}

const IPLookupPanel: React.FC<IPLookupPanelProps> = ({ onSearch, loading }) => {
    const [ip, setIp] = useState('');
    const [error, setError] = useState<string | null>(null);

    // Validate IPv4 format
    const isValidIP = (input: string): boolean => {
        const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
        if (!ipv4Regex.test(input)) return false;
        const parts = input.split('.');
        return parts.every(part => parseInt(part) >= 0 && parseInt(part) <= 255);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!ip.trim()) {
            setError('Please enter an IP address');
            return;
        }

        if (!isValidIP(ip.trim())) {
            setError('Please enter a valid IPv4 address (e.g., 192.168.1.1)');
            return;
        }

        await onSearch(ip.trim());
    };

    const quickLookup = async (quickIp: string) => {
        setIp(quickIp);
        setError(null);
        await onSearch(quickIp);
    };

    // Common IPs for quick lookup
    const commonIPs = [
        { ip: '8.8.8.8', label: 'Google DNS', safe: true },
        { ip: '1.1.1.1', label: 'Cloudflare', safe: true },
        { ip: '208.67.222.222', label: 'OpenDNS', safe: true },
    ];

    return (
        <div className="bg-dark-surface rounded-xl border border-accent-teal/20 overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-accent-teal/10 to-transparent p-6 border-b border-accent-teal/10">
                <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-accent-teal/10 rounded-lg">
                        <Globe size={24} className="text-accent-teal" />
                    </div>
                    <h2 className="text-xl font-bold text-text-primary">
                        IP Address Reputation Lookup
                    </h2>
                </div>
                <p className="text-text-secondary text-sm">
                    Check IP reputation against AbuseIPDB, VirusTotal, and threat intelligence feeds
                </p>
            </div>

            {/* Search Form */}
            <div className="p-6">
                <form onSubmit={handleSubmit} className="flex gap-3">
                    <div className="flex-1 relative">
                        <input
                            type="text"
                            placeholder="Enter IPv4 address (e.g., 192.168.1.1)"
                            value={ip}
                            onChange={(e) => {
                                setIp(e.target.value);
                                setError(null);
                            }}
                            disabled={loading}
                            className="w-full bg-dark-bg border border-accent-teal/20 rounded-lg px-4 py-3.5 pl-12 text-text-primary placeholder-text-secondary/50 font-mono focus:outline-none focus:border-accent-teal focus:ring-2 focus:ring-accent-teal/20 disabled:opacity-50 transition-all"
                        />
                        <Search size={20} className="absolute left-4 top-4 text-text-secondary" />
                    </div>

                    <button
                        type="submit"
                        disabled={loading || !ip.trim()}
                        className="px-8 py-3.5 bg-gradient-to-r from-accent-teal to-accent-teal/80 hover:from-accent-teal/90 hover:to-accent-teal/70 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-dark-bg font-bold transition-all shadow-lg shadow-accent-teal/20 flex items-center gap-2"
                    >
                        {loading ? (
                            <>
                                <div className="w-4 h-4 border-2 border-dark-bg/30 border-t-dark-bg rounded-full animate-spin" />
                                Searching...
                            </>
                        ) : (
                            <>
                                <Shield size={18} />
                                Check Reputation
                            </>
                        )}
                    </button>
                </form>

                {/* Error Message */}
                {error && (
                    <div className="mt-3 px-4 py-2 bg-red-500/10 border border-red-500/30 rounded-lg">
                        <p className="text-red-400 text-sm">{error}</p>
                    </div>
                )}

                {/* Quick Lookup */}
                <div className="mt-6 pt-6 border-t border-accent-teal/10">
                    <p className="text-text-secondary text-sm mb-3 flex items-center gap-2">
                        <Wifi size={14} />
                        Quick lookup (known safe IPs):
                    </p>
                    <div className="flex gap-2 flex-wrap">
                        {commonIPs.map((item) => (
                            <button
                                key={item.ip}
                                onClick={() => quickLookup(item.ip)}
                                disabled={loading}
                                className="group px-4 py-2 bg-dark-bg hover:bg-accent-teal/10 border border-accent-teal/20 hover:border-accent-teal/40 rounded-lg text-text-secondary hover:text-accent-teal transition-all disabled:opacity-50"
                            >
                                <span className="font-mono text-sm">{item.ip}</span>
                                <span className="text-xs ml-2 opacity-60 group-hover:opacity-100">
                                    ({item.label})
                                </span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default IPLookupPanel;
