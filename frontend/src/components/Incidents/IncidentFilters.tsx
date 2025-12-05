// ============================================
// IncidentFilters Component - Filter sidebar for incidents
// ============================================

import React, { useState } from 'react';
import { Search, X, Filter } from 'lucide-react';
import type { IncidentFilters as FilterType } from '../../types/incident';

interface IncidentFiltersProps {
    filters: FilterType;
    onFilterChange: (filters: FilterType) => void;
}

const IncidentFilters: React.FC<IncidentFiltersProps> = ({
    filters,
    onFilterChange,
}) => {
    const [search, setSearch] = useState(filters.search || '');

    const statuses = ['NEW', 'PENDING', 'INVESTIGATING', 'RESOLVED', 'ESCALATED'];
    const severities = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'];
    const threatTypes = ['Ransomware', 'Phishing', 'Malware', 'DDoS', 'Insider Threat', 'Unknown'];

    const handleStatusChange = (status: string) => {
        const newFilters = { ...filters };
        if (newFilters.status === status) {
            delete newFilters.status;
        } else {
            newFilters.status = status;
        }
        onFilterChange(newFilters);
    };

    const handleSeverityChange = (severity: string) => {
        const newFilters = { ...filters };
        if (newFilters.severity === severity) {
            delete newFilters.severity;
        } else {
            newFilters.severity = severity;
        }
        onFilterChange(newFilters);
    };

    const handleThreatTypeChange = (threatType: string) => {
        const newFilters = { ...filters };
        if (newFilters.threat_type === threatType) {
            delete newFilters.threat_type;
        } else {
            newFilters.threat_type = threatType;
        }
        onFilterChange(newFilters);
    };

    const handleSearch = (value: string) => {
        setSearch(value);
        // Debounce search
        const timeoutId = setTimeout(() => {
            onFilterChange({ ...filters, search: value || undefined });
        }, 300);
        return () => clearTimeout(timeoutId);
    };

    const handleClearFilters = () => {
        setSearch('');
        onFilterChange({});
    };

    const activeFilters = Object.values(filters).filter(v => v).length;

    // Status color mapping
    const statusColors: Record<string, string> = {
        NEW: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
        PENDING: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
        INVESTIGATING: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
        RESOLVED: 'bg-green-500/20 text-green-400 border-green-500/30',
        ESCALATED: 'bg-red-500/20 text-red-400 border-red-500/30',
    };

    // Severity color mapping
    const severityColors: Record<string, string> = {
        CRITICAL: 'bg-red-500/20 text-red-400 border-red-500/30',
        HIGH: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
        MEDIUM: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
        LOW: 'bg-green-500/20 text-green-400 border-green-500/30',
        INFO: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    };

    return (
        <div className="bg-dark-surface rounded-xl border border-accent-teal/20 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-accent-teal/10 bg-gradient-to-r from-accent-teal/5 to-transparent">
                <div className="flex items-center gap-2">
                    <Filter size={18} className="text-accent-teal" />
                    <h2 className="text-lg font-bold text-text-primary">Filters</h2>
                </div>
                {activeFilters > 0 && (
                    <span className="px-2 py-1 bg-accent-teal/20 text-accent-teal rounded-full text-xs font-bold">
                        {activeFilters}
                    </span>
                )}
            </div>

            <div className="p-4 space-y-6">
                {/* Search */}
                <div>
                    <label className="block text-text-secondary text-sm mb-2 font-medium">
                        Search
                    </label>
                    <div className="relative">
                        <Search size={16} className="absolute left-3 top-2.5 text-text-secondary" />
                        <input
                            type="text"
                            placeholder="IP address or ID..."
                            value={search}
                            onChange={(e) => handleSearch(e.target.value)}
                            className="w-full bg-dark-bg border border-accent-teal/20 rounded-lg px-3 py-2 pl-9 text-text-primary placeholder-text-secondary/50 text-sm focus:outline-none focus:border-accent-teal focus:ring-1 focus:ring-accent-teal/30 transition-all"
                        />
                    </div>
                </div>

                {/* Status Filter */}
                <div>
                    <label className="block text-text-secondary text-sm mb-3 font-semibold uppercase tracking-wider">
                        Status
                    </label>
                    <div className="space-y-2">
                        {statuses.map((status) => (
                            <button
                                key={status}
                                onClick={() => handleStatusChange(status)}
                                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg border text-sm font-medium transition-all ${filters.status === status
                                        ? statusColors[status]
                                        : 'bg-dark-bg/50 text-text-secondary border-transparent hover:border-accent-teal/20 hover:bg-dark-bg'
                                    }`}
                            >
                                <span>{status}</span>
                                {filters.status === status && (
                                    <div className="w-2 h-2 rounded-full bg-current" />
                                )}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Severity Filter */}
                <div>
                    <label className="block text-text-secondary text-sm mb-3 font-semibold uppercase tracking-wider">
                        Severity
                    </label>
                    <div className="space-y-2">
                        {severities.map((severity) => (
                            <button
                                key={severity}
                                onClick={() => handleSeverityChange(severity)}
                                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg border text-sm font-medium transition-all ${filters.severity === severity
                                        ? severityColors[severity]
                                        : 'bg-dark-bg/50 text-text-secondary border-transparent hover:border-accent-teal/20 hover:bg-dark-bg'
                                    }`}
                            >
                                <span>{severity}</span>
                                {filters.severity === severity && (
                                    <div className="w-2 h-2 rounded-full bg-current" />
                                )}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Threat Type Filter */}
                <div>
                    <label className="block text-text-secondary text-sm mb-3 font-semibold uppercase tracking-wider">
                        Threat Type
                    </label>
                    <div className="space-y-2">
                        {threatTypes.map((threatType) => (
                            <button
                                key={threatType}
                                onClick={() => handleThreatTypeChange(threatType)}
                                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg border text-sm font-medium transition-all ${filters.threat_type === threatType
                                        ? 'bg-accent-teal/20 text-accent-teal border-accent-teal/30'
                                        : 'bg-dark-bg/50 text-text-secondary border-transparent hover:border-accent-teal/20 hover:bg-dark-bg'
                                    }`}
                            >
                                <span>{threatType}</span>
                                {filters.threat_type === threatType && (
                                    <div className="w-2 h-2 rounded-full bg-current" />
                                )}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Clear Filters Button */}
                {activeFilters > 0 && (
                    <button
                        onClick={handleClearFilters}
                        className="w-full flex items-center justify-center gap-2 px-4 py-3 border border-red-500/30 hover:bg-red-500/10 rounded-lg text-red-400 text-sm font-semibold transition-all"
                    >
                        <X size={16} />
                        Clear All Filters
                    </button>
                )}
            </div>
        </div>
    );
};

export default IncidentFilters;
