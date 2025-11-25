// src/pages/WorkflowMonitor.tsx
import React, { useState, useEffect, useCallback } from "react";
import { useParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Play,
  CheckCircle,
  Clock,
  AlertTriangle,
  Server,
  Network,
  Database,
  Bell,
  Shield,
  RefreshCw,
  MinusCircle,
} from "lucide-react";
import { api, apiClient } from "../services/api";
import type { AxiosError } from "axios";
import type { LucideIcon } from "lucide-react";


/**
 * Workflow Monitor (live)
 *
 * - Polls the backend workflow status endpoint:
 *   GET /response/workflows/{incidentId}/status
 *
 * - Handles multiple info shapes from AsyncResult:
 *   - { steps: [{ step, status, timestamp, logs }] }
 *   - { completed_steps: [...], current_step: "x", errors: [...] }
 *   - { step: "name", ... }
 *
 * - Graceful on missing control endpoints (404) and shows user-friendly messages.
 */

// Local step descriptor & mapping
type StepStatus = "pending" | "running" | "completed" | "failed";

interface WorkflowStep {
  id: string;
  name: string;
  key: string;
  status: StepStatus;
  timestamp?: string;
  duration?: string;
  logs: string[];
  icon: LucideIcon;
}


// Canonical workflow step keys and friendly names (you can extend)
const DEFAULT_WORKFLOW_ORDER = [
  { key: "lookup_ip", name: "IP Reputation Lookup", icon: Database },
  { key: "quarantine_host", name: "Quarantine Host", icon: Server },
  { key: "block_ip", name: "Block IP", icon: Network },
  { key: "enrich_intel", name: "Enrich Threat Intel", icon: Database },
  { key: "yara_scan", name: "YARA Scan", icon: Bell },
  { key: "virustotal_lookup", name: "VirusTotal Lookup", icon: Database },
  { key: "conditional_escalation", name: "Conditional Escalation", icon: Bell },
  { key: "finalize", name: "Finalize Response", icon: Shield },
];

const intervalMs = 3000;

