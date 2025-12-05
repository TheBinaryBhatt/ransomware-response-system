// ============================================
// HashLookupPanel - File Hash Malware Analysis
// ============================================

import React, { useState } from 'react';
import { Search, FileSearch, Hash, AlertCircle } from 'lucide-react';

interface HashLookupPanelProps {
    onSearch: (hash: string) => Promise<void>;
    loading: boolean;
}

const HashLookupPanel: React.FC<HashLookupPanelProps> = ({ onSearch, loading }) => {
    const [hash, setHash] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [hashType, setHashType] = useState<string | null>(null);

    // Detect hash type based on length
    const detectHashType = (input: string): string | null => {
        const cleanHash = input.replace(/\s/g, '').toLowerCase();
        if (/^[a-f0-9]{32}$/.test(cleanHash)) return 'MD5';
        if (/^[a-f0-9]{40}$/.test(cleanHash)) return 'SHA1';
        if (/^[a-f0-9]{64}$/.test(cleanHash)) return 'SHA256';
        return null;
    };

    const handleHashChange = (value: string) => {
        const cleaned = value.replace(/\s/g, '').toUpperCase();
        setHash(cleaned);
        setError(null);
        setHashType(detectHashType(cleaned));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!hash.trim()) {
            setError('Please enter a file hash');
            return;
        }

        const type = detectHashType(hash);
        if (!type) {
            setError('Invalid hash format. Please enter a valid MD5 (32), SHA1 (40), or SHA256 (64) hash.');
            return;
        }

        await onSearch(hash.trim().toLowerCase());
    };

    // Example hashes for demonstration
    const exampleHashes = [
        { hash: '44D88612FEA8A8F36DE82E1278ABB02F', type: 'MD5', label: 'EICAR Test' },
    ];

    return (
        <div className="bg-dark-surface rounded-xl border border-purple-500/20 overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-purple-500/10 to-transparent p-6 border-b border-purple-500/10">
                <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-purple-500/10 rounded-lg">
                        <FileSearch size={24} className="text-purple-400" />
                    </div>
                    <h2 className="text-xl font-bold text-text-primary">
                        File Hash Analysis
                    </h2>
                </div>
                <p className="text-text-secondary text-sm">
                    Analyze file hashes against MalwareBazaar, VirusTotal, and threat databases
                </p>
            </div>

            {/* Search Form */}
            <div className="p-6">
                <form onSubmit={handleSubmit} className="flex gap-3">
                    <div className="flex-1 relative">
                        <input
                            type="text"
                            placeholder="Enter MD5, SHA1, or SHA256 hash"
                            value={hash}
                            onChange={(e) => handleHashChange(e.target.value)}
                            disabled={loading}
                            className="w-full bg-dark-bg border border-purple-500/20 rounded-lg px-4 py-3.5 pl-12 text-text-primary placeholder-text-secondary/50 font-mono text-sm focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 disabled:opacity-50 transition-all"
                        />
                        <Hash size={20} className="absolute left-4 top-4 text-text-secondary" />

                        {/* Hash Type Badge */}
                        {hashType && (
                            <span className="absolute right-4 top-3.5 px-2 py-1 bg-purple-500/20 text-purple-400 text-xs font-bold rounded">
                                {hashType}
                            </span>
                        )}
                    </div>

                    <button
                        type="submit"
                        disabled={loading || !hash.trim()}
                        className="px-8 py-3.5 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-white font-bold transition-all shadow-lg shadow-purple-500/20 flex items-center gap-2"
                    >
                        {loading ? (
                            <>
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                Analyzing...
                            </>
                        ) : (
                            <>
                                <Search size={18} />
                                Analyze Hash
                            </>
                        )}
                    </button>
                </form>

                {/* Error Message */}
                {error && (
                    <div className="mt-3 px-4 py-2 bg-red-500/10 border border-red-500/30 rounded-lg flex items-start gap-2">
                        <AlertCircle size={16} className="text-red-400 mt-0.5 shrink-0" />
                        <p className="text-red-400 text-sm">{error}</p>
                    </div>
                )}

                {/* Hash Format Info */}
                <div className="mt-6 p-4 bg-dark-bg/50 rounded-lg border border-purple-500/10">
                    <div className="flex items-center gap-2 mb-3">
                        <AlertCircle size={14} className="text-purple-400" />
                        <p className="text-text-secondary text-sm font-semibold">Supported Hash Formats</p>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                        <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 bg-purple-500/20 text-purple-400 rounded text-xs font-mono">MD5</span>
                            <span className="text-text-secondary">32 characters</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 bg-purple-500/20 text-purple-400 rounded text-xs font-mono">SHA1</span>
                            <span className="text-text-secondary">40 characters</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 bg-purple-500/20 text-purple-400 rounded text-xs font-mono">SHA256</span>
                            <span className="text-text-secondary">64 characters</span>
                        </div>
                    </div>
                </div>

                {/* Example Hash */}
                <div className="mt-4 pt-4 border-t border-purple-500/10">
                    <p className="text-text-secondary text-sm mb-3">Test with known sample:</p>
                    <div className="flex gap-2 flex-wrap">
                        {exampleHashes.map((item) => (
                            <button
                                key={item.hash}
                                onClick={() => {
                                    handleHashChange(item.hash);
                                    onSearch(item.hash.toLowerCase());
                                }}
                                disabled={loading}
                                className="group px-3 py-2 bg-dark-bg hover:bg-purple-500/10 border border-purple-500/20 hover:border-purple-500/40 rounded-lg transition-all disabled:opacity-50"
                            >
                                <span className="text-text-secondary text-xs group-hover:text-purple-400">
                                    {item.label} ({item.type})
                                </span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default HashLookupPanel;
