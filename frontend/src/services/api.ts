// src/services/api.ts
import axios from "axios";
import type { Incident } from "../types/Incident";

const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:8000/api/v1";

// Axios instance with token injection
export const apiClient = axios.create({
  baseURL: API_BASE,
  headers: { "Content-Type": "application/json" },
});

// Inject JWT automatically
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("rrs_access_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// =============================
// INCIDENT API ENDPOINTS
// =============================

// GET all incidents (triage service)
export async function getIncidents(): Promise<Incident[]> {
  const res = await apiClient.get("/triage/incidents");
  return res.data;
}

// GET one incident (auto-detects from triage OR response service)
export async function getIncidentById(id: string): Promise<Incident> {
  try {
    // Try triage DB first
    const triageRes = await apiClient.get(`/triage/incidents`);
    const triageList: Incident[] = triageRes.data;

    const match = triageList.find((i) => i.id === id || i.siem_alert_id === id);
    if (match) return match;
  } catch (e) {
    console.warn("Triage lookup failed:", e);
  }

  try {
    // Try response service fallback
    const res = await apiClient.get(`/response/incidents/${id}`);
    return res.data;
  } catch (e) {
    console.warn("Response lookup failed:", e);
  }

  throw new Error("Incident not found in any service");
}

// Get response workflow status
export async function getWorkflowStatus(incidentId: string): Promise<any> {
  try {
    const res = await apiClient.get(`/response/workflows/${incidentId}/status`);
    return res.data;
  } catch (e) {
    return { status: "not_started" };
  }
}

// Trigger a response workflow (optional)
export async function triggerResponse(incidentId: string, automated = false, analysis: any = {}) {
  const res = await apiClient.post(`/response/incidents/${incidentId}/respond`, {
    automated,
    analysis,
  });
  return res.data;
}

// Threat Intel lookups (optional)
export async function lookupIP(ip: string) {
  const res = await apiClient.get(`/response/threatintel/abuseipdb`, { params: { ip } });
  return res.data;
}

export async function lookupHash(hash: string) {
  const res = await apiClient.get(`/response/threatintel/malwarebazaar`, { params: { hash } });
  return res.data;
}

// =============================
// Export Convenience Wrapper
// =============================

export const api = {
  getIncidents,
  getIncidentById,
  getWorkflowStatus,
  triggerResponse,
  lookupIP,
  lookupHash,
};

export default api;
