import React, { useState, useEffect } from 'react';
import IncidentTable from './components/IncidentTable';
import { Incident } from './types/Incident';
import { incidentAPI } from './services/api';

function App() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchIncidents = async () => {
    try {
      setLoading(true);
      const response = await incidentAPI.getIncidents();
      if (response.data) {
        setIncidents(response.data);
      } else {
        setError(response.error || 'Failed to fetch incidents');
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleRespond = async (incidentId: string) => {
    try {
      const response = await incidentAPI.triggerResponse(incidentId);
      if (response.data) {
        alert(`Response triggered for incident ${incidentId}`);
        fetchIncidents(); // Refresh the list
      } else {
        alert(response.error || 'Failed to trigger response');
      }
    } catch (err) {
      alert('An unexpected error occurred');
    }
  };

  useEffect(() => {
    fetchIncidents();
    // Set up polling to refresh incidents every 5 seconds
    const interval = setInterval(fetchIncidents, 5000);
    return () => clearInterval(interval);
  }, []);

  if (loading) return <div className="p-8">Loading incidents...</div>;
  if (error) return <div className="p-8 text-red-500">Error: {error}</div>;

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-3xl font-bold mb-6">Ransomware Response System</h1>
      <IncidentTable incidents={incidents} onRespond={handleRespond} />
    </div>
  );
}

export default App;