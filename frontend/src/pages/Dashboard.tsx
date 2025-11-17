import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useIncidents } from "../contexts/IncidentContext";
import IncidentTrendsChart from "../components/Dashboard/IncidentTrendsChart";
import IncidentTypes from "../components/Dashboard/IncidentTypes";
import StatusDistribution from "../components/Dashboard/StatusDistribution";
import { getIncidentStats } from "../services/api";
import IncidentTable from "../components/IncidentTable";
import type { Incident } from "../types/Incident";
import type { IncidentStats } from "../services/api";

type StatsSnapshot = {
  active: number;
  confirmed: number;
  humanReview: number;
  avgConfidence: string;
};

const LoadingSpinner = () => (
  <div className="flex min-h-[40vh] items-center justify-center">
    <div className="rounded-full border border-slate-700/80 px-6 py-3 text-sm text-slate-400">
      Loading dashboard telemetry...
    </div>
  </div>
);

const ErrorMessage = ({ message }: { message: string }) => (
  <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
    Error loading dashboard: {message}
  </div>
);

const StatsCard: React.FC<{
  title: string;
  value: string | number;
  helper?: string;
  tone?: "default" | "positive" | "critical";
}> = ({ title, value, helper, tone = "default" }) => {
  const toneClasses =
    tone === "positive"
      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-100"
      : tone === "critical"
        ? "border-rose-500/30 bg-rose-500/10 text-rose-100"
        : "border-indigo-500/30 bg-slate-900/60 text-slate-100";

  return (
    <div className={`rounded-xl border px-5 py-4 shadow-lg shadow-slate-950/40 ${toneClasses}`}>
      <p className="text-xs uppercase tracking-widest text-slate-400">{title}</p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
      {helper && <p className="mt-2 text-xs text-slate-300">{helper}</p>}
    </div>
  );
};

const computeStatsSnapshot = (incidents: Incident[]): StatsSnapshot => {
  const active = incidents.filter(
    (i) => !["RESOLVED", "CLOSED", "action_taken"].includes(i.status ?? "")
  ).length;
  const confirmed = incidents.filter((i) => i.decision === "confirmed_ransomware").length;
  const humanReview = incidents.filter((i) => i.requires_human_review).length;
  const confidences = incidents
    .map((i) => i.confidence ?? i.ai_confidence)
    .filter((value): value is number => typeof value === "number");
  const avgConfidence =
    confidences.length > 0
      ? `${Math.round(
        (confidences.reduce((acc, curr) => acc + curr, 0) / confidences.length) * 100
      )}%`
      : "--";

  return {
    active,
    confirmed,
    humanReview,
    avgConfidence: avgConfidence === "--" ? "--" : `${avgConfidence}`
  };
};

const Dashboard: React.FC = () => {
  const { state } = useIncidents();
  const { incidents } = state;

  const [stats, setStats] = useState<IncidentStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getIncidentStats();
      setStats(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats, incidents]);

  const snapshot = useMemo(() => computeStatsSnapshot(incidents), [incidents]);

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={error} />;
  if (!stats) return <ErrorMessage message="No telemetry available" />;

  return (
    <div className="px-6 py-8 space-y-10">
      <section className="rounded-2xl border border-indigo-500/20 bg-gradient-to-r from-indigo-600/20 via-slate-900/80 to-slate-900/40 p-8 shadow-2xl shadow-indigo-900/30">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-indigo-200/80">
              Real-time Security Telemetry
            </p>
            <h1 className="mt-2 text-3xl font-bold text-slate-50">
              Enterprise Ransomware Response Dashboard
            </h1>
            <p className="mt-3 max-w-xl text-sm text-slate-200/70">
              Track AI-powered triage decisions, automated containment, and human escalation points
              across the entire response pipeline.
            </p>
          </div>
          <div className="rounded-xl border border-slate-500/30 bg-slate-900/50 px-6 py-4 text-sm text-slate-300">
            <p className="text-xs uppercase tracking-widest text-slate-400">Last Sync</p>
            <p className="mt-1 font-semibold">{new Date().toLocaleString()}</p>
            <button
              onClick={fetchStats}
              className="mt-3 inline-flex items-center justify-center rounded-md border border-indigo-400/40 px-3 py-1 text-xs font-semibold text-indigo-100 transition hover:bg-indigo-500/20"
            >
              Refresh Metrics
            </button>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatsCard
          title="Active Incidents"
          value={snapshot.active}
          helper="Currently tracked threats awaiting containment or review."
          tone={snapshot.active > 0 ? "critical" : "positive"}
        />
        <StatsCard
          title="Confirmed Ransomware"
          value={snapshot.confirmed}
          helper="AI triage marked these incidents as confirmed ransomware."
          tone={snapshot.confirmed > 0 ? "critical" : "default"}
        />
        <StatsCard
          title="Needs Human Review"
          value={snapshot.humanReview}
          helper="Incidents flagged for analyst escalation."
        />
        <StatsCard
          title="Average AI Confidence"
          value={snapshot.avgConfidence}
          helper="Mean confidence score across latest triage decisions."
          tone="positive"
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-2xl border border-slate-800/60 bg-slate-900/60 p-6 shadow-xl shadow-slate-950/40">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-50">Incident Velocity</h2>
            <span className="text-xs text-slate-400">Last 7 days</span>
          </div>
          <IncidentTrendsChart data={stats.trends} />
        </div>
        <div className="rounded-2xl border border-slate-800/60 bg-slate-900/60 p-6 shadow-xl shadow-slate-950/40">
          <h2 className="text-lg font-semibold text-slate-50">Threat Breakdown</h2>
          <IncidentTypes data={stats.types} />
        </div>
      </section>

      <section className="rounded-2xl border border-slate-800/60 bg-slate-900/60 p-6 shadow-2xl shadow-slate-950/40">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-50">Response Status Distribution</h2>
          <span className="text-xs text-slate-400">Auto-updated whenever new events stream in</span>
        </div>
        <StatusDistribution data={stats.status} />
      </section>

      <section className="rounded-2xl border border-slate-800/60 bg-slate-900/60 p-6 shadow-2xl shadow-slate-950/40">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-50">Recent Incidents</h2>
            <p className="text-xs text-slate-400">
              Live stream of incidents with workflow shortcuts and context.
            </p>
          </div>
          <span className="rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3 py-1 text-xs text-indigo-200">
            Streaming from RabbitMQ topic: <span className="font-mono text-indigo-100">incident.*</span>
          </span>
        </div>
        <div className="mt-4 rounded-xl border border-slate-800/60 bg-slate-950/30">
          <IncidentTable incidents={incidents} onRespond={() => undefined} />
        </div>
      </section>
    </div>
  );
};

export default Dashboard;
