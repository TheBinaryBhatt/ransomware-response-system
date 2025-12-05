// ============================================
// DASHBOARD - Main SOC Dashboard
// CRITICAL: Proper spacing with gap-6 (24px) everywhere
// ============================================

import { useWebSocketEvent } from '../hooks/useWebSocket';
import { useApi } from '../hooks/useApi';
import api from '../services/api';
import StatCard from './Dashboard/StatCard';
import LoadingSpinner from './Common/LoadingSpinner';
import { Server, Activity, Database, MessageSquare, Cpu, HardDrive, AlertTriangle } from 'lucide-react';
import type { SystemHealth, Incident } from '../types';

const Dashboard: React.FC = () => {
    // Fetch incidents using useApi hook
    const {
        data: incidents,
        loading: incidentsLoading,
        error: incidentsError,
        refetch: refetchIncidents
    } = useApi<Incident[]>(() => api.incidents.getAll());



    // Fetch system health
    const {
        data: systemHealth,
        loading: healthLoading,
        refetch: refetchHealth
    } = useApi<SystemHealth[]>(() => api.system.getHealth());

    // Listen for real-time incident updates via WebSocket
    useWebSocketEvent('incident.received', (data: any) => {
        console.log('New incident received:', data);
        refetchIncidents(); // Refetch incidents
        refetchHealth(); // Refetch system health
    });

    useWebSocketEvent('response.task.completed', (data: any) => {
        console.log('Response completed:', data);
        refetchIncidents(); // Refetch to update stats
        refetchHealth(); // Refetch system health
    });

    // Calculate stats from incidents data
    const totalIncidents = incidents?.length || 0;
    const criticalAlerts = incidents?.filter(
        (inc) => inc.severity === 'CRITICAL' || inc.severity === 'HIGH'
    ).length || 0;
    const resolvedIncidents = incidents?.filter((inc) => inc.status === 'RESOLVED').length || 0;
    const avgResponseTime = incidents && incidents.length > 0
        ? incidents.reduce((sum, inc) => sum + (inc.response_time || 0), 0) / incidents.length
        : 0;
    const successRate = totalIncidents > 0 ? (resolvedIncidents / totalIncidents) * 100 : 0;

    // System health data - map from backend format to frontend format
    const healthData: SystemHealth[] = (systemHealth || []).map((item: any) => ({
        service: item.name || item.service,
        status: (item.status?.toUpperCase() === 'HEALTHY' ? 'HEALTHY' :
            item.status?.toUpperCase() === 'OFFLINE' ? 'OFFLINE' : 'DEGRADED') as SystemHealth['status'],
        latency: item.latency_ms || item.latency,
        metric: item.latency_ms ? `${item.latency_ms}ms` : (item.metric || 'N/A'),
        last_checked: item.last_checked || new Date().toISOString()
    }));

    // Show loading spinner while initial data loads
    const isLoading = incidentsLoading || healthLoading;

    // Show error state if incidents fail to load
    if (incidentsError) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <AlertTriangle className="w-16 h-16 text-status-critical mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-text-primary mb-2">Failed to Load Dashboard</h2>
                    <p className="text-text-secondary mb-6">{incidentsError}</p>
                    <button
                        onClick={() => {
                            refetchIncidents();
                            refetchHealth();
                        }}
                        className="px-6 py-3 bg-accent-teal text-white rounded-lg hover:bg-accent-teal/80 transition-colors"
                    >
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <LoadingSpinner size="large" />
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {/* Title Section */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-text-primary mb-2">
                    Security Operations Dashboard
                </h1>
                <p className="text-text-secondary">Real-time threat monitoring & response</p>
            </div>

            {/* Stat Cards Grid - gap-6 (24px) */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                    title="Total Incidents"
                    value={totalIncidents}
                    icon="shield"
                    color="teal"
                    isLoading={incidentsLoading}
                />

                <StatCard
                    title="Critical Alerts"
                    value={criticalAlerts}
                    icon="alert"
                    color="red"
                    isPulsing={criticalAlerts > 0}
                    isLoading={incidentsLoading}
                />

                <StatCard
                    title="Avg Response Time"
                    value={`${Math.round(avgResponseTime)}s`}
                    icon="timer"
                    color={avgResponseTime < 60 ? 'green' : avgResponseTime < 120 ? 'amber' : 'red'}
                    isLoading={incidentsLoading}
                />

                <StatCard
                    title="Success Rate"
                    value={`${successRate.toFixed(1)}%`}
                    icon="target"
                    color={successRate >= 80 ? 'green' : successRate >= 60 ? 'amber' : 'red'}
                    progress={successRate}
                    isLoading={incidentsLoading}
                />
            </div>

            {/* Charts Section - 2x2 Grid with gap-6 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Incident Trends Chart */}
                <div className="bg-dark-surface rounded-lg border border-accent-teal/10 p-6 shadow-lg">
                    <h2 className="text-xl font-bold text-text-primary mb-6">
                        Incident Volume (Last 7 Days)
                    </h2>
                    <div className="h-80 flex items-center justify-center">
                        <div className="text-center text-text-secondary">
                            <Activity size={48} className="mx-auto mb-4 opacity-50" />
                            <p className="text-sm">Chart: Incident Trends</p>
                            <p className="text-xs mt-2">Line chart showing incident volume over time</p>
                        </div>
                    </div>
                </div>

                {/* Threat Breakdown Chart */}
                <div className="bg-dark-surface rounded-lg border border-accent-teal/10 p-6 shadow-lg">
                    <h2 className="text-xl font-bold text-text-primary mb-6">Threat Breakdown</h2>
                    <div className="h-80 flex items-center justify-center">
                        <div className="text-center text-text-secondary">
                            <Database size={48} className="mx-auto mb-4 opacity-50" />
                            <p className="text-sm">Chart: Threat Categories</p>
                            <p className="text-xs mt-2">Pie chart showing threat type distribution</p>
                        </div>
                    </div>
                </div>

                {/* Status Distribution Chart */}
                <div className="bg-dark-surface rounded-lg border border-accent-teal/10 p-6 shadow-lg">
                    <h2 className="text-xl font-bold text-text-primary mb-6">Status Distribution</h2>
                    <div className="h-80 flex items-center justify-center">
                        <div className="text-center text-text-secondary">
                            <Cpu size={48} className="mx-auto mb-4 opacity-50" />
                            <p className="text-sm">Chart: Incident Status</p>
                            <p className="text-xs mt-2">Bar chart showing current status breakdown</p>
                        </div>
                    </div>
                </div>

                {/* System Health */}
                <div className="bg-dark-surface rounded-lg border border-accent-teal/10 p-6 shadow-lg">
                    <h2 className="text-xl font-bold text-text-primary mb-6">System Health</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {healthData && healthData.length > 0 ? (
                            healthData.map((service: SystemHealth, index: number) => (
                                <SystemHealthCard key={index} service={service} />
                            ))
                        ) : (
                            <div className="col-span-2 text-center text-text-secondary py-8">
                                <Server size={32} className="mx-auto mb-2 opacity-50" />
                                <p className="text-sm">No health data available</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Recent Incidents Table */}
            <div className="bg-dark-surface rounded-lg border border-accent-teal/10 p-6 shadow-lg">
                <h2 className="text-xl font-bold text-text-primary mb-6">Recent Incidents</h2>

                {!incidents || incidents.length === 0 ? (
                    <div className="text-center py-12 text-text-secondary">
                        <Server size={48} className="mx-auto mb-4 opacity-50" />
                        <p>No incidents detected</p>
                        <p className="text-xs mt-2">The system is monitoring for threats</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="text-left text-text-secondary text-sm border-b border-accent-teal/10">
                                    <th className="pb-3 font-medium">Incident ID</th>
                                    <th className="pb-3 font-medium">Source IP</th>
                                    <th className="pb-3 font-medium">Severity</th>
                                    <th className="pb-3 font-medium">Status</th>
                                    <th className="pb-3 font-medium">Created</th>
                                </tr>
                            </thead>
                            <tbody className="text-text-primary">
                                {incidents.slice(0, 10).map((incident) => (
                                    <tr
                                        key={incident.incident_id}
                                        className="border-b border-accent-teal/5 hover:bg-accent-teal/5 transition-colors"
                                    >
                                        <td className="py-4 font-mono text-sm text-accent-teal">
                                            {incident.incident_id.slice(0, 8)}...
                                        </td>
                                        <td className="py-4 font-mono text-sm">{incident.source_ip}</td>
                                        <td className="py-4">
                                            <SeverityBadge severity={incident.severity} />
                                        </td>
                                        <td className="py-4">
                                            <StatusBadge status={incident.status} />
                                        </td>
                                        <td className="py-4 text-sm text-text-secondary">
                                            {new Date(incident.created_at).toLocaleString()}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

// System Health Card Component
interface SystemHealthCardProps {
    service: SystemHealth;
}

const SystemHealthCard: React.FC<SystemHealthCardProps> = ({ service }) => {
    const statusColors: Record<string, string> = {
        HEALTHY: 'bg-status-success',
        DEGRADED: 'bg-status-warning',
        OFFLINE: 'bg-status-critical',
    };

    const iconMap: Record<string, any> = {
        Gateway: Server,
        'Triage AI': Cpu,
        Response: Activity,
        Database: Database,
        RabbitMQ: MessageSquare,
        Celery: HardDrive,
    };

    const Icon = iconMap[service.service] || Server;

    return (
        <div className="flex items-center gap-3 p-3 bg-dark-bg/50 rounded-lg border border-accent-teal/10">
            <Icon size={20} className="text-accent-teal" />
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${statusColors[service.status]}`} />
                    <span className="text-sm font-medium text-text-primary truncate">
                        {service.service}
                    </span>
                </div>
                <span className="text-xs text-text-secondary">{service.metric}</span>
            </div>
        </div>
    );
};

// Severity Badge Component
const SeverityBadge: React.FC<{ severity: string }> = ({ severity }) => {
    const colors: Record<string, string> = {
        CRITICAL: 'bg-status-critical/10 text-status-critical border-status-critical/30',
        HIGH: 'bg-status-critical/10 text-status-critical border-status-critical/30',
        MEDIUM: 'bg-status-warning/10 text-status-warning border-status-warning/30',
        LOW: 'bg-status-success/10 text-status-success border-status-success/30',
        INFO: 'bg-accent-teal/10 text-accent-teal border-accent-teal/30',
    };

    return (
        <span
            className={`px-3 py-1 rounded-full text-xs font-medium border ${colors[severity] || colors.INFO
                }`}
        >
            {severity}
        </span>
    );
};

// Status Badge Component
const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
    const colors: Record<string, string> = {
        NEW: 'bg-accent-teal/10 text-accent-teal border-accent-teal/30',
        PENDING: 'bg-accent-teal/10 text-accent-teal border-accent-teal/30',
        INVESTIGATING: 'bg-status-warning/10 text-status-warning border-status-warning/30',
        RESOLVED: 'bg-status-success/10 text-status-success border-status-success/30',
        ESCALATED: 'bg-status-critical/10 text-status-critical border-status-critical/30',
    };

    return (
        <span
            className={`px-3 py-1 rounded-full text-xs font-medium border ${colors[status] || colors.NEW
                }`}
        >
            {status}
        </span>
    );
};

export default Dashboard;
