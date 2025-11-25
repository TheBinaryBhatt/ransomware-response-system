// src/pages/AuditLogs.tsx
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Search, 
  Filter, 
  Download, 
  Calendar, 
  User, 
  Shield, 
  AlertTriangle,
  CheckCircle,
  XCircle,
  Lock,
  ChevronDown,
} from 'lucide-react';

interface AuditLog {
  id: string;
  timestamp: string;
  eventType: 'INCIDENT_CREATED' | 'RESPONSE_TRIGGERED' | 'USER_ACTION' | 'SYSTEM_EVENT' | 'AI_DECISION';
  actor: string;
  action: string;
  resource: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  details: string;
  hash: string;
  previousHash: string;
  verified: boolean;
  rawData?: Record<string, unknown>;
}

const AuditLogs: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<AuditLog[]>([]);
  const [expandedLogs, setExpandedLogs] = useState<Set<string>>(new Set());
  const [filters, setFilters] = useState({
    search: '',
    eventType: '',
    severity: '',
    dateRange: '7d',
    actor: ''
  });

  // Mock data - replace with actual API call
  useEffect(() => {
    const mockLogs: AuditLog[] = [
      {
        id: '1',
        timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
        eventType: 'INCIDENT_CREATED',
        actor: 'system',
        action: 'Incident detected and triaged',
        resource: 'incident_001',
        severity: 'HIGH',
        details: 'Ransomware behavior detected in endpoint protection logs',
        hash: 'a1b2c3d4e5f6...',
        previousHash: '0a1b2c3d4e5f...',
        verified: true,
        rawData: { alert_id: '001', source: 'crowdstrike' }
      },
      {
        id: '2',
        timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
        eventType: 'AI_DECISION',
        actor: 'ai_agent',
        action: 'AI analysis completed',
        resource: 'incident_001',
        severity: 'HIGH',
        details: 'Confirmed ransomware with 94% confidence',
        hash: 'b2c3d4e5f6g7...',
        previousHash: 'a1b2c3d4e5f6...',
        verified: true
      },
      {
        id: '3',
        timestamp: new Date(Date.now() - 1000 * 60 * 20).toISOString(),
        eventType: 'RESPONSE_TRIGGERED',
        actor: 'system',
        action: 'Automated response executed',
        resource: 'incident_001',
        severity: 'HIGH',
        details: 'Host quarantined and IP blocked via Wazuh and pfSense',
        hash: 'c3d4e5f6g7h8...',
        previousHash: 'b2c3d4e5f6g7...',
        verified: true
      },
      {
        id: '4',
        timestamp: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
        eventType: 'USER_ACTION',
        actor: 'admin',
        action: 'Manual escalation',
        resource: 'incident_001',
        severity: 'MEDIUM',
        details: 'Analyst reviewed and approved automated actions',
        hash: 'd4e5f6g7h8i9...',
        previousHash: 'c3d4e5f6g7h8...',
        verified: true
      }
    ];
    setLogs(mockLogs);
    setFilteredLogs(mockLogs);
  }, []);

  // Filter logs based on criteria
  useEffect(() => {
    let filtered = logs;

    if (filters.search) {
      filtered = filtered.filter(log => 
        log.action.toLowerCase().includes(filters.search.toLowerCase()) ||
        log.details.toLowerCase().includes(filters.search.toLowerCase()) ||
        log.actor.toLowerCase().includes(filters.search.toLowerCase())
      );
    }

    if (filters.eventType) {
      filtered = filtered.filter(log => log.eventType === filters.eventType);
    }

    if (filters.severity) {
      filtered = filtered.filter(log => log.severity === filters.severity);
    }

    if (filters.actor) {
      filtered = filtered.filter(log => log.actor === filters.actor);
    }

    setFilteredLogs(filtered);
  }, [filters, logs]);

  const toggleExpand = (logId: string) => {
    const newExpanded = new Set(expandedLogs);
    if (newExpanded.has(logId)) {
      newExpanded.delete(logId);
    } else {
      newExpanded.add(logId);
    }
    setExpandedLogs(newExpanded);
  };

  const getEventTypeIcon = (eventType: string) => {
    switch (eventType) {
      case 'INCIDENT_CREATED':
        return <AlertTriangle className="w-4 h-4 text-red-400" />;
      case 'RESPONSE_TRIGGERED':
        return <Shield className="w-4 h-4 text-blue-400" />;
      case 'USER_ACTION':
        return <User className="w-4 h-4 text-green-400" />;
      case 'AI_DECISION':
        return <CheckCircle className="w-4 h-4 text-teal-400" />;
      default:
        return <Shield className="w-4 h-4 text-gray-400" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'CRITICAL':
        return 'bg-red-500/20 text-red-400 border-red-500/50';
      case 'HIGH':
        return 'bg-orange-500/20 text-orange-400 border-orange-500/50';
      case 'MEDIUM':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50';
      case 'LOW':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/50';
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/50';
    }
  };

  const exportLogs = () => {
    const dataStr = JSON.stringify(filteredLogs, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `audit-logs-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
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
          <h1 className="text-2xl font-bold text-cream">Audit Logs</h1>
          <p className="text-gray-400">Immutable security event records with hash chain verification</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={exportLogs}
          className="flex items-center gap-2 px-4 py-2 bg-teal-500 hover:bg-teal-600 
                   text-white rounded-lg font-medium transition-colors"
        >
          <Download className="w-4 h-4" />
          Export Report
        </motion.button>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-3 space-y-6">
          {/* Filters */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-dark-surface rounded-xl p-4 border border-dark-secondary"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              {/* Search */}
              <div className="lg:col-span-2">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Search
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={filters.search}
                    onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                    placeholder="Search logs..."
                    className="w-full pl-10 pr-4 py-2 bg-dark-secondary border border-gray-600 
                             rounded-lg text-cream placeholder-gray-500 focus:outline-none 
                             focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Event Type */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Event Type
                </label>
                <select
                  value={filters.eventType}
                  onChange={(e) => setFilters(prev => ({ ...prev, eventType: e.target.value }))}
                  className="w-full px-3 py-2 bg-dark-secondary border border-gray-600 
                           rounded-lg text-cream focus:outline-none focus:ring-2 
                           focus:ring-teal-500 focus:border-transparent"
                >
                  <option value="">All Types</option>
                  <option value="INCIDENT_CREATED">Incident Created</option>
                  <option value="AI_DECISION">AI Decision</option>
                  <option value="RESPONSE_TRIGGERED">Response Triggered</option>
                  <option value="USER_ACTION">User Action</option>
                  <option value="SYSTEM_EVENT">System Event</option>
                </select>
              </div>

              {/* Severity */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Severity
                </label>
                <select
                  value={filters.severity}
                  onChange={(e) => setFilters(prev => ({ ...prev, severity: e.target.value }))}
                  className="w-full px-3 py-2 bg-dark-secondary border border-gray-600 
                           rounded-lg text-cream focus:outline-none focus:ring-2 
                           focus:ring-teal-500 focus:border-transparent"
                >
                  <option value="">All Severities</option>
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="CRITICAL">Critical</option>
                </select>
              </div>

              {/* Date Range */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Date Range
                </label>
                <select
                  value={filters.dateRange}
                  onChange={(e) => setFilters(prev => ({ ...prev, dateRange: e.target.value }))}
                  className="w-full px-3 py-2 bg-dark-secondary border border-gray-600 
                           rounded-lg text-cream focus:outline-none focus:ring-2 
                           focus:ring-teal-500 focus:border-transparent"
                >
                  <option value="1d">Last 24 hours</option>
                  <option value="7d">Last 7 days</option>
                  <option value="30d">Last 30 days</option>
                  <option value="90d">Last 90 days</option>
                </select>
              </div>
            </div>
          </motion.div>

          {/* Logs List */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="space-y-4"
          >
            {filteredLogs.map((log, index) => (
              <motion.div
                key={log.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-dark-surface rounded-xl border border-dark-secondary overflow-hidden"
              >
                {/* Log Header */}
                <div 
                  className="p-4 cursor-pointer hover:bg-dark-secondary/50 transition-colors"
                  onClick={() => toggleExpand(log.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 flex-1">
                      {/* Event Icon */}
                      <div className="flex items-center gap-2">
                        {getEventTypeIcon(log.eventType)}
                        <span className="text-sm text-gray-400 capitalize">
                          {log.eventType.toLowerCase().replace('_', ' ')}
                        </span>
                      </div>

                      {/* Timestamp */}
                      <div className="text-sm text-gray-400 font-mono">
                        {new Date(log.timestamp).toLocaleString()}
                      </div>

                      {/* Actor */}
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-cream">{log.actor}</span>
                      </div>

                      {/* Severity Badge */}
                      <div className={`px-2 py-1 rounded-full text-xs font-medium border ${getSeverityColor(log.severity)}`}>
                        {log.severity}
                      </div>

                      {/* Hash Verification */}
                      <div className="flex items-center gap-2">
                        <Lock className={`w-4 h-4 ${log.verified ? 'text-green-400' : 'text-red-400'}`} />
                        <span className="text-sm font-mono text-gray-400">
                          {log.hash.substring(0, 8)}...
                        </span>
                      </div>
                    </div>

                    {/* Expand Button */}
                    <motion.div
                      animate={{ rotate: expandedLogs.has(log.id) ? 180 : 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <ChevronDown className="w-5 h-5 text-gray-400" />
                    </motion.div>
                  </div>

                  {/* Action and Resource */}
                  <div className="mt-2">
                    <div className="text-cream font-medium">{log.action}</div>
                    <div className="text-sm text-gray-400 mt-1">{log.details}</div>
                    <div className="text-xs text-gray-500 mt-1">Resource: {log.resource}</div>
                  </div>
                </div>

                {/* Expandable Content */}
                {expandedLogs.has(log.id) && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="px-4 pb-4 border-t border-dark-secondary"
                  >
                    <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <h4 className="text-sm font-medium text-gray-300 mb-2">Hash Chain</h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-400">Current Hash:</span>
                            <code className="text-cream font-mono">{log.hash}</code>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">Previous Hash:</span>
                            <code className="text-cream font-mono">{log.previousHash}</code>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">Integrity:</span>
                            <div className="flex items-center gap-2">
                              {log.verified ? (
                                <>
                                  <CheckCircle className="w-4 h-4 text-green-400" />
                                  <span className="text-green-400">Verified</span>
                                </>
                              ) : (
                                <>
                                  <XCircle className="w-4 h-4 text-red-400" />
                                  <span className="text-red-400">Tampered</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div>
                        <h4 className="text-sm font-medium text-gray-300 mb-2">Raw Data</h4>
                        <pre className="bg-dark-secondary rounded-lg p-3 text-xs text-cream overflow-auto max-h-40">
                          {JSON.stringify(log.rawData || {
                            timestamp: log.timestamp,
                            eventType: log.eventType,
                            actor: log.actor,
                            action: log.action,
                            resource: log.resource,
                            severity: log.severity
                          }, null, 2)}
                        </pre>
                      </div>
                    </div>
                  </motion.div>
                )}
              </motion.div>
            ))}
          </motion.div>
        </div>

        {/* Sidebar - Statistics */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="space-y-6"
        >
          {/* Total Events */}
          <div className="bg-dark-surface rounded-xl p-4 border border-dark-secondary">
            <h3 className="text-lg font-semibold text-cream mb-4">Audit Statistics</h3>
            <div className="space-y-4">
              <div className="text-center p-4 bg-dark-secondary rounded-lg">
                <div className="text-3xl font-bold text-cream">{logs.length}</div>
                <div className="text-sm text-gray-400">Total Events</div>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Incident Created</span>
                  <span className="text-cream">{logs.filter(l => l.eventType === 'INCIDENT_CREATED').length}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">AI Decisions</span>
                  <span className="text-cream">{logs.filter(l => l.eventType === 'AI_DECISION').length}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">User Actions</span>
                  <span className="text-cream">{logs.filter(l => l.eventType === 'USER_ACTION').length}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Responses</span>
                  <span className="text-cream">{logs.filter(l => l.eventType === 'RESPONSE_TRIGGERED').length}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Event Type Breakdown */}
          <div className="bg-dark-surface rounded-xl p-4 border border-dark-secondary">
            <h3 className="text-lg font-semibold text-cream mb-4">Event Type Breakdown</h3>
            <div className="space-y-3">
              {['INCIDENT_CREATED', 'AI_DECISION', 'USER_ACTION', 'RESPONSE_TRIGGERED', 'SYSTEM_EVENT'].map((type) => {
                const count = logs.filter(l => l.eventType === type).length;
                const percentage = logs.length > 0 ? (count / logs.length) * 100 : 0;
                
                return (
                  <div key={type} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400 capitalize">
                        {type.toLowerCase().replace('_', ' ')}
                      </span>
                      <span className="text-cream">{count}</span>
                    </div>
                    <div className="w-full bg-dark-secondary rounded-full h-2">
                      <div 
                        className="h-2 rounded-full bg-teal-500 transition-all duration-500"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-dark-surface rounded-xl p-4 border border-dark-secondary">
            <h3 className="text-lg font-semibold text-cream mb-4">Quick Actions</h3>
            <div className="space-y-2">
              <button className="w-full flex items-center gap-2 px-3 py-2 bg-dark-secondary hover:bg-teal-500/20 
                               rounded-lg text-cream transition-colors text-sm">
                <Filter className="w-4 h-4" />
                Save Filter Preset
              </button>
              <button className="w-full flex items-center gap-2 px-3 py-2 bg-dark-secondary hover:bg-teal-500/20 
                               rounded-lg text-cream transition-colors text-sm">
                <Calendar className="w-4 h-4" />
                Schedule Report
              </button>
              <button className="w-full flex items-center gap-2 px-3 py-2 bg-dark-secondary hover:bg-teal-500/20 
                               rounded-lg text-cream transition-colors text-sm">
                <Download className="w-4 h-4" />
                Export All Logs
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default AuditLogs;