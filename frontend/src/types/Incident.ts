// ===============================
// Unified Incident Model (Frontend)
// Matches backend Ingestion + Triage + Response services
// ===============================

export interface Incident {
  id: string;
  siem_alert_id: string;
  source: string;
  raw_data: Record<string, unknown> | null;
  timestamp: string;

  decision?: string;
  confidence?: number;
  reasoning?: string;

  severity?: Severity;
  description?: string;
  source_ip?: string;
  destination_ip?: string;

  status?: IncidentStatus;

  // AI fields
  ai_confidence?: number;
  ai_reasoning?: string;
  requires_human_review?: boolean;

  response_status?: string;
  actions_taken?: string[];
  created_at?: string;
}


// ===============================
// ENUMS (Match Backend Exactly)
// ===============================
export enum Severity {
  LOW = "LOW",
  MEDIUM = "MEDIUM",
  HIGH = "HIGH",
  CRITICAL = "CRITICAL",
}

export enum TriageDecision {
  CONFIRMED_RANSOMWARE = "confirmed_ransomware",
  FALSE_POSITIVE = "false_positive",
  ESCALATE_HUMAN = "escalate_human",
}

// More structured typing for status
export enum IncidentStatus {
  DETECTED = "detected",
  TRIAGING = "triaging",
  ACTION_TAKEN = "action_taken",
  NEW = "NEW",
  IN_PROGRESS = "IN_PROGRESS",
  RESOLVED = "RESOLVED",
  CLOSED = "CLOSED",
}