const WorkflowMonitor: React.FC = () => {
  const { incidentId } = useParams<{ incidentId: string }>();
  const [steps, setSteps] = useState<WorkflowStep[]>([]);
  const [stateLabel, setStateLabel] = useState<string>("not_started");
  const [rawInfo, setRawInfo] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [_refreshTick, setRefreshTick] = useState(0);

  // Build initial empty steps from DEFAULT_WORKFLOW_ORDER
  const buildBaseSteps = useCallback(() => {
    return DEFAULT_WORKFLOW_ORDER.map((s, idx) => ({
      id: `${s.key}-${idx}`,
      name: s.name,
      key: s.key,
      status: "pending" as StepStatus,
      logs: [] as string[],
      icon: s.icon,
    }));
  }, []);

  // Map backend info -> WorkflowStep[]
  const mapInfoToSteps = useCallback(
    (state: string, info: any) => {
      setStateLabel(state ?? "unknown");
      setRawInfo(info ?? null);

      // Start with canonical list
      const base = buildBaseSteps();

      // Helper to set a step status by key
      const setStep = (key: string, patch: Partial<WorkflowStep>) => {
        const idx = base.findIndex((b) => b.key === key);
        if (idx === -1) {
          // Unknown step: add to end
          base.push({
            id: `${key}-${base.length}`,
            name: key.replace(/_/g, " "),
            key,
            status: (patch.status as StepStatus) ?? "pending",
            logs: (patch.logs as string[]) ?? [],
            icon: Database,
            ...patch,
          } as WorkflowStep);
        } else {
          base[idx] = { ...base[idx], ...patch };
        }
      };

      // If info already contains `steps` (structured)
      if (info && Array.isArray(info.steps) && info.steps.length > 0) {
        info.steps.forEach((s: any, i: number) => {
          const key = s.key ?? s.step ?? `step_${i}`;
          setStep(key, {
            name: s.name ?? base.find((b) => b.key === key)?.name ?? key,
            status: (s.status ?? s.state ?? "pending") as StepStatus,
            timestamp: s.timestamp ?? s.at,
            duration: s.duration,
            logs: Array.isArray(s.logs) ? s.logs : s.log ? [s.log] : [],
          });
        });

        // final override based on top-level state
        if (state === "SUCCESS") {
          base.forEach((b) => {
            if (b.status === "pending") b.status = "completed";
          });
        }
        setSteps(base);
        return;
      }

      // If info has completed_steps + current_step pattern
      if (info && Array.isArray(info.completed_steps)) {
        info.completed_steps.forEach((k: string) => {
          setStep(k, { status: "completed" });
        });
        if (info.current_step) {
          setStep(info.current_step, { status: "running" });
        } else if (info.step) {
          setStep(info.step, { status: "running" });
        }
        // errors => mark as failed
        if (Array.isArray(info.errors) && info.errors.length > 0) {
          // mark last error step as failed if present
          const errStep = info.errors[0]?.step ?? info.errors[0];
          if (errStep) setStep(errStep, { status: "failed", logs: [String(info.errors[0]?.message ?? info.errors[0])] });
        }
        setSteps(base);
        return;
      }

      // If info is a simple object with 'step' or 'current'
      if (info && typeof info === "object" && (info.step || info.current_step || info.current)) {
        const running = info.current_step ?? info.step ?? info.current;
        setStep(running, { status: "running", logs: Array.isArray(info.logs) ? info.logs : info.log ? [info.log] : [] });

        // If state is SUCCESS mark completed
        if (state === "SUCCESS" || state === "SUCCESS") {
          base.forEach((b) => {
            if (b.key === running) b.status = "completed";
            else if (b.status === "pending") b.status = "completed";
          });
        }
        setSteps(base);
        return;
      }

      // If there's an info.steps_history or info.history list
      if (info && (Array.isArray(info.history) || Array.isArray(info.steps_history))) {
        const hist = info.history ?? info.steps_history;
        hist.forEach((h: any, i: number) => {
          const key = h.key ?? h.step ?? `hist_${i}`;
          setStep(key, {
            status: (h.status ?? (h.success ? "completed" : h.failed ? "failed" : "pending")) as StepStatus,
            logs: Array.isArray(h.logs) ? h.logs : h.log ? [h.log] : [],
            timestamp: h.timestamp ?? h.at,
          });
        });
        setSteps(base);
        return;
      }

      // Fallback: If nothing matches, just set top-level state to a single running step
      if (state === "STARTED" || state === "PROGRESS" || state === "RUNNING") {
        setStep(base[0].key, { status: "running" });
      } else if (state === "SUCCESS") {
        base.forEach((b) => (b.status = "completed"));
      } else if (state === "FAILURE" || state === "REVOKED" || state === "FAILURE") {
        base[0].status = "failed";
      }

      setSteps(base);
    },
    [buildBaseSteps]
  );

  // Fetch & update workflow status
  const fetchStatus = useCallback(async () => {
    if (!incidentId) return;
    setErrorMsg(null);
    try {
      const data = await api.getWorkflowStatus(incidentId);
      // API returns { state, info }
      mapInfoToSteps(data.state ?? data.status ?? "unknown", data.info ?? data);
    } catch (err: unknown) {
      const e = err as AxiosError;
      setErrorMsg(e?.message ?? "Failed to fetch workflow status");
    }
  }, [incidentId, mapInfoToSteps]);

  // Polling interval
  useEffect(() => {
    fetchStatus();
    const t = setInterval(() => {
      void fetchStatus();
      setRefreshTick((s) => s + 1);
    }, intervalMs);
    return () => clearInterval(t);
  }, [fetchStatus]);

  // Progress percentage
  const getProgressPercentage = () => {
    const completed = steps.filter((s) => s.status === "completed").length;
    return steps.length === 0 ? 0 : Math.round((completed / steps.length) * 100);
  };

  // Control actions – attempt calls to optional endpoints.
  const performAction = async (action: "force_next" | "skip_step" | "cancel") => {
    if (!incidentId) return;
    setErrorMsg(null);
    try {
      // These endpoints are optional on backend; we attempt them and handle 404 gracefully.
      const res = await apiClient.post(`/response/workflows/${incidentId}/action`, { action });
      // immediately refresh status
      await fetchStatus();
      return res.data;
    } catch (err: unknown) {
      const e = err as AxiosError;
      // 404 means backend hasn't implemented the control endpoint yet
      if (e.response && e.response.status === 404) {
        setErrorMsg(`Backend control endpoint not available for action "${action}".`);
      } else {
        setErrorMsg(e.message ?? "Failed to perform action");
      }
    }
  };

  return (
    <div className="p-6 space-y-6">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-cream">Workflow Monitor</h1>
          <p className="text-gray-400">Real-time incident response workflow tracking</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-sm text-gray-400">Incident ID</div>
            <div className="text-cream font-mono">{incidentId}</div>
            <div className="text-xs text-gray-400">State: <span className="text-teal-300 ml-2">{stateLabel}</span></div>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3 space-y-6">
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="bg-dark-surface rounded-xl border border-dark-secondary p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-cream">Response Progress</h2>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-teal-500 rounded-full animate-pulse"></div>
                <span className="text-sm text-teal-400">ACTIVE</span>
              </div>
            </div>

            <div className="space-y-2 mb-6">
              <div className="flex justify-between text-sm text-gray-400">
                <span>Overall Progress</span>
                <span>{getProgressPercentage()}%</span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-3">
                <motion.div initial={{ width: 0 }} animate={{ width: `${getProgressPercentage()}%` }} transition={{ duration: 0.7, ease: "easeOut" }} className="h-3 rounded-full bg-gradient-to-r from-teal-500 to-green-500" />
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div className="p-3 bg-dark-secondary rounded-lg">
                <div className="text-2xl font-bold text-green-400">{steps.filter((s) => s.status === "completed").length}</div>
                <div className="text-xs text-gray-400">Completed</div>
              </div>
              <div className="p-3 bg-dark-secondary rounded-lg">
                <div className="text-2xl font-bold text-teal-400">{steps.filter((s) => s.status === "running").length}</div>
                <div className="text-xs text-gray-400">Running</div>
              </div>
              <div className="p-3 bg-dark-secondary rounded-lg">
                <div className="text-2xl font-bold text-gray-400">{steps.filter((s) => s.status === "pending").length}</div>
                <div className="text-xs text-gray-400">Pending</div>
              </div>
              <div className="p-3 bg-dark-secondary rounded-lg">
                <div className="text-2xl font-bold text-yellow-400">{steps.length}</div>
                <div className="text-xs text-gray-400">Total Steps</div>
              </div>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="space-y-4">
            {steps.map((step, index) => (
              <motion.div key={step.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.06 }} className={`bg-dark-surface rounded-xl border-2 p-6 transition-all duration-300 ${step.status === "completed" ? "border-green-400 bg-green-400/6" : step.status === "running" ? "border-teal-400 bg-teal-400/6 animate-glow-pulse" : step.status === "failed" ? "border-red-400 bg-red-400/6" : "border-gray-600"}`}>
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0">
                    {step.status === "completed" ? <CheckCircle className="w-6 h-6 text-green-400" /> : step.status === "running" ? <RefreshCw className="w-6 h-6 text-teal-400 animate-spin-slow" /> : step.status === "failed" ? <AlertTriangle className="w-6 h-6 text-red-400" /> : <Clock className="w-6 h-6 text-gray-400" />}
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <step.icon className="w-5 h-5 text-gray-400" />
                        <h3 className="text-lg font-semibold text-cream">{step.name}</h3>
                      </div>
                      <div className="flex items-center gap-3">
                        {step.timestamp && <span className="text-sm text-gray-400">{new Date(step.timestamp).toLocaleTimeString()}</span>}
                        {step.duration && <span className="text-sm text-gray-400">({step.duration})</span>}
                        <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${step.status === "completed" ? "bg-green-500/20 text-green-400" : step.status === "running" ? "bg-teal-500/20 text-teal-400" : step.status === "failed" ? "bg-red-500/20 text-red-400" : "bg-gray-500/20 text-gray-400"}`}>{step.status}</span>
                      </div>
                    </div>

                    <div className="bg-dark-secondary rounded-lg p-4">
                      <div className="text-sm text-gray-400 mb-2">Execution Logs:</div>
                      <div className="space-y-1">
                        {step.logs.length > 0 ? step.logs.map((log, li) => (
                          <div key={li} className="flex items-center gap-2 text-sm">
                            <div className="w-1.5 h-1.5 bg-teal-500 rounded-full flex-shrink-0"></div>
                            <span className="text-gray-300 font-mono">{log}</span>
                          </div>
                        )) : <div className="text-sm text-gray-500 italic">No logs yet</div>}
                      </div>
                    </div>

                    {step.status === "pending" && (
                      <div className="mt-4 flex gap-2">
                        <button onClick={() => performAction("force_next")} className="flex items-center gap-2 px-3 py-1.5 bg-teal-500 hover:bg-teal-600 text-white rounded text-sm transition-colors">
                          <Play className="w-3 h-3" /> Execute Now
                        </button>
                        <button onClick={() => performAction("skip_step")} className="flex items-center gap-2 px-3 py-1.5 bg-dark-secondary hover:bg-gray-700 text-gray-400 rounded text-sm transition-colors">
                          Skip Step
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>

        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }} className="space-y-6">
          <div className="bg-dark-surface rounded-xl border border-dark-secondary p-6">
            <h3 className="text-lg font-semibold text-cream mb-4">Incident Summary</h3>
            <div className="space-y-3">
              <div>
                <div className="text-sm text-gray-400">Severity</div>
                <div className="text-cream font-semibold">HIGH</div>
              </div>
              <div>
                <div className="text-sm text-gray-400">Started</div>
                <div className="text-cream">{new Date().toLocaleTimeString()}</div>
              </div>
              <div>
                <div className="text-sm text-gray-400">Estimated Completion</div>
                <div className="text-cream">2 minutes</div>
              </div>
            </div>
          </div>

          <div className="bg-dark-surface rounded-xl border border-dark-secondary p-6">
            <h3 className="text-lg font-semibold text-cream mb-4">System Status</h3>
            <div className="space-y-3">
              {[
                { service: "Wazuh EDR", status: "connected", color: "green" },
                { service: "pfSense Firewall", status: "connected", color: "green" },
                { service: "AbuseIPDB API", status: "connected", color: "green" },
                { service: "MalwareBazaar", status: "degraded", color: "yellow" },
                { service: "VirusTotal", status: "connected", color: "green" }
              ].map((system, index) => (
                <div key={index} className="flex items-center justify-between">
                  <span className="text-sm text-cream">{system.service}</span>
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${system.color === "green" ? "bg-green-400" : system.color === "yellow" ? "bg-yellow-400" : "bg-red-400"}`}></div>
                    <span className="text-xs text-gray-400 capitalize">{system.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-dark-surface rounded-xl border border-dark-secondary p-6 space-y-3">
            <h3 className="text-lg font-semibold text-cream">Quick Actions</h3>
            {errorMsg && <div className="text-sm text-red-400">{errorMsg}</div>}
            <button onClick={() => { void fetchStatus(); }} className="w-full flex items-center gap-2 px-3 py-2 bg-dark-secondary hover:bg-teal-500/20 rounded-lg text-cream transition-colors text-sm">
              <RefreshCw className="w-4 h-4" /> Refresh Status
            </button>
            <button onClick={() => performAction("force_next")} className="w-full flex items-center gap-2 px-3 py-2 bg-dark-secondary hover:bg-teal-500/20 rounded-lg text-cream transition-colors text-sm">
              <Play className="w-4 h-4" /> Force Next Step
            </button>
            <button onClick={() => performAction("cancel")} className="w-full flex items-center gap-2 px-3 py-2 bg-dark-secondary hover:bg-red-500/20 rounded-lg text-red-400 transition-colors text-sm">
              <MinusCircle className="w-4 h-4" /> Cancel Workflow
            </button>
          </div>
        </motion.div>
      </div>

      {/* Raw info for debugging */}
      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="bg-dark-surface rounded-xl border border-dark-secondary p-4">
        <div className="text-sm text-gray-400 mb-2">Raw workflow info (debug)</div>
        <pre className="text-xs text-gray-300 overflow-auto max-h-48">{JSON.stringify(rawInfo ?? { stateLabel }, null, 2)}</pre>
      </motion.div>
    </div>
  );
};

export default WorkflowMonitor;
