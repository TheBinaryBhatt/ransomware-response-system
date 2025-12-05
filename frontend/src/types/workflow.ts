// ============================================
// WORKFLOW TYPES - Phase 4 Response Workflows
// ============================================

export interface WorkflowStep {
    step_id: string;
    name: string;
    action_type: 'quarantine' | 'block' | 'isolate' | 'notify' | 'collect' | 'analyze';
    description: string;
    target_systems: string[];
    parameters?: Record<string, unknown>;
    timeout_seconds?: number;
    retry_count?: number;
}

export type WorkflowCategory = 'ransomware' | 'phishing' | 'malware' | 'ddos' | 'insider_threat' | 'custom';

export interface Workflow {
    workflow_id: string;
    name: string;
    description: string;
    category: WorkflowCategory;
    trigger_conditions: {
        severity: string[];
        threat_types: string[];
        status: string[];
    };
    steps: WorkflowStep[];
    is_active: boolean;
    created_by: string;
    created_at: string;
    last_used?: string;
    success_rate: number; // 0-100
    execution_count: number;
    estimated_duration_seconds: number;
}

export type ExecutionStatus = 'pending' | 'running' | 'success' | 'failed' | 'partial';

export interface WorkflowExecution {
    execution_id: string;
    workflow_id: string;
    workflow_name?: string;
    incident_id: string;
    status: ExecutionStatus;
    started_at: string;
    completed_at?: string;
    duration_seconds?: number;
    steps_completed: number;
    steps_total: number;
    current_step?: string;
    error_message?: string;
    actions_taken: WorkflowAction[];
}

export interface WorkflowAction {
    action_id: string;
    step_id: string;
    step_name: string;
    target_system: string;
    action_type: string;
    status: 'pending' | 'running' | 'success' | 'failed';
    started_at: string;
    completed_at?: string;
    result_message: string;
    error_details?: string;
}

export interface WorkflowMetrics {
    total_workflows: number;
    active_workflows: number;
    total_executions: number;
    success_rate: number;
    avg_duration_seconds: number;
}
