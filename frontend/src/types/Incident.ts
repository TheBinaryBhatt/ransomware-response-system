export interface Incident {
  id: string;
  severity: string;
  description: string;
  source_ip: string;
  status: string;
  received_at: string;
  actions_taken: any[];
}

export interface ApiResponse<T> {
  data?: T;
  error?: string;
}