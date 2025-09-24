import React, { useState, useEffect } from 'react';
import { useIncidents } from '../contexts/IncidentContext';
import IncidentTrendsChart from '../components/Dashboard/IncidentTrendsChart';
import IncidentTypes from '../components/Dashboard/IncidentTypes';
import StatusDistribution from '../components/Dashboard/StatusDistribution';
import { getIncidentStats } from '../services/api';
import IncidentTable from '../components/IncidentTable'; // Import IncidentTable

const LoadingSpinner = () => (
  <div className="p-6 text-center text-gray-500">Loading dashboard...</div>
);

const ErrorMessage = ({ message }: { message: string }) => (
  <div className="p-6 text-center text-red-600">Error: {message}</div>
);

const Dashboard: React.FC = () => {
  const { state } = useIncidents();
  const { incidents } = state;

  const [stats, setStats] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchStats = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getIncidentStats();
      setStats(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [incidents]);

  if (loading) return <LoadingSpinner />;

  if (error) return <ErrorMessage message={error} />;

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Security Operations Dashboard</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <IncidentTrendsChart data={stats.trends} />
        <IncidentTypes data={stats.types} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <StatusDistribution data={stats.status} />
      </div>

      {/* Incident table with workflow button */}
      <div className="mt-6">
        <h2 className="text-xl font-semibold mb-2">Recent Incidents</h2>
        <IncidentTable incidents={incidents} onRespond={() => { /* your respond handler here */ }} />
      </div>

      {/* Optionally: Add a refresh button */}
      <button
        onClick={fetchStats}
        className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
      >
        Refresh Stats
      </button>
    </div>
  );
};

export default Dashboard;
