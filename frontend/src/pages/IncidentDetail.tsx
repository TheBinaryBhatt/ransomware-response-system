// src/pages/IncidentDetail.tsx
import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../services/api";
import type { Incident } from "../types/Incident";
import { motion } from "framer-motion";
import { Shield, Brain, Workflow, Activity, AlertTriangle } from "lucide-react";

// Pretty-print JSON
const JsonBlock = ({ data }: { data: unknown }) => (
  <pre className="bg-dark-secondary p-4 rounded-lg text-sm text-gray-300 overflow-x-auto border border-dark-secondary/40">
    {JSON.stringify(data, null, 2)}
  </pre>
);

const IncidentDetail: React.FC = () => {
  const { id } = useParams();
  const [incident, setIncident] = useState<Incident | null>(null);
  const [workflow, setWorkflow] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Fetch incident details (triage or response)
  const fetchIncident = async () => {
    try {
      const data = await api.getIncidentById(id!);
      setIncident(data);
    } catch (err) {
      console.error("Failed to load incident:", err);
    }
  };

  // Fetch workflow timeline (Celery task status)
  const fetchWorkflow = async () => {
    try {
      const res = await api.getWorkflowStatus(id!);
      setWorkflow(res);
    } catch (err) {
      console.warn("Workflow not started yet.");
    }
  };

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchIncident(), fetchWorkflow()]).finally(() =>
      setLoading(false)
    );
  }, [id]);

  if (loading || !incident)
    return <div className="p-6 text-gray-400">Loading incident details...</div>;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-2xl font-bold text-cream">Incident Details</h1>
          <p className="text-gray-400">{incident.id}</p>
        </div>
      </motion.div>

      {/* GRID - 3D Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* AI Card */}
        <motion.div
          whileHover={{ scale: 1.03, rotateX: 4, rotateY: -4 }}
          className="bg-dark-surface p-6 rounded-xl border border-dark-secondary shadow-xl"
        >
          <div className="flex items-center gap-3 mb-3">
            <Brain className="text-teal-400" />
            <h2 className="text-lg font-semibold text-cream">AI Analysis</h2>
          </div>

          <div className="space-y-2">
            <p className="text-gray-400">
              <span className="text-cream font-medium">Decision:</span>{" "}
              {incident.decision ?? "Not analyzed"}
            </p>
            <p className="text-gray-400">
              <span className="text-cream font-medium">Confidence:</span>{" "}
              {(incident.confidence ?? 0 * 100).toFixed(0)}%
            </p>

            {incident.reasoning && (
              <div>
                <p className="text-cream font-medium mb-1">AI Reasoning</p>
                <div className="bg-dark-secondary/60 p-3 rounded-lg text-gray-300 text-sm border border-dark-secondary/40">
                  {incident.reasoning}
                </div>
              </div>
            )}
          </div>
        </motion.div>

        {/* Status Card */}
        <motion.div
          whileHover={{ scale: 1.03, rotateX: 4, rotateY: 4 }}
          className="bg-dark-surface p-6 rounded-xl border border-dark-secondary shadow-xl"
        >
          <div className="flex items-center gap-3 mb-3">
            <Shield className="text-yellow-400" />
            <h2 className="text-lg font-semibold text-cream">Incident Status</h2>
          </div>

          <p className="text-gray-400">
            <span className="text-cream font-medium">Status:</span>{" "}
            {incident.status ?? "unknown"}
          </p>

          {incident.response_status && (
            <p className="text-gray-400">
              <span className="text-cream font-medium">Response:</span>{" "}
              {incident.response_status}
            </p>
          )}
        </motion.div>

        {/* Workflow Card */}
        <motion.div
          whileHover={{ scale: 1.03, rotateX: -4, rotateY: -4 }}
          className="bg-dark-surface p-6 rounded-xl border border-dark-secondary shadow-xl"
        >
          <div className="flex items-center gap-3 mb-3">
            <Workflow className="text-orange-400" />
            <h2 className="text-lg font-semibold text-cream">Response Workflow</h2>
          </div>

          {!workflow || workflow.status === "not_started" ? (
            <p className="text-gray-500 text-sm">No workflow started yet.</p>
          ) : (
            <div className="text-gray-300 text-sm space-y-2">
              <p>
                <span className="text-cream font-medium">State:</span>{" "}
                {workflow.state}
              </p>
              {workflow.info && (
                <JsonBlock data={workflow.info} />
              )}
            </div>
          )}
        </motion.div>
      </div>

      {/* Raw Data Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-dark-surface border border-dark-secondary rounded-xl p-6"
      >
        <div className="flex items-center gap-2 mb-4">
          <Activity className="text-teal-400" />
          <h2 className="text-lg font-semibold text-cream">Raw Alert Data</h2>
        </div>
        <JsonBlock data={incident.raw_data} />
      </motion.div>

      {/* Actions Taken */}
      {incident.actions_taken?.length ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-dark-surface border border-dark-secondary rounded-xl p-6"
        >
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="text-red-400" />
            <h2 className="text-lg font-semibold text-cream">Actions Taken</h2>
          </div>

          <JsonBlock data={incident.actions_taken} />
        </motion.div>
      ) : null}
    </div>
  );
};

export default IncidentDetail;
