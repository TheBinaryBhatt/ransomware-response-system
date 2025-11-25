// src/pages/ThreatIntel.tsx
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Search, Download, MapPin, Shield, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';

interface ThreatIntelResult {
  ip: string;
  reputation: 'malicious' | 'suspicious' | 'clean';
  confidence: number;
  country: string;
  isp: string;
  lastSeen: string;
  threats: string[];
  geoData: {
    city: string;
    region: string;
    country: string;
    lat: number;
    lon: number;
  };
  abuseScore: number;
  malwareFamilies: string[];
}

const ThreatIntel: React.FC = () => {
  const [query, setQuery] = useState('');
  const [searchType, setSearchType] = useState<'ip' | 'hash'>('ip');
  const [results, setResults] = useState<ThreatIntelResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    
    // Add to search history
    setSearchHistory(prev => [query, ...prev.slice(0, 4)]);
    
    // Simulate API call with realistic threat data
    setTimeout(() => {
      const mockResult: ThreatIntelResult = {
        ip: query,
        reputation: query.includes('185') ? 'malicious' : 'suspicious',
        confidence: query.includes('185') ? 94 : 67,
        country: 'Russia',
        isp: 'Digital Ocean LLC',
        lastSeen: new Date().toISOString(),
        threats: ['Ransomware C2', 'Botnet', 'Phishing Host'],
        geoData: {
          city: 'Moscow',
          region: 'Moscow',
          country: 'RU',
          lat: 55.7558,
          lon: 37.6173
        },
        abuseScore: query.includes('185') ? 98 : 45,
        malwareFamilies: ['Conti', 'LockBit', 'REvil']
      };
      setResults(mockResult);
      setLoading(false);
    }, 2000);
  };

  const getReputationColor = (reputation: string) => {
    switch (reputation) {
      case 'malicious':
        return 'text-red-400 bg-red-500/20 border-red-500/50';
      case 'suspicious':
        return 'text-orange-400 bg-orange-500/20 border-orange-500/50';
      case 'clean':
        return 'text-green-400 bg-green-500/20 border-green-500/50';
      default:
        return 'text-gray-400 bg-gray-500/20 border-gray-500/50';
    }
  };

  const getReputationIcon = (reputation: string) => {
    switch (reputation) {
      case 'malicious':
        return <XCircle className="w-5 h-5" />;
      case 'suspicious':
        return <AlertTriangle className="w-5 h-5" />;
      case 'clean':
        return <CheckCircle className="w-5 h-5" />;
      default:
        return <Shield className="w-5 h-5" />;
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-2xl font-bold text-cream">Threat Intelligence</h1>
          <p className="text-gray-400">Leverage AI-driven insights to proactively identify and mitigate cyber threats</p>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Search Panel */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="lg:col-span-1 space-y-6"
        >
          {/* Search Input */}
          <div className="bg-dark-surface rounded-xl border border-dark-secondary p-6">
            <h2 className="text-lg font-semibold text-cream mb-4">Threat Lookup</h2>
            <form onSubmit={handleSearch} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Search Type
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setSearchType('ip')}
                    className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                      searchType === 'ip'
                        ? 'bg-teal-500 text-white'
                        : 'bg-dark-secondary text-gray-400 hover:text-cream'
                    }`}
                  >
                    IP Address
                  </button>
                  <button
                    type="button"
                    onClick={() => setSearchType('hash')}
                    className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                      searchType === 'hash'
                        ? 'bg-teal-500 text-white'
                        : 'bg-dark-secondary text-gray-400 hover:text-cream'
                    }`}
                  >
                    File Hash
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  {searchType === 'ip' ? 'IP Address' : 'File Hash (MD5/SHA256)'}
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-dark-secondary border border-gray-600 
                             rounded-lg text-cream placeholder-gray-500 focus:outline-none 
                             focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    placeholder={searchType === 'ip' ? '192.168.1.1' : 'Enter file hash...'}
                    required
                  />
                </div>
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-teal-500 to-teal-600 text-white py-3 
                         rounded-lg font-semibold flex items-center justify-center gap-2
                         hover:from-teal-600 hover:to-teal-700 transition-all disabled:opacity-50"
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Searching...
                  </div>
                ) : (
                  <>
                    <Search className="w-4 h-4" />
                    Search Intelligence
                  </>
                )}
              </motion.button>
            </form>
          </div>

          {/* Search History */}
          <div className="bg-dark-surface rounded-xl border border-dark-secondary p-6">
            <h3 className="text-lg font-semibold text-cream mb-4">Recent Lookups</h3>
            <div className="space-y-2">
              {searchHistory.map((item, index) => (
                <button
                  key={index}
                  onClick={() => setQuery(item)}
                  className="w-full text-left p-3 rounded-lg bg-dark-secondary hover:bg-teal-500/20 
                           text-gray-400 hover:text-teal-400 transition-colors text-sm"
                >
                  <div className="font-mono">{item}</div>
                  <div className="text-xs text-gray-500">
                    {new Date().toLocaleTimeString()}
                  </div>
                </button>
              ))}
              {searchHistory.length === 0 && (
                <div className="text-center py-4 text-gray-500 text-sm">
                  No recent searches
                </div>
              )}
            </div>
          </div>
        </motion.div>

        {/* Results Panel */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="lg:col-span-3 space-y-6"
        >
          {loading ? (
            <div className="bg-dark-surface rounded-xl border border-dark-secondary p-12 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-500 mx-auto mb-4"></div>
              <h3 className="text-lg font-semibold text-cream mb-2">Querying Threat Intelligence</h3>
              <p className="text-gray-400">Searching AbuseIPDB, VirusTotal, and MalwareBazaar databases...</p>
            </div>
          ) : results ? (
            <div className="space-y-6">
              {/* Threat Summary Card */}
              <div className="bg-dark-surface rounded-xl border border-dark-secondary p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-xl font-bold text-cream">Threat Report</h2>
                    <p className="text-gray-400">Detailed analysis for {results.ip}</p>
                  </div>
                  <button className="flex items-center gap-2 px-4 py-2 bg-dark-secondary hover:bg-teal-500/20 
                                   text-gray-400 hover:text-teal-400 rounded-lg transition-colors">
                    <Download className="w-4 h-4" />
                    Export Report
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                  {/* Reputation */}
                  <div className={`p-4 rounded-lg border ${getReputationColor(results.reputation)}`}>
                    <div className="flex items-center gap-3">
                      {getReputationIcon(results.reputation)}
                      <div>
                        <div className="font-semibold capitalize">{results.reputation}</div>
                        <div className="text-sm opacity-75">{results.confidence}% Confidence</div>
                      </div>
                    </div>
                  </div>

                  {/* Abuse Score */}
                  <div className="p-4 rounded-lg border border-gray-600">
                    <div className="flex items-center gap-3">
                      <AlertTriangle className="w-5 h-5 text-orange-400" />
                      <div>
                        <div className="font-semibold text-cream">Abuse Score</div>
                        <div className="text-sm text-gray-400">{results.abuseScore}/100</div>
                      </div>
                    </div>
                  </div>

                  {/* Geographic */}
                  <div className="p-4 rounded-lg border border-gray-600">
                    <div className="flex items-center gap-3">
                      <MapPin className="w-5 h-5 text-blue-400" />
                      <div>
                        <div className="font-semibold text-cream">{results.geoData.country}</div>
                        <div className="text-sm text-gray-400">{results.geoData.city}</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Threat Details */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-lg font-semibold text-cream mb-4">Associated Threats</h3>
                    <div className="space-y-2">
                      {results.threats.map((threat, index) => (
                        <div key={index} className="flex items-center gap-3 p-3 bg-dark-secondary rounded-lg">
                          <Shield className="w-4 h-4 text-red-400" />
                          <span className="text-cream">{threat}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-cream mb-4">Malware Families</h3>
                    <div className="flex flex-wrap gap-2">
                      {results.malwareFamilies.map((family, index) => (
                        <span key={index} className="px-3 py-1 bg-red-500/20 text-red-400 rounded-full text-sm">
                          {family}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Additional Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-dark-surface rounded-xl border border-dark-secondary p-6">
                  <h3 className="text-lg font-semibold text-cream mb-4">Network Information</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-400">ISP</span>
                      <span className="text-cream font-mono">{results.isp}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Last Seen</span>
                      <span className="text-cream">{new Date(results.lastSeen).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Coordinates</span>
                      <span className="text-cream font-mono">{results.geoData.lat}, {results.geoData.lon}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-dark-surface rounded-xl border border-dark-secondary p-6">
                  <h3 className="text-lg font-semibold text-cream mb-4">Confidence Metrics</h3>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-sm text-gray-400 mb-1">
                        <span>Threat Confidence</span>
                        <span>{results.confidence}%</span>
                      </div>
                      <div className="w-full bg-gray-700 rounded-full h-2">
                        <div 
                          className="h-2 rounded-full bg-teal-500 transition-all duration-1000"
                          style={{ width: `${results.confidence}%` }}
                        />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-sm text-gray-400 mb-1">
                        <span>Abuse Confidence</span>
                        <span>{results.abuseScore}%</span>
                      </div>
                      <div className="w-full bg-gray-700 rounded-full h-2">
                        <div 
                          className="h-2 rounded-full bg-red-500 transition-all duration-1000"
                          style={{ width: `${results.abuseScore}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-dark-surface rounded-xl border border-dark-secondary p-12 text-center">
              <div className="text-6xl mb-4">🛰️</div>
              <h3 className="text-xl font-semibold text-cream mb-2">Threat Intelligence Hub</h3>
              <p className="text-gray-400 mb-6">
                Enter an IP address or file hash to search global threat intelligence databases
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-500">
                <div>AbuseIPDB</div>
                <div>VirusTotal</div>
                <div>MalwareBazaar</div>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default ThreatIntel;