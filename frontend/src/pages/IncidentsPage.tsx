// ============================================
// IncidentsPage - Main Incidents Management Page
// ============================================

import React, { useState, useCallback, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
    AlertTriangle,
    ShieldAlert,
    Clock,
    CheckCircle,
    RefreshCw,
    Activity
} from 'lucide-react';
import { useApi } from '../hooks/useApi';
import { useWebSocket } from '../hooks/useWebSocket';
import { useNotification } from '../contexts/NotificationContext';
import { incidentsApi } from '../services/api';
import { IncidentFilters, IncidentTable, IncidentDetail } from '../components/Incidents';
import type { Incident } from '../types';
import type { IncidentFilters as FilterType } from '../types/incident';

const IncidentsPage: React.FC = () => {
    // URL query params for filters from navigation
    const [searchParams] = useSearchParams();

    // Notification hook
    const { addNotification } = useNotification();

    // Pagination state
    const [page, setPage] = useState(1);
    const [limit] = useState(100);  // Show up to 100 incidents to match dashboard

    // Filter state - initialize from URL params
    const [filters, setFilters] = useState<FilterType>(() => {
        const severity = searchParams.get('severity');
        const status = searchParams.get('status');
        return {
            ...(severity ? { severity } : {}),
            ...(status ? { status } : {}),
        };
    });

    // Detail drawer state
    const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
    const [showDetail, setShowDetail] = useState(false);

    // Build query params
    const queryParams = {
        limit,
        offset: (page - 1) * limit,
        ...filters,
    };

    // Fetch incidents with polling
    const {
        data: incidents,
        loading,
        error,
        refetch,
    } = useApi(
        () => incidentsApi.getAll(queryParams),
        [page, filters.status, filters.severity, filters.threat_type, filters.search]
    );

    // WebSocket for real-time updates
    const { on } = useWebSocket();

    // Subscribe to real-time events
    React.useEffect(() => {
        const unsubIncident = on('incident.received', () => refetch());
        const unsubTriaged = on('incident.triaged', () => refetch());
        const unsubResponse = on('response.task.completed', () => refetch());

        return () => {
            unsubIncident?.();
            unsubTriaged?.();
            unsubResponse?.();
        };
    }, [on, refetch]);

    // Calculate stats from current data
    const incidentsList = Array.isArray(incidents) ? incidents : [];
    const total = incidentsList.length;

    const stats = {
        total,
        critical: incidentsList.filter((i) => i.severity === 'CRITICAL').length,
        pending: incidentsList.filter((i) => i.status === 'PENDING' || i.status === 'NEW').length,
        resolved: incidentsList.filter((i) => i.status === 'RESOLVED').length,
    };

    // Handlers
    const handleFilterChange = useCallback((newFilters: FilterType) => {
        setFilters(newFilters);
        setPage(1);
    }, []);

    const handleRowClick = useCallback((incident: Incident) => {
        setSelectedIncident(incident);
        setShowDetail(true);
    }, []);

    const handleCloseDetail = useCallback(() => {
        setShowDetail(false);
        setSelectedIncident(null);
    }, []);

    const handleTriggerResponse = useCallback(async (incidentId: string) => {
        try {
            await incidentsApi.triggerResponse(incidentId);
            addNotification('Response triggered successfully! Incident marked as resolved or in progress.', 'success');
            refetch();
            handleCloseDetail();
        } catch (err) {
            console.error('Failed to trigger response:', err);
            addNotification('Failed to trigger response. Please try again.', 'error');
        }
    }, [refetch, addNotification, handleCloseDetail]);

    const handleMarkFalsePositive = useCallback(async (incidentId: string) => {
        try {
            await incidentsApi.ignore(incidentId);
            addNotification('Incident marked as false positive.', 'success');
            refetch();
            handleCloseDetail();
        } catch (err) {
            console.error('Failed to mark incident as false positive:', err);
            addNotification('Failed to mark as false positive. Please try again.', 'error');
        }
    }, [refetch, addNotification, handleCloseDetail]);

    return (
        <div className="min-h-screen bg-dark-bg">
            {/* Page Header */}
            <div className="bg-gradient-to-r from-dark-surface via-dark-surface to-dark-bg border-b border-accent-teal/10">
                <div className="px-6 py-6">
                    {/* Title Row */}
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                <div className="p-2 bg-accent-teal/10 rounded-lg">
                                    <ShieldAlert size={24} className="text-accent-teal" />
                                </div>
                                <h1 className="text-3xl font-bold text-text-primary">
                                    Security Incidents
                                </h1>
                            </div>
                            <p className="text-text-secondary">
                                Monitor, analyze, and respond to security threats in real-time
                            </p>
                        </div>
                        <button
                            onClick={() => refetch()}
                            disabled={loading}
                            className="flex items-center gap-2 px-4 py-2 bg-accent-teal/10 hover:bg-accent-teal/20 border border-accent-teal/30 rounded-lg text-accent-teal text-sm font-medium transition-all disabled:opacity-50"
                        >
                            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                            Refresh
                        </button>
                    </div>

                    {/* Stats Cards */}
                    <div className="grid grid-cols-4 gap-4">
                        {/* Total Incidents */}
                        <div className="bg-dark-bg/50 rounded-xl p-4 border border-accent-teal/10 hover:border-accent-teal/30 transition-colors">
                            <div className="flex items-center justify-between mb-2">
                                <p className="text-text-secondary text-sm font-medium">Total Incidents</p>
                                <Activity size={18} className="text-accent-teal" />
                            </div>
                            <p className="text-3xl font-bold text-text-primary">{stats.total}</p>
                            <p className="text-text-secondary text-xs mt-1">All recorded incidents</p>
                        </div>

                        {/* Critical */}
                        <div className="bg-dark-bg/50 rounded-xl p-4 border border-red-500/20 hover:border-red-500/40 transition-colors">
                            <div className="flex items-center justify-between mb-2">
                                <p className="text-text-secondary text-sm font-medium">Critical</p>
                                <AlertTriangle size={18} className="text-red-400" />
                            </div>
                            <p className="text-3xl font-bold text-red-400">{stats.critical}</p>
                            <p className="text-text-secondary text-xs mt-1">Require immediate action</p>
                        </div>

                        {/* Pending */}
                        <div className="bg-dark-bg/50 rounded-xl p-4 border border-yellow-500/20 hover:border-yellow-500/40 transition-colors">
                            <div className="flex items-center justify-between mb-2">
                                <p className="text-text-secondary text-sm font-medium">Pending</p>
                                <Clock size={18} className="text-yellow-400" />
                            </div>
                            <p className="text-3xl font-bold text-yellow-400">{stats.pending}</p>
                            <p className="text-text-secondary text-xs mt-1">Awaiting analysis</p>
                        </div>

                        {/* Resolved */}
                        <div className="bg-dark-bg/50 rounded-xl p-4 border border-green-500/20 hover:border-green-500/40 transition-colors">
                            <div className="flex items-center justify-between mb-2">
                                <p className="text-text-secondary text-sm font-medium">Resolved</p>
                                <CheckCircle size={18} className="text-green-400" />
                            </div>
                            <p className="text-3xl font-bold text-green-400">{stats.resolved}</p>
                            <p className="text-text-secondary text-xs mt-1">Successfully handled</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex flex-col lg:flex-row gap-6 p-4 lg:p-6">
                {/* Filters Sidebar */}
                <div className="w-full lg:w-72 shrink-0">
                    <IncidentFilters
                        filters={filters}
                        onFilterChange={handleFilterChange}
                    />
                </div>

                {/* Table Area */}
                <div className="flex-1 min-w-0">
                    {/* Error State */}
                    {error && (
                        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-6">
                            <div className="flex items-start gap-3">
                                <AlertTriangle size={20} className="text-red-400 shrink-0 mt-0.5" />
                                <div>
                                    <p className="text-red-400 font-medium">Error loading incidents</p>
                                    <p className="text-red-400/70 text-sm mt-1">{error}</p>
                                </div>
                            </div>
                            <button
                                onClick={() => refetch()}
                                className="mt-3 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 rounded-lg text-red-400 text-sm font-medium transition-colors"
                            >
                                Try Again
                            </button>
                        </div>
                    )}

                    {/* Incidents Table */}
                    <IncidentTable
                        incidents={incidentsList}
                        loading={loading}
                        total={total}
                        page={page}
                        limit={limit}
                        onPageChange={setPage}
                        onRowClick={handleRowClick}
                    />
                </div>
            </div>

            {/* Detail Drawer */}
            {showDetail && selectedIncident && (
                <IncidentDetail
                    incident={selectedIncident}
                    onClose={handleCloseDetail}
                    onTriggerResponse={handleTriggerResponse}
                    onMarkFalsePositive={handleMarkFalsePositive}
                />
            )}
        </div>
    );
};

export default IncidentsPage;
