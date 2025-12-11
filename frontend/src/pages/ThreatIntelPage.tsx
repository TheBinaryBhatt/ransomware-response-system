// ============================================
// ThreatIntelPage - Threat Intelligence Dashboard
// ============================================

import React, { useState, useCallback } from 'react';
import {
    Shield,
    Globe,
    FileSearch,
    AlertTriangle,
    Zap,
    Search
} from 'lucide-react';
import { threatIntelApi } from '../services/api';
import { IPLookupPanel, HashLookupPanel, ThreatResults } from '../components/ThreatIntel';
import type { IPReputation, FileHash } from '../types/threatintel';
import AnimatedBackground from '../components/Common/AnimatedBackground';

type TabType = 'ip' | 'hash';

const ThreatIntelPage: React.FC = () => {
    const [activeTab, setActiveTab] = useState<TabType>('ip');
    const [searchResults, setSearchResults] = useState<IPReputation | FileHash | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [searchHistory, setSearchHistory] = useState<Array<{ type: TabType; query: string; timestamp: Date }>>([]);

    // Handle IP lookup
    const handleIPSearch = useCallback(async (ip: string) => {
        setLoading(true);
        setError(null);

        try {
            const response = await threatIntelApi.lookupIP(ip);
            setSearchResults(response);
            setSearchHistory(prev => [
                { type: 'ip', query: ip, timestamp: new Date() },
                ...prev.slice(0, 9)
            ]);
        } catch (err: unknown) {
            console.error('IP lookup failed:', err);
            const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
            setError(errorMessage);

            // Create mock data for demonstration if API fails
            const mockData: IPReputation = {
                ip_address: ip,
                is_whitelisted: ip.startsWith('8.8') || ip.startsWith('1.1'),
                abuse_confidence_score: ip.startsWith('8.8') ? 0 : ip.startsWith('1.1') ? 5 : Math.floor(Math.random() * 100),
                total_reports: ip.startsWith('8.8') || ip.startsWith('1.1') ? 0 : Math.floor(Math.random() * 50),
                last_reported_at: new Date().toISOString(),
                threat_types: ip.startsWith('8.8') || ip.startsWith('1.1') ? [] : ['Spam', 'Brute Force'],
                country_code: 'US',
                country_name: 'United States',
                is_vpn: false,
                is_proxy: false,
                is_tor: false,
                is_datacenter: true,
                usage_type: 'Data Center/Web Hosting/Transit',
                isp_name: ip.startsWith('8.8') ? 'Google LLC' : ip.startsWith('1.1') ? 'Cloudflare, Inc.' : 'Unknown ISP',
                domain_name: ip.startsWith('8.8') ? 'google.com' : ip.startsWith('1.1') ? 'cloudflare.com' : undefined,
            };

            setSearchResults(mockData);
            setSearchHistory(prev => [
                { type: 'ip', query: ip, timestamp: new Date() },
                ...prev.slice(0, 9)
            ]);
        } finally {
            setLoading(false);
        }
    }, []);

    // Handle Hash lookup
    const handleHashSearch = useCallback(async (hash: string) => {
        setLoading(true);
        setError(null);

        try {
            const response = await threatIntelApi.lookupHash(hash);
            setSearchResults(response);
            setSearchHistory(prev => [
                { type: 'hash', query: hash, timestamp: new Date() },
                ...prev.slice(0, 9)
            ]);
        } catch (err: unknown) {
            console.error('Hash lookup failed:', err);
            const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
            setError(errorMessage);

            // Create mock data for demonstration if API fails
            const isEicar = hash.toLowerCase().includes('44d88612');
            const mockData: FileHash = {
                file_hash: hash,
                hash_type: hash.length === 32 ? 'MD5' : hash.length === 40 ? 'SHA1' : 'SHA256',
                sha256: hash.length === 64 ? hash : 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
                md5: hash.length === 32 ? hash : '44d88612fea8a8f36de82e1278abb02f',
                sha1: hash.length === 40 ? hash : '3395856ce81f2b7382dee72602f798b642f14140',
                file_name: isEicar ? 'eicar_test_file.com' : 'unknown_sample.exe',
                file_size: 68,
                file_type: 'executable',
                magic: 'ASCII text, with no line terminators',
                threat_level: isEicar ? 'MALICIOUS' : 'CLEAN',
                threat_score: isEicar ? 100 : 0,
                threat_names: isEicar ? ['EICAR-Test-File', 'Test.File.EICAR'] : [],
                first_seen: '2024-01-15T10:30:00Z',
                last_seen: new Date().toISOString(),
                reporter_count: isEicar ? 75 : 0,
            };

            setSearchResults(mockData);
            setSearchHistory(prev => [
                { type: 'hash', query: hash, timestamp: new Date() },
                ...prev.slice(0, 9)
            ]);
        } finally {
            setLoading(false);
        }
    }, []);

    // Handle tab change
    const handleTabChange = (tab: TabType) => {
        setActiveTab(tab);
        setSearchResults(null);
        setError(null);
    };

    return (
        <div className="min-h-screen relative overflow-hidden" style={{
            background: 'radial-gradient(ellipse at center, #0a1628 0%, #020817 100%)'
        }}>
            {/* Animated Network Background */}
            <AnimatedBackground opacity={0.3} lineCount={6} nodeCount={10} starCount={40} />

            {/* Content */}
            <div className="relative z-10">
                {/* Page Header */}
                <div className="border-b border-blue-500/10" style={{
                    backgroundColor: 'rgba(37, 39, 39, 0.6)',
                    backdropFilter: 'blur(10px)'
                }}>
                    <div className="px-6 py-6">
                        {/* Title Row */}
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="p-2 bg-gradient-to-br from-accent-teal/20 to-purple-500/20 rounded-lg">
                                        <Shield size={24} className="text-accent-teal" />
                                    </div>
                                    <h1 className="text-3xl font-bold text-text-primary">
                                        Threat Intelligence
                                    </h1>
                                </div>
                                <p className="text-text-secondary">
                                    IP reputation lookups and file hash malware analysis
                                </p>
                            </div>

                            {/* Quick Stats */}
                            <div className="flex items-center gap-4">
                                <div className="text-right">
                                    <p className="text-text-secondary text-xs">Lookups Today</p>
                                    <p className="text-text-primary text-lg font-bold">{searchHistory.length}</p>
                                </div>
                                <div className="w-px h-10 bg-accent-teal/20" />
                                <div className="flex items-center gap-2 px-4 py-2 bg-accent-teal/10 rounded-lg">
                                    <Zap size={16} className="text-accent-teal" />
                                    <span className="text-accent-teal font-medium text-sm">Real-time Analysis</span>
                                </div>
                            </div>
                        </div>

                        {/* Tabs */}
                        <div className="flex gap-2">
                            <button
                                onClick={() => handleTabChange('ip')}
                                className={`flex items-center gap-2 px-6 py-3 rounded-t-lg font-semibold transition-all ${activeTab === 'ip'
                                    ? 'bg-dark-bg text-accent-teal border border-accent-teal/30 border-b-0'
                                    : 'text-text-secondary hover:text-text-primary hover:bg-dark-bg/50'
                                    }`}
                            >
                                <Globe size={18} />
                                IP Reputation
                            </button>
                            <button
                                onClick={() => handleTabChange('hash')}
                                className={`flex items-center gap-2 px-6 py-3 rounded-t-lg font-semibold transition-all ${activeTab === 'hash'
                                    ? 'bg-dark-bg text-purple-400 border border-purple-500/30 border-b-0'
                                    : 'text-text-secondary hover:text-text-primary hover:bg-dark-bg/50'
                                    }`}
                            >
                                <FileSearch size={18} />
                                File Hash Analysis
                            </button>
                        </div>
                    </div>
                </div>

                {/* Main Content */}
                <div className="p-6 max-w-7xl mx-auto">
                    {/* Search Panel */}
                    <div className="mb-8">
                        {activeTab === 'ip' ? (
                            <IPLookupPanel onSearch={handleIPSearch} loading={loading} />
                        ) : (
                            <HashLookupPanel onSearch={handleHashSearch} loading={loading} />
                        )}
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-6">
                            <div className="flex items-start gap-3">
                                <AlertTriangle size={20} className="text-red-400 shrink-0 mt-0.5" />
                                <div>
                                    <p className="text-red-400 font-medium">Lookup Error</p>
                                    <p className="text-red-400/70 text-sm mt-1">{error}</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setError(null)}
                                className="mt-3 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 rounded-lg text-red-400 text-sm font-medium transition-colors"
                            >
                                Dismiss
                            </button>
                        </div>
                    )}

                    {/* Results */}
                    {searchResults && (
                        <ThreatResults
                            data={searchResults}
                            type={activeTab}
                            loading={loading}
                        />
                    )}

                    {/* Empty State */}
                    {!searchResults && !loading && !error && (
                        <div className="text-center py-16 bg-dark-surface rounded-xl border border-accent-teal/10">
                            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-accent-teal/10 to-purple-500/10 mb-6">
                                <Search size={40} className="text-accent-teal/60" />
                            </div>
                            <h3 className="text-xl font-semibold text-text-primary mb-2">
                                {activeTab === 'ip'
                                    ? 'Enter an IP address to check its reputation'
                                    : 'Enter a file hash to analyze for malware'}
                            </h3>
                            <p className="text-text-secondary max-w-md mx-auto">
                                {activeTab === 'ip'
                                    ? 'Check IP addresses against AbuseIPDB, VirusTotal, and other threat intelligence sources'
                                    : 'Analyze MD5, SHA1, or SHA256 hashes against MalwareBazaar and threat databases'}
                            </p>
                        </div>
                    )}

                    {/* Recent Searches */}
                    {searchHistory.length > 0 && (
                        <div className="mt-8 bg-dark-surface rounded-xl border border-accent-teal/10 p-5">
                            <h3 className="text-sm font-semibold text-text-primary uppercase tracking-wider mb-4">
                                Recent Searches
                            </h3>
                            <div className="flex flex-wrap gap-2">
                                {searchHistory.map((item, i) => (
                                    <button
                                        key={i}
                                        onClick={() => {
                                            setActiveTab(item.type);
                                            if (item.type === 'ip') {
                                                handleIPSearch(item.query);
                                            } else {
                                                handleHashSearch(item.query);
                                            }
                                        }}
                                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-all ${item.type === 'ip'
                                            ? 'bg-accent-teal/10 hover:bg-accent-teal/20 text-accent-teal border border-accent-teal/20'
                                            : 'bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 border border-purple-500/20'
                                            }`}
                                    >
                                        {item.type === 'ip' ? <Globe size={12} /> : <FileSearch size={12} />}
                                        <span className="font-mono text-xs">{item.query.length > 20 ? `${item.query.slice(0, 20)}...` : item.query}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ThreatIntelPage;
