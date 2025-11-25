// src/components/IncidentTable.tsx
import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, AlertTriangle, Shield } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { Incident } from "../types/Incident";

interface IncidentTableProps {
  incidents: Incident[];
  onRespond?: (incidentId: string) => void;
}

const statusBadge = (inc: Incident) => {
  // Prefer response_status (response lifecycle) else triage status
  const s = inc.response_status ?? inc.status ?? "unknown";
  const map: Record<string, string> = {
    pending: "bg-yellow-500/20 text-yellow-300",
    triaged: "bg-teal-500/20 text-teal-300",
    action_taken: "bg-green-500/20 text-green-300",
    failed: "bg-red-500/20 text-red-300",
    new: "bg-blue-500/20 text-blue-300",
    unknown: "bg-gray-600/20 text-gray-300",
  };
  return map[s] ?? "bg-gray-600/20 text-gray-300";
};

const IncidentTable: React.FC<IncidentTableProps> = ({ incidents, onRespond }) => {
  const navigate = useNavigate();
  const [highlighted, setHighlighted] = useState<string | null>(null);

  // Briefly highlight newest incoming incident
  useEffect(() => {
    if (!incidents || incidents.length === 0) {
      setHighlighted(null);
      return;
    }
    const newest = incidents[0];
    if (!newest) return;
    setHighlighted(newest.id);
    const t = setTimeout(() => setHighlighted(null), 2200);
    return () => clearTimeout(t);
  }, [incidents]);

  const openDetail = (id: string) => {
    navigate(`/incidents/${id}`);
  };

  const prettyTime = (iso?: string) => {
    if (!iso) return "—";
    try {
      return new Date(iso).toLocaleString();
    } catch {
      return iso;
    }
  };

  const extractSourceIP = (inc: Incident) => {
    // many ingestion payloads place IPs in raw_data with different keys
    const r = inc.raw_data as Record<string, any> | undefined;
    return r?.source_ip ?? r?.src_ip ?? r?.ip ?? r?.src ?? "—";
  };

  return (
    <div className="relative overflow-hidden">
      {/* top shadow */}
      <div className="pointer-events-none absolute top-0 left-0 right-0 h-6 bg-gradient-to-b from-black/40 to-transparent z-10" />

      <div className="overflow-auto max-h-[520px]">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-dark-secondary/60 sticky top-0 backdrop-blur-sm z-20">
              <th className="p-4 text-sm text-gray-400 font-medium">Incident</th>
              <th className="p-4 text-sm text-gray-400 font-medium">Source</th>
              <th className="p-4 text-sm text-gray-400 font-medium">Decision</th>
              <th className="p-4 text-sm text-gray-400 font-medium">Confidence</th>
              <th className="p-4 text-sm text-gray-400 font-medium">Status</th>
              <th className="p-4 text-sm text-gray-400 font-medium">Actions</th>
              <th className="p-4 text-sm text-gray-400 font-medium">Time</th>
              <th className="p-4 text-sm text-gray-400 font-medium text-right">Controls</th>
            </tr>
          </thead>

          <AnimatePresence>
            <tbody className="divide-y divide-dark-secondary/50 text-cream">
              {incidents.map((inc) => {
                const isCritical = inc.decision === "confirmed_ransomware";
                const confPercent = Math.round((inc.confidence ?? 0) * 100);
                const actionsCount = Array.isArray(inc.actions_taken) ? inc.actions_taken.length : 0;
                const rowHighlight = highlighted === inc.id;

                return (
                  <motion.tr
                    key={inc.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.22 }}
                    onClick={() => openDetail(inc.id)}
                    className={`
                      cursor-pointer transition-all
                      ${rowHighlight ? "bg-teal-500/10" : ""}
                      ${isCritical ? "hover:bg-red-600/8" : "hover:bg-dark-secondary/40"}
                    `}
                  >
                    {/* Incident */}
                    <td className="p-4 align-middle whitespace-nowrap">
                      <div className="font-mono text-sm text-teal-300">{inc.siem_alert_id ?? inc.id}</div>
                      <div className="text-xs text-gray-400 mt-1">{inc.source}</div>
                    </td>

                    {/* Source IP / origin */}
                    <td className="p-4 align-middle text-sm text-gray-300">
                      {extractSourceIP(inc)}
                    </td>

                    {/* Decision */}
                    <td className="p-4 align-middle text-sm">
                      <div className="flex items-center gap-2">
                        {isCritical ? (
                          <AlertTriangle className="w-4 h-4 text-red-400" />
                        ) : (
                          <Shield className="w-4 h-4 text-teal-400" />
                        )}
                        <div className="text-sm text-cream">{inc.decision ?? "pending"}</div>
                      </div>
                      {inc.reasoning && (
                        <div className="text-xs text-gray-400 mt-1 line-clamp-2">{inc.reasoning}</div>
                      )}
                    </td>

                    {/* Confidence */}
                    <td className="p-4 align-middle text-sm text-teal-300 font-semibold">
                      {confPercent}%
                    </td>

                    {/* Status */}
                    <td className="p-4 align-middle">
                      <span className={`${statusBadge(inc)} px-3 py-1 text-xs rounded-full border`}>
                        {inc.response_status ?? inc.status ?? "unknown"}
                      </span>
                    </td>

                    {/* Actions taken */}
                    <td className="p-4 align-middle text-sm text-gray-300">
                      {actionsCount > 0 ? `${actionsCount} executed` : "—"}
                    </td>

                    {/* Time */}
                    <td className="p-4 align-middle text-sm text-gray-400 whitespace-nowrap">
                      {prettyTime(inc.created_at ?? inc.timestamp)}
                    </td>

                    {/* Controls */}
                    <td className="p-4 align-middle text-right">
                      <div className="flex items-center justify-end gap-2">
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={(e) => {
                            e.stopPropagation();
                            onRespond?.(inc.id);
                          }}
                          className="px-3 py-1 text-xs rounded-md bg-teal-600/30 text-teal-200 border border-teal-500/30 hover:bg-teal-600/50 transition"
                          title="Trigger response"
                        >
                          Respond <ArrowRight className="inline w-3 h-3 ml-1" />
                        </motion.button>
                      </div>
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </AnimatePresence>
        </table>
      </div>

      {/* bottom shadow */}
      <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-t from-black/40 to-transparent" />
    </div>
  );
};

export default IncidentTable;
