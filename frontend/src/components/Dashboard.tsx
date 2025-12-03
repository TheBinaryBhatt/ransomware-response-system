// src/components/Dashboard.tsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';

interface Incident {
    id: string;
    source: string;
    status: string;
    decision?: string;
    ai_confidence?: number;
    created_at: string;
}

const Dashboard: React.FC = () => {
    const [incidents, setIncidents] = useState<Incident[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        fetchIncidents();
    }, []);

    const fetchIncidents = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get('http://localhost:8001/api/v1/incidents', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setIncidents(response.data.incidents || response.data || []);
            setError('');
        } catch (err: any) {
            console.error('Failed to fetch incidents:', err);
            setError('Failed to load incidents');
        } finally {
            setLoading(false);
        }
    };

    // Calculate stats
    const activeIncidents = incidents.filter(i => i.status !== 'RESOLVED').length;
    const confirmedRansomware = incidents.filter(i => i.decision === 'confirmed_ransomware').length;
    const avgConfidence = incidents.length > 0
        ? Math.round(incidents.reduce((sum, i) => sum + (i.ai_confidence || 0), 0) / incidents.length * 100)
        : 0;

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-white mb-2">Security Operations Dashboard</h1>
                <p className="text-gray-400">Real-time threat monitoring & response</p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                    title="Active Incidents"
                    value={activeIncidents}
                    icon="⚠️"
                    color="red"
                />
                <StatCard
                    title="Confirmed Ransomware"
                    value={confirmedRansomware}
                    icon="🛡️"
                    color="orange"
                />
                <StatCard
                    title="Total Incidents"
                    value={incidents.length}
                    icon="📊"
                    color="blue"
                />
                <StatCard
                    title="Avg AI Confidence"
                    value={`${avgConfidence}%`}
                    icon="🤖"
                    color="teal"
                />
            </div>

            {/* Recent Incidents Table */}
            <div className="bg-gray-800 rounded-lg border border-gray-700">
                <div className="p-6 border-b border-gray-700">
                    <h2 className="text-xl font-bold text-white">Recent Incidents</h2>
                </div>

                <div className="p-6">
                    {loading ? (
                        <div className="text-center py-12 text-gray-400">Loading incidents...</div>
                    ) : error ? (
                        <div className="text-center py-12">
                            <p className="text-red-400 mb-4">{error}</p>
                            <button
                                onClick={fetchIncidents}
                                className="px-4 py-2 bg-teal-500 hover:bg-teal-600 text-white rounded-lg"
                            >
                                Retry
                            </button>
                        </div>
                    ) : incidents.length === 0 ? (
                        <div className="text-center py-12 text-gray-400">
                            No incidents detected
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="text-left text-gray-400 text-sm border-b border-gray-700">
                                        <th className="pb-3 font-medium">Incident ID</th>
                                        <th className="pb-3 font-medium">Source</th>
                                        <th className="pb-3 font-medium">Status</th>
                                        <th className="pb-3 font-medium">Decision</th>
                                        <th className="pb-3 font-medium">Confidence</th>
                                        <th className="pb-3 font-medium">Created</th>
                                    </tr>
                                </thead>
                                <tbody className="text-gray-300">
                                    {incidents.slice(0, 10).map((incident) => (
                                        <tr key={incident.id} className="border-b border-gray-700/50 hover:bg-gray-700/30">
                                            <td className="py-4 font-mono text-sm text-teal-400">
                                                {incident.id.slice(0, 8)}...
                                            </td>
                                            <td className="py-4">{incident.source}</td>
                                            <td className="py-4">
                                                <StatusBadge status={incident.status} />
                                            </td>
                                            <td className="py-4">
                                                {incident.decision ? (
                                                    <span className="text-sm text-gray-400">
                                                        {incident.decision.replace(/_/g, ' ')}
                                                    </span>
                                                ) : (
                                                    <span className="text-sm text-gray-500">-</span>
                                                )}
                                            </td>
                                            <td className="py-4">
                                                {incident.ai_confidence ? (
                                                    <span className="text-sm">{Math.round(incident.ai_confidence * 100)}%</span>
                                                ) : (
                                                    <span className="text-sm text-gray-500">-</span>
                                                )}
                                            </td>
                                            <td className="py-4 text-sm text-gray-400">
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
        </div>
    );
};

// Stat Card Component
interface StatCardProps {
    title: string;
    value: string | number;
    icon: string;
    color: 'red' | 'orange' | 'blue' | 'teal';
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, color }) => {
    const colorClasses = {
        red: 'from-red-500/20 to-red-600/20 border-red-500/50',
        orange: 'from-orange-500/20 to-orange-600/20 border-orange-500/50',
        blue: 'from-blue-500/20 to-blue-600/20 border-blue-500/50',
        teal: 'from-teal-500/20 to-teal-600/20 border-teal-500/50',
    };

    return (
        <div className={`bg-gradient-to-br ${colorClasses[color]} border rounded-lg p-6`}>
            <div className="flex items-center justify-between mb-4">
                <span className="text-3xl">{icon}</span>
            </div>
            <div>
                <div className="text-3xl font-bold text-white mb-1">{value}</div>
                <div className="text-sm text-gray-400">{title}</div>
            </div>
        </div>
    );
};

// Status Badge Component
const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
    const colors: Record<string, string> = {
        NEW: 'bg-blue-500/20 text-blue-400 border-blue-500/50',
        INVESTIGATING: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50',
        RESOLVED: 'bg-green-500/20 text-green-400 border-green-500/50',
        ESCALATED: 'bg-red-500/20 text-red-400 border-red-500/50',
    };

    return (
        <span className={`px-3 py-1 rounded-full text-xs font-medium border ${colors[status] || colors.NEW}`}>
            {status}
        </span>
    );
};

export default Dashboard;
