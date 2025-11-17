import React, { useEffect, useState, useCallback } from "react";
import axios from "axios";

interface WorkflowStatus {
  state: string;
  info?: Record<string, unknown>;
}

const WorkflowMonitor: React.FC<{ incidentId: string }> = ({ incidentId }) => {
  const [status, setStatus] = useState<WorkflowStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const resp = await axios.get(`/workflows/${incidentId}/status`);
      setStatus(resp.data);
    } catch (e) {
      setError("Failed to fetch workflow status");
    }
  }, [incidentId]);

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  if (error) return <div>{error}</div>;
  if (!status) return <div>Loading workflow status...</div>;

  return (
    <div>
      <h2>Workflow Status for Incident {incidentId}</h2>
      <p>Current State: {status.state}</p>
      {status.info && (
        <pre style={{ whiteSpace: "pre-wrap" }}>{JSON.stringify(status.info, null, 2)}</pre>
      )}
      {/* Future: Add buttons for retry or escalate */}
    </div>
  );
};

export default WorkflowMonitor;
