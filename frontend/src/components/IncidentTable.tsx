import React from 'react';
import type { Incident} from '../types/Incident';
import { IncidentStatus } from '../types/Incident';
import { useNavigate } from 'react-router-dom'; // Import useNavigate

interface IncidentTableProps {
  incidents: Incident[];
  onRespond: (id: string) => void;
}

const IncidentTable: React.FC<IncidentTableProps> = ({ incidents, onRespond }) => {
  const navigate = useNavigate();

  return (
    <table className="min-w-full divide-y divide-gray-200">
      <thead className="bg-gray-50">
        <tr>
          <th className="px-4 py-2">ID</th>
          <th className="px-4 py-2">SIEM Alert ID</th>
          <th className="px-4 py-2">Status</th>
          <th className="px-4 py-2">Actions</th>
          <th className="px-4 py-2">Workflow</th> {/* New column */}
        </tr>
      </thead>
      <tbody className="bg-white divide-y divide-gray-200">
        {incidents.map(incident => (
          <tr key={incident.id}>
            <td className="px-4 py-2">{incident.id}</td>
            <td className="px-4 py-2">{incident.siem_alert_id}</td>
            <td className="px-4 py-2">
              <span
                className={`px-2 py-1 rounded ${
                  incident.status === IncidentStatus.DETECTED
                    ? 'bg-yellow-100 text-yellow-800'
                    : incident.status === IncidentStatus.TRIAGING
                    ? 'bg-blue-100 text-blue-800'
                    : incident.status === IncidentStatus.ACTION_TAKEN
                    ? 'bg-green-100 text-green-800'
                    : 'bg-gray-100 text-gray-800'
                }`}
              >
                {incident.status}
              </span>
            </td>
            <td className="px-4 py-2">
              <button
                onClick={() => onRespond(incident.id)}
                disabled={incident.status === IncidentStatus.ACTION_TAKEN}
                className={`bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded ${
                  incident.status === IncidentStatus.ACTION_TAKEN ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                {incident.status === IncidentStatus.ACTION_TAKEN ? 'Action Taken' : 'Execute Response'}
              </button>
            </td>
            <td className="px-4 py-2">
              <button
                onClick={() => navigate(`/workflows/${incident.id}`)}
                className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
              >
                View Workflow
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

export default IncidentTable;
