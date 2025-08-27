import React from 'react';
import { Incident } from '../types/Incident';
import { AlertTriangle, Shield, CheckCircle } from 'lucide-react';

interface IncidentTableProps {
  incidents: Incident[];
  onRespond: (incidentId: string) => void;
}

const IncidentTable: React.FC<IncidentTableProps> = ({ incidents, onRespond }) => {
  const getSeverityIcon = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'high':
        return <AlertTriangle className="text-red-500" size={20} />;
      case 'medium':
        return <Shield className="text-yellow-500" size={20} />;
      default:
        return <CheckCircle className="text-green-500" size={20} />;
    }
  };

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full table-auto">
        <thead>
          <tr className="bg-gray-100">
            <th className="px-4 py-2">Severity</th>
            <th className="px-4 py-2">Description</th>
            <th className="px-4 py-2">Source IP</th>
            <th className="px-4 py-2">Status</th>
            <th className="px-4 py-2">Received At</th>
            <th className="px-4 py-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {incidents.map((incident) => (
            <tr key={incident.id} className="border-b">
              <td className="px-4 py-2 flex items-center">
                {getSeverityIcon(incident.severity)}
                <span className="ml-2">{incident.severity}</span>
              </td>
              <td className="px-4 py-2">{incident.description}</td>
              <td className="px-4 py-2">{incident.source_ip}</td>
              <td className="px-4 py-2">
                <span className={`px-2 py-1 rounded ${
                  incident.status === 'detected' ? 'bg-yellow-100 text-yellow-800' :
                  incident.status === 'action_taken' ? 'bg-green-100 text-green-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {incident.status}
                </span>
              </td>
              <td className="px-4 py-2">
                {new Date(incident.received_at).toLocaleString()}
              </td>
              <td className="px-4 py-2">
                <button
                  onClick={() => onRespond(incident.id)}
                  className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
                >
                  Execute Response
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default IncidentTable;