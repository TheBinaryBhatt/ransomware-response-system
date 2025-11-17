import axios from "axios";
import type { Incident } from "../types/Incident";

const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:8000/api/v1";
const TOKEN_STORAGE_KEY = "rrs_access_token";

export interface AuditLogEntry {
  id: number;
  action: string;
  target?: string;
  status: string;
  details?: Record<string, unknown>;
  created_at?: string;
  updated_at?: string;
}

export interface IncidentTrendPoint {
  date: string;
  ransomware: number;
  falsePositive: number;
  total: number;
}

export interface IncidentTypeSlice {
  name: string;
  value: number;
}

export interface IncidentStatusCount {
  status: string;
  count: number;
}

export interface IncidentStats {
  trends: IncidentTrendPoint[];
  types: IncidentTypeSlice[];
  status: IncidentStatusCount[];
}

function getAuthHeaders(): Record<string, string> {
  const token = typeof window !== "undefined" ? localStorage.getItem(TOKEN_STORAGE_KEY) : null;
  if (!token) {
    return {};
  }
  return {
    Authorization: `Bearer ${token}`
  };
}

export const api = {
  getIncidents: async (): Promise<Incident[]> => {
    const response = await axios.get(`${API_BASE_URL}/incidents`, {
      headers: getAuthHeaders()
    });
    return response.data;
  },

  getIncident: async (id: string): Promise<Incident> => {
    const response = await axios.get(`${API_BASE_URL}/incidents/${id}`, {
      headers: getAuthHeaders()
    });
    return response.data;
  },

  respondToIncident: async (id: string): Promise<void> => {
    await axios.post(`${API_BASE_URL}/incidents/${id}/respond`, {}, { headers: getAuthHeaders() });
  },

  getAuditLogs: async (): Promise<AuditLogEntry[]> => {
    const response = await axios.get(`${API_BASE_URL}/logs`, {
      headers: getAuthHeaders()
    });
    return response.data;
  }
};

export const getIncidentStats = async (): Promise<IncidentStats> => {
  const headers = getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}/incidents/stats`, { headers });
  if (!response.ok) throw new Error("Failed to fetch incident statistics");
  return response.json() as Promise<IncidentStats>;
};
