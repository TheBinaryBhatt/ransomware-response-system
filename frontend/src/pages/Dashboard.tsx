// src/pages/Dashboard.tsx
import React, { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { useIncidents } from "../contexts/IncidentContext";
import {
  AlertTriangle,
  Shield,
  UserCheck,
  Brain,
  RefreshCw,
} from "lucide-react";

import StatCard from "../components/Dashboard/StatCard";
import IncidentTrendsChart from "../components/Dashboard/IncidentTrendsChart";
import IncidentTypes from "../components/Dashboard/IncidentTypes";
import StatusDistribution from "../components/Dashboard/StatusDistribution";
import IncidentTable from "../components/IncidentTable";
import PageContainer from "../components/Layout/PageContainer";

const Dashboard: React.FC = () => {
  const { state, refreshIncidents } = useIncidents();
  const { incidents } = state;

  const [, setLastUpdated] = useState<Date>(new Date());


  const stats = useMemo(() => {
    const active = incidents.filter(
      (inc) => !["RESOLVED", "CLOSED"].includes(inc.status || "")
    ).length;

    const confirmed = incidents.filter(
      (inc) => inc.decision === "confirmed_ransomware"
    ).length;

    const needsReview = incidents.filter((inc) => inc.requires_human_review)
      .length;

    const confidences = incidents
      .map((inc) => inc.confidence ?? inc.ai_confidence ?? 0)
      .filter((v) => v > 0);

    const avgConfidence =
      confidences.length > 0
        ? Math.round(
            (confidences.reduce((a, b) => a + b, 0) / confidences.length) * 100
          )
        : 0;

    return {
      activeIncidents: active,
      confirmedRansomware: confirmed,
      needsReview: needsReview,
      avgConfidence: avgConfidence,
    };
  }, [incidents]);

  const handleRefresh = async () => {
    await refreshIncidents();
    setLastUpdated(new Date());
  };

  const statCards = [
    {
      title: "Active Incidents",
      value: stats.activeIncidents,
      icon: AlertTriangle,
      color: "red" as const,
      glow: stats.activeIncidents > 0,
    },
    {
      title: "Confirmed Ransomware",
      value: stats.confirmedRansomware,
      icon: Shield,
      color: "orange" as const,
      glow: stats.confirmedRansomware > 0,
    },
    {
      title: "Needs Human Review",
      value: stats.needsReview,
      icon: UserCheck,
      color: "yellow" as const,
    },
    {
      title: "Average AI Confidence",
      value: `${stats.avgConfidence}%`,
      icon: Brain,
      color: "teal" as const,
    },
  ];

  // Dummy chart data
  const chartData = [
    { date: "2024-01-15", count: 12 },
    { date: "2024-01-16", count: 18 },
    { date: "2024-01-17", count: 8 },
    { date: "2024-01-18", count: 22 },
    { date: "2024-01-19", count: 15 },
    { date: "2024-01-20", count: 25 },
    { date: "2024-01-21", count: 19 },
  ];

  const incidentTypes = [
    { name: "Ransomware", value: 45 },
    { name: "Phishing", value: 23 },
    { name: "Malware", value: 18 },
    { name: "DDoS", value: 8 },
    { name: "Other", value: 6 },
  ];

  const statusData = [
    { name: "New", value: 12 },
    { name: "In Progress", value: 8 },
    { name: "Resolved", value: 25 },
    { name: "Closed", value: 15 },
  ];

  return (
    <PageContainer>
      {/* Page Title */}
      <motion.div
        initial={{ opacity: 0, y: -15 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-3xl font-bold text-cream">
            Security Operations Dashboard
          </h1>
          <p className="text-gray-400">Real-time threat monitoring & response</p>
        </div>

        {/* Refresh Button */}
        <motion.button
          whileHover={{ scale: 1.06 }}
          whileTap={{ scale: 0.94 }}
          onClick={handleRefresh}
          className="
            flex items-center gap-2 px-4 py-2 rounded-lg 
            bg-dark-secondary/60 hover:bg-teal-500/20 
            text-gray-300 hover:text-teal-400 
            border border-dark-secondary/40 
            transition-all
          "
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </motion.button>
      </motion.div>

      {/* Stat Cards */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.15 }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
      >
        {statCards.map((card) => (
          <StatCard key={card.title} {...card} />
        ))}
      </motion.div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Trend Chart */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="
            lg:col-span-2 p-6 rounded-xl 
            bg-dark-surface/40 backdrop-blur-md 
            border border-dark-secondary/50 shadow-xl
          "
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-cream">Incident Velocity</h2>
            <span className="text-sm text-gray-400">Last 7 days</span>
          </div>
          <IncidentTrendsChart data={chartData} />
        </motion.div>

        {/* Threat & Status Charts */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="space-y-6"
        >
          <div
            className="
              p-6 rounded-xl 
              bg-dark-surface/40 backdrop-blur-md 
              border border-dark-secondary/50 shadow-xl
            "
          >
            <h2 className="text-lg font-semibold text-cream mb-4">Threat Breakdown</h2>
            <IncidentTypes data={incidentTypes} />
          </div>

          <div
            className="
              p-6 rounded-xl 
              bg-dark-surface/40 backdrop-blur-md 
              border border-dark-secondary/50 shadow-xl
            "
          >
            <h2 className="text-lg font-semibold text-cream mb-4">Status Distribution</h2>
            <StatusDistribution data={statusData} />
          </div>
        </motion.div>
      </div>

      {/* Recent Incidents */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.45 }}
        className="
          rounded-xl overflow-hidden
          bg-dark-surface/40 backdrop-blur-md 
          border border-dark-secondary/50 shadow-xl
        "
      >
        <div className="p-6 border-b border-dark-secondary/50 flex items-center justify-between">
          <h2 className="text-xl font-bold text-cream">Recent Incidents</h2>

          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-teal-500 rounded-full animate-pulse"></div>
            <span className="text-sm text-teal-400">LIVE</span>
          </div>
        </div>

        <IncidentTable incidents={incidents.slice(0, 10)} onRespond={() => console.log("Respond clicked")} />
      </motion.div>
    </PageContainer>
  );
};

export default Dashboard;
