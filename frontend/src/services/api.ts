import axios from 'axios';
import { Incident } from '../types/Incident';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api/v1';

function getAuthHeaders() {
  const token = localStorage.getItem('jwt_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export const api = {
  getIncidents: async (): Promise<Incident[]> => {
    const response = await axios.get(`${API_BASE_URL}/incidents`, {
      headers: getAuthHeaders(),
    });
    return response.data;
  },

  getIncident: async (id: string): Promise<Incident> => {
    const response = await axios.get(`${API_BASE_URL}/incidents/${id}`, {
      headers: getAuthHeaders(),
    });
    return response.data;
  },

  respondToIncident: async (id: string): Promise<void> => {
    await axios.post(`${API_BASE_URL}/incidents/${id}/respond`, {}, { headers: getAuthHeaders() });
  },

  getAuditLogs: async (): Promise<any[]> => {
    const response = await axios.get(`${API_BASE_URL}/logs`, {
      headers: getAuthHeaders(),
    });
    return response.data;
  },
};

export const getIncidentStats = async (): Promise<any> => {
  const token = localStorage.getItem('jwt_token');
  const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
  const response = await fetch(`${API_BASE_URL}/incidents/stats`, { headers });
  if (!response.ok) throw new Error('Failed to fetch incident statistics');
  return response.json();
};
