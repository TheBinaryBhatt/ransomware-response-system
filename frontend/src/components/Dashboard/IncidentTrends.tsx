import React from "react";
import type { Incident } from "../../types/Incident";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface IncidentTrendsProps {
  data: Array<{
    date: string;
    ransomware: number;
    falsePositive: number;
    total: number;
  }>;
  incidents: Incident[];
}

const IncidentTrends: React.FC<IncidentTrendsProps> = ({ incidents }) => {
  // Ensure defaults
  const safeIncidents = incidents.map((i) => ({
    ...i,
    status: i.status ?? "UNKNOWN",
    severity: i.severity ?? "UNKNOWN",
    created_at: i.created_at ?? new Date().toISOString(), // fallback if missing
  }));

  // Count by severity
  const severityCount = safeIncidents.reduce((acc, incident) => {
    const severity = incident.severity ?? "UNKNOWN";
    acc[severity] = (acc[severity] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Count by status
  const statusCount = safeIncidents.reduce((acc, incident) => {
    const status = incident.status ?? "UNKNOWN";
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Summary counts
  const resolvedCount = safeIncidents.filter((i) => i.status === "RESOLVED").length;
  const activeCount = safeIncidents.filter((i) => i.status === "DETECTED").length;

  // ---- Chart Data ----
  // Group incidents by date (YYYY-MM-DD)
  const groupedByDate: Record<
    string,
    { ransomware: number; falsePositive: number; total: number }
  > = {};

  safeIncidents.forEach((incident) => {
    const date = new Date(incident.created_at).toISOString().split("T")[0];
    if (!groupedByDate[date]) {
      groupedByDate[date] = { ransomware: 0, falsePositive: 0, total: 0 };
    }
    if (incident.decision === "confirmed_ransomware") {
      groupedByDate[date].ransomware += 1;
    } else if (incident.decision === "false_positive") {
      groupedByDate[date].falsePositive += 1;
    }
    groupedByDate[date].total += 1;
  });

  const chartData = Object.entries(groupedByDate).map(([date, counts]) => ({
    date,
    ...counts,
  }));

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h3 className="text-lg font-semibold mb-4">Incident Trends</h3>

      {/* Counts */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <h4 className="text-sm font-medium text-gray-500 mb-2">By Severity</h4>
          <ul className="space-y-1">
            {Object.entries(severityCount).map(([severity, count]) => (
              <li key={severity} className="flex justify-between">
                <span className="text-sm">{severity}</span>
                <span className="font-medium">{count}</span>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="text-sm font-medium text-gray-500 mb-2">By Status</h4>
          <ul className="space-y-1">
            {Object.entries(statusCount).map(([status, count]) => (
              <li key={status} className="flex justify-between">
                <span className="text-sm">{status}</span>
                <span className="font-medium">{count}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Summary */}
      <div className="mt-4 pt-4 border-t">
        <h4 className="text-sm font-medium text-gray-500 mb-2">Summary</h4>
        <div className="grid grid-cols-3 gap-2">
          <div className="text-center p-2 bg-blue-50 rounded">
            <div className="text-2xl font-bold">{safeIncidents.length}</div>
            <div className="text-xs">Total Incidents</div>
          </div>
          <div className="text-center p-2 bg-green-50 rounded">
            <div className="text-2xl font-bold">{resolvedCount}</div>
            <div className="text-xs">Resolved</div>
          </div>
          <div className="text-center p-2 bg-red-50 rounded">
            <div className="text-2xl font-bold">{activeCount}</div>
            <div className="text-xs">Active</div>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="mt-6">
        <h4 className="text-sm font-medium text-gray-500 mb-2">Trend Over Time</h4>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="ransomware" stroke="#ff4d4f" strokeWidth={2} />
            <Line type="monotone" dataKey="falsePositive" stroke="#36cfc9" strokeWidth={2} />
            <Line type="monotone" dataKey="total" stroke="#597ef7" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default IncidentTrends;
