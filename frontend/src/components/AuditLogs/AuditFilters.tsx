// ============================================
// AuditFilters - Filter sidebar for audit logs
// ============================================

import React, { useState } from 'react';
import { Search, X, Calendar, Filter } from 'lucide-react';
import type { AuditLogFilters, AuditEventType, TargetType, AuditStatus } from '../../types/auditlog';

interface AuditFiltersProps {
    filters: AuditLogFilters;
    onFilterChange: (filters: AuditLogFilters) => void;
}

const EVENT_TYPES: AuditEventType[] = [
    'LOGIN',
    'LOGOUT',
    'INCIDENT_CREATED',
    'INCIDENT_UPDATED',
    'RESPONSE_TRIGGERED',
    'WORKFLOW_EXECUTED',
    'CONFIG_CHANGED',
    'USER_CREATED',
    'USER_DELETED',
    'PERMISSION_CHANGED',
    'DATA_EXPORTED',
];

const TARGET_TYPES: TargetType[] = ['incident', 'workflow', 'user', 'config', 'system'];
const STATUSES: AuditStatus[] = ['success', 'failure', 'pending'];

const AuditFilters: React.FC<AuditFiltersProps> = ({ filters, onFilterChange }) => {
    const [localSearch, setLocalSearch] = useState(filters.search || '');
    const [dateFrom, setDateFrom] = useState(filters.date_from || '');
    const [dateTo, setDateTo] = useState(filters.date_to || '');

    const handleSearchSubmit = () => {
        onFilterChange({ ...filters, search: localSearch || undefined });
    };

    const handleSearchKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') handleSearchSubmit();
    };

    const toggleFilter = (key: keyof AuditLogFilters, value: string) => {
        const newFilters = { ...filters };
        if (newFilters[key] === value) {
            delete newFilters[key];
        } else {
            (newFilters as Record<string, string>)[key] = value;
        }
        onFilterChange(newFilters);
    };

    const handleDateChange = (from: string, to: string) => {
        onFilterChange({
            ...filters,
            date_from: from || undefined,
            date_to: to || undefined,
        });
    };

    const handleClearFilters = () => {
        setLocalSearch('');
        setDateFrom('');
        setDateTo('');
        onFilterChange({});
    };

    const activeCount = Object.values(filters).filter(Boolean).length;

    return (
        <div className="bg-dark-surface rounded-xl border border-accent-teal/10 p-5 space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Filter size={18} className="text-accent-teal" />
                    <h2 className="text-lg font-bold text-text-primary">Filters</h2>
                </div>
                {activeCount > 0 && (
                    <span className="px-2 py-0.5 bg-accent-teal text-dark-bg rounded-full text-xs font-bold">
                        {activeCount}
                    </span>
                )}
            </div>

            {/* Search */}
            <div>
                <label className="block text-text-secondary text-xs font-semibold mb-2 uppercase tracking-wider">
                    Search
                </label>
                <div className="relative">
                    <Search size={16} className="absolute left-3 top-2.5 text-text-secondary" />
                    <input
                        type="text"
                        placeholder="Search logs..."
                        value={localSearch}
                        onChange={(e) => setLocalSearch(e.target.value)}
                        onKeyDown={handleSearchKeyDown}
                        onBlur={handleSearchSubmit}
                        className="w-full bg-dark-bg border border-accent-teal/20 rounded-lg px-3 py-2 pl-9 text-text-primary placeholder-text-secondary/50 text-sm focus:outline-none focus:border-accent-teal transition-colors"
                    />
                </div>
            </div>

            {/* Date Range */}
            <div>
                <label className="block text-text-secondary text-xs font-semibold mb-2 uppercase tracking-wider flex items-center gap-1.5">
                    <Calendar size={14} />
                    Date Range
                </label>
                <div className="space-y-2">
                    <input
                        type="date"
                        value={dateFrom}
                        onChange={(e) => {
                            setDateFrom(e.target.value);
                            handleDateChange(e.target.value, dateTo);
                        }}
                        className="w-full bg-dark-bg border border-accent-teal/20 rounded-lg px-3 py-2 text-text-primary text-sm focus:outline-none focus:border-accent-teal"
                    />
                    <input
                        type="date"
                        value={dateTo}
                        onChange={(e) => {
                            setDateTo(e.target.value);
                            handleDateChange(dateFrom, e.target.value);
                        }}
                        className="w-full bg-dark-bg border border-accent-teal/20 rounded-lg px-3 py-2 text-text-primary text-sm focus:outline-none focus:border-accent-teal"
                    />
                </div>
            </div>

            {/* Event Type */}
            <div>
                <label className="block text-text-secondary text-xs font-semibold mb-2 uppercase tracking-wider">
                    Event Type
                </label>
                <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1 custom-scrollbar">
                    {EVENT_TYPES.map((type) => (
                        <button
                            key={type}
                            onClick={() => toggleFilter('event_type', type)}
                            className={`w-full text-left px-3 py-1.5 rounded-lg text-sm transition-all ${filters.event_type === type
                                    ? 'bg-accent-teal/20 text-accent-teal font-semibold'
                                    : 'text-text-secondary hover:bg-dark-bg hover:text-text-primary'
                                }`}
                        >
                            {type.replace(/_/g, ' ')}
                        </button>
                    ))}
                </div>
            </div>

            {/* Target Type */}
            <div>
                <label className="block text-text-secondary text-xs font-semibold mb-2 uppercase tracking-wider">
                    Target Type
                </label>
                <div className="flex flex-wrap gap-1.5">
                    {TARGET_TYPES.map((type) => (
                        <button
                            key={type}
                            onClick={() => toggleFilter('target_type', type)}
                            className={`px-3 py-1 rounded-full text-xs font-semibold transition-all capitalize ${filters.target_type === type
                                    ? 'bg-accent-teal text-dark-bg'
                                    : 'bg-dark-bg text-text-secondary hover:text-text-primary border border-accent-teal/20'
                                }`}
                        >
                            {type}
                        </button>
                    ))}
                </div>
            </div>

            {/* Status */}
            <div>
                <label className="block text-text-secondary text-xs font-semibold mb-2 uppercase tracking-wider">
                    Status
                </label>
                <div className="flex gap-2">
                    {STATUSES.map((status) => {
                        const colors = {
                            success: 'bg-green-500/20 text-green-400 border-green-500/30',
                            failure: 'bg-red-500/20 text-red-400 border-red-500/30',
                            pending: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
                        };
                        const activeColors = {
                            success: 'bg-green-500 text-white',
                            failure: 'bg-red-500 text-white',
                            pending: 'bg-yellow-500 text-dark-bg',
                        };
                        return (
                            <button
                                key={status}
                                onClick={() => toggleFilter('status', status)}
                                className={`flex-1 px-2 py-1.5 rounded-lg text-xs font-semibold capitalize border transition-all ${filters.status === status
                                        ? activeColors[status]
                                        : colors[status]
                                    }`}
                            >
                                {status}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Clear Button */}
            {activeCount > 0 && (
                <button
                    onClick={handleClearFilters}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-accent-teal/30 hover:bg-accent-teal/10 rounded-lg text-accent-teal text-sm font-semibold transition-colors"
                >
                    <X size={16} />
                    Clear All Filters
                </button>
            )}
        </div>
    );
};

export default AuditFilters;
