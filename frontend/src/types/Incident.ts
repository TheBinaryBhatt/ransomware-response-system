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
  status?: IncidentStatus;
  ai_confidence?: number;
  ai_reasoning?: string;
  received_at?: string;
  requires_human_review?: boolean;
  destination_ip?: string;
  response_status?: string;
  actions_taken?: string[];
  created_at?: string;
}

export enum Severity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM', 
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

export enum IncidentStatus {
  DETECTED = 'detected',
  TRIAGING = 'triaging',
  ACTION_TAKEN = 'action_taken',
  NEW = 'NEW',
  IN_PROGRESS = 'IN_PROGRESS',
  RESOLVED = 'RESOLVED',
  CLOSED = 'CLOSED'
}