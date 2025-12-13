// ============================================
// WorkflowsPage - Automated Incident Response
// Integrated with Backend API
// ============================================

import React, { useState, useCallback, useMemo } from 'react';
import {
    Zap,
    Shield,
    TrendingUp,
    Activity,
    Workflow as WorkflowIcon,
    AlertTriangle
} from 'lucide-react';
import { WorkflowCard, WorkflowDetail, ExecutionHistory } from '../components/Workflows';
import { useApi } from '../hooks/useApi';
import type { Workflow, WorkflowExecution, WorkflowCategory } from '../types/workflow';
import AnimatedBackground from '../components/Common/AnimatedBackground';

// Mock data for workflows (since backend may not have these endpoints yet)
const MOCK_WORKFLOWS: Workflow[] = [
    {
        workflow_id: 'wf-ransomware-001',
        name: 'Ransomware Containment',
        description: 'Immediate isolation and containment of systems affected by ransomware. Includes network isolation, backup verification, and forensic data collection.',
        category: 'ransomware',
        trigger_conditions: { severity: ['CRITICAL', 'HIGH'], threat_types: ['ransomware'], status: ['NEW'] },
        steps: [
            { step_id: 's1', name: 'Isolate Affected Host', action_type: 'isolate', description: 'Immediately disconnect the affected system from the network', target_systems: ['EDR', 'Firewall'], timeout_seconds: 30 },
            { step_id: 's2', name: 'Block C2 Communications', action_type: 'block', description: 'Block all known C2 IP addresses and domains', target_systems: ['Firewall', 'DNS'], timeout_seconds: 60 },
            { step_id: 's3', name: 'Collect Forensic Data', action_type: 'collect', description: 'Gather memory dumps and file system artifacts', target_systems: ['EDR', 'SIEM'], timeout_seconds: 300 },
            { step_id: 's4', name: 'Notify SOC Team', action_type: 'notify', description: 'Send alerts to SOC analysts and management', target_systems: ['SOAR', 'Email'], timeout_seconds: 10 },
        ],
        is_active: true,
        created_by: 'admin',
        created_at: '2024-01-15T10:00:00Z',
        last_used: '2024-12-04T15:30:00Z',
        success_rate: 94,
        execution_count: 47,
        estimated_duration_seconds: 120,
    },
    {
        workflow_id: 'wf-phishing-001',
        name: 'Phishing Response',
        description: 'Comprehensive phishing incident response including email quarantine, credential reset, and user notification.',
        category: 'phishing',
        trigger_conditions: { severity: ['HIGH', 'MEDIUM'], threat_types: ['phishing'], status: ['NEW', 'PENDING'] },
        steps: [
            { step_id: 's1', name: 'Quarantine Email', action_type: 'quarantine', description: 'Remove phishing email from all mailboxes', target_systems: ['Email Gateway', 'Exchange'], timeout_seconds: 60 },
            { step_id: 's2', name: 'Block Sender Domain', action_type: 'block', description: 'Add sender domain to blocklist', target_systems: ['Email Gateway', 'DNS'], timeout_seconds: 30 },
            { step_id: 's3', name: 'Analyze Payload', action_type: 'analyze', description: 'Detonate and analyze any attachments or links', target_systems: ['Sandbox', 'Threat Intel'], timeout_seconds: 180 },
            { step_id: 's4', name: 'Notify Affected Users', action_type: 'notify', description: 'Send warning to users who received the email', target_systems: ['Email', 'SOAR'], timeout_seconds: 20 },
        ],
        is_active: true,
        created_by: 'admin',
        created_at: '2024-02-10T09:00:00Z',
        last_used: '2024-12-05T08:15:00Z',
        success_rate: 98,
        execution_count: 156,
        estimated_duration_seconds: 90,
    },
    {
        workflow_id: 'wf-malware-001',
        name: 'Malware Eradication',
        description: 'Complete malware removal workflow including scanning, quarantine, and system restoration.',
        category: 'malware',
        trigger_conditions: { severity: ['HIGH', 'CRITICAL'], threat_types: ['malware', 'trojan', 'worm'], status: ['NEW'] },
        steps: [
            { step_id: 's1', name: 'Full System Scan', action_type: 'analyze', description: 'Run comprehensive malware scan on affected systems', target_systems: ['EDR', 'Antivirus'], timeout_seconds: 600 },
            { step_id: 's2', name: 'Quarantine Malware', action_type: 'quarantine', description: 'Move detected malware to secure quarantine', target_systems: ['EDR', 'Antivirus'], timeout_seconds: 60 },
            { step_id: 's3', name: 'Block IOCs', action_type: 'block', description: 'Block all identified indicators of compromise', target_systems: ['Firewall', 'Proxy', 'DNS'], timeout_seconds: 120 },
            { step_id: 's4', name: 'Collect Artifacts', action_type: 'collect', description: 'Preserve malware samples and log data', target_systems: ['SIEM', 'EDR'], timeout_seconds: 180 },
            { step_id: 's5', name: 'Alert Team', action_type: 'notify', description: 'Notify security team of eradication status', target_systems: ['SOAR', 'Slack'], timeout_seconds: 10 },
        ],
        is_active: true,
        created_by: 'analyst1',
        created_at: '2024-03-01T14:00:00Z',
        last_used: '2024-12-03T11:45:00Z',
        success_rate: 89,
        execution_count: 78,
        estimated_duration_seconds: 300,
    },
    {
        workflow_id: 'wf-ddos-001',
        name: 'DDoS Mitigation',
        description: 'Automated DDoS attack mitigation with traffic analysis, rate limiting, and provider escalation.',
        category: 'ddos',
        trigger_conditions: { severity: ['CRITICAL'], threat_types: ['ddos'], status: ['NEW'] },
        steps: [
            { step_id: 's1', name: 'Enable Rate Limiting', action_type: 'block', description: 'Apply aggressive rate limiting rules', target_systems: ['WAF', 'Load Balancer'], timeout_seconds: 15 },
            { step_id: 's2', name: 'Analyze Traffic Patterns', action_type: 'analyze', description: 'Identify attack vectors and source IPs', target_systems: ['SIEM', 'NetFlow'], timeout_seconds: 120 },
            { step_id: 's3', name: 'Block Attack Sources', action_type: 'block', description: 'Block identified attack source IP ranges', target_systems: ['Firewall', 'CDN', 'ISP'], timeout_seconds: 60 },
            { step_id: 's4', name: 'Escalate to Provider', action_type: 'notify', description: 'Contact ISP/CDN for upstream mitigation', target_systems: ['SOAR', 'PagerDuty'], timeout_seconds: 30 },
        ],
        is_active: true,
        created_by: 'admin',
        created_at: '2024-01-20T16:00:00Z',
        last_used: '2024-11-28T22:10:00Z',
        success_rate: 91,
        execution_count: 23,
        estimated_duration_seconds: 75,
    },
    {
        workflow_id: 'wf-insider-001',
        name: 'Insider Threat Response',
        description: 'Handle potential insider threats with access revocation, monitoring enhancement, and HR notification.',
        category: 'insider_threat',
        trigger_conditions: { severity: ['HIGH', 'CRITICAL'], threat_types: ['insider_threat', 'data_exfiltration'], status: ['NEW'] },
        steps: [
            { step_id: 's1', name: 'Enhance Monitoring', action_type: 'collect', description: 'Enable detailed logging for suspect user', target_systems: ['SIEM', 'DLP', 'UEBA'], timeout_seconds: 60 },
            { step_id: 's2', name: 'Review Access Logs', action_type: 'analyze', description: 'Analyze recent access patterns and data transfers', target_systems: ['SIEM', 'DLP'], timeout_seconds: 300 },
            { step_id: 's3', name: 'Preserve Evidence', action_type: 'collect', description: 'Create forensic copies of relevant data', target_systems: ['Forensics', 'SIEM'], timeout_seconds: 600 },
            { step_id: 's4', name: 'Notify HR & Legal', action_type: 'notify', description: 'Alert HR and Legal departments', target_systems: ['SOAR', 'Email'], timeout_seconds: 20 },
        ],
        is_active: true,
        created_by: 'admin',
        created_at: '2024-04-05T11:00:00Z',
        last_used: '2024-11-15T09:30:00Z',
        success_rate: 100,
        execution_count: 8,
        estimated_duration_seconds: 320,
    },
    {
        workflow_id: 'wf-custom-001',
        name: 'Generic Incident Response',
        description: 'Flexible response workflow for general security incidents with customizable actions.',
        category: 'custom',
        trigger_conditions: { severity: ['LOW', 'MEDIUM', 'HIGH'], threat_types: ['unknown'], status: ['NEW'] },
        steps: [
            { step_id: 's1', name: 'Initial Triage', action_type: 'analyze', description: 'Perform initial incident assessment', target_systems: ['SIEM', 'EDR'], timeout_seconds: 120 },
            { step_id: 's2', name: 'Collect Evidence', action_type: 'collect', description: 'Gather relevant logs and artifacts', target_systems: ['SIEM', 'EDR', 'Firewall'], timeout_seconds: 180 },
            { step_id: 's3', name: 'Notify Analyst', action_type: 'notify', description: 'Alert on-call analyst for review', target_systems: ['PagerDuty', 'SOAR'], timeout_seconds: 10 },
        ],
        is_active: true,
        created_by: 'analyst2',
        created_at: '2024-05-12T08:00:00Z',
        success_rate: 85,
        execution_count: 234,
        estimated_duration_seconds: 100,
    },
];

const MOCK_EXECUTIONS: WorkflowExecution[] = [
    {
        execution_id: 'exec-001',
        workflow_id: 'wf-ransomware-001',
        workflow_name: 'Ransomware Containment',
        incident_id: 'inc-abc123',
        status: 'success',
        started_at: '2024-12-05T08:30:00Z',
        completed_at: '2024-12-05T08:32:15Z',
        duration_seconds: 135,
        steps_completed: 4,
        steps_total: 4,
        actions_taken: [],
    },
    {
        execution_id: 'exec-002',
        workflow_id: 'wf-phishing-001',
        workflow_name: 'Phishing Response',
        incident_id: 'inc-def456',
        status: 'success',
        started_at: '2024-12-05T07:15:00Z',
        completed_at: '2024-12-05T07:16:30Z',
        duration_seconds: 90,
        steps_completed: 4,
        steps_total: 4,
        actions_taken: [],
    },
    {
        execution_id: 'exec-003',
        workflow_id: 'wf-malware-001',
        workflow_name: 'Malware Eradication',
        incident_id: 'inc-ghi789',
        status: 'failed',
        started_at: '2024-12-04T23:45:00Z',
        completed_at: '2024-12-04T23:48:30Z',
        duration_seconds: 210,
        steps_completed: 2,
        steps_total: 5,
        error_message: 'Connection timeout to EDR system',
        actions_taken: [],
    },
    {
        execution_id: 'exec-004',
        workflow_id: 'wf-ddos-001',
        workflow_name: 'DDoS Mitigation',
        incident_id: 'inc-jkl012',
        status: 'running',
        started_at: new Date().toISOString(),
        steps_completed: 2,
        steps_total: 4,
        current_step: 'Block Attack Sources',
        actions_taken: [],
    },
];

const WorkflowsPage: React.FC = () => {
    // Fetch workflows from API with fallback to mock data
    const {
        data: apiWorkflows,
        loading: workflowsLoading,
    } = useApi<Workflow[]>(
        async () => {
            try {
                const token = localStorage.getItem('rrs_access_token');
                const response = await fetch('/api/v1/workflows', {
                    headers: token ? { 'Authorization': `Bearer ${token}` } : {}
                });
                if (response.ok) return response.json();
                return [];
            } catch {
                return [];
            }
        }
    );

    // Fetch executions from API (new endpoint)
    const {
        data: apiExecutions,
        loading: executionsLoading,
    } = useApi<WorkflowExecution[]>(
        async () => {
            try {
                const token = localStorage.getItem('rrs_access_token');
                const response = await fetch('/api/v1/workflow-executions', {
                    headers: token ? { 'Authorization': `Bearer ${token}` } : {}
                });
                if (response.ok) return response.json();
                return [];
            } catch {
                return [];
            }
        }
    );

    // Use API data or fallback to mock data
    const workflows = useMemo(() =>
        apiWorkflows && apiWorkflows.length > 0 ? apiWorkflows : MOCK_WORKFLOWS,
        [apiWorkflows]
    );
    const executions = useMemo(() =>
        apiExecutions && apiExecutions.length > 0 ? apiExecutions : MOCK_EXECUTIONS,
        [apiExecutions]
    );

    const [selectedWorkflow, setSelectedWorkflow] = useState<Workflow | null>(null);
    const loading = workflowsLoading || executionsLoading;
    const [categoryFilter, setCategoryFilter] = useState<WorkflowCategory | 'all'>('all');

    // Calculate stats
    const stats = {
        total: workflows.length,
        active: workflows.filter(w => w.is_active).length,
        avgSuccessRate: workflows.length > 0
            ? Math.round(workflows.reduce((sum, w) => sum + w.success_rate, 0) / workflows.length)
            : 0,
        totalExecutions: workflows.reduce((sum, w) => sum + w.execution_count, 0),
    };

    // Filter workflows
    const filteredWorkflows = categoryFilter === 'all'
        ? workflows
        : workflows.filter(w => w.category === categoryFilter);

    // Handle workflow execution
    const handleExecuteWorkflow = useCallback(async (workflowId: string, incidentId: string): Promise<WorkflowExecution | null> => {
        // Simulate execution (mock)
        const workflow = workflows.find(w => w.workflow_id === workflowId);
        if (!workflow) return null;

        const mockExecution: WorkflowExecution = {
            execution_id: `exec-${Date.now()}`,
            workflow_id: workflowId,
            workflow_name: workflow.name,
            incident_id: incidentId,
            status: 'running',
            started_at: new Date().toISOString(),
            steps_completed: 0,
            steps_total: workflow.steps.length,
            current_step: workflow.steps[0]?.name,
            actions_taken: workflow.steps.map((step, i) => ({
                action_id: `action-${i}`,
                step_id: step.step_id,
                step_name: step.name,
                target_system: step.target_systems[0] || 'Unknown',
                action_type: step.action_type,
                status: i === 0 ? 'running' : 'pending',
                started_at: new Date().toISOString(),
                result_message: i === 0 ? 'Executing...' : 'Waiting to start',
            })),
        };

        // Simulate progress
        setTimeout(() => {
            mockExecution.status = 'success';
            mockExecution.steps_completed = mockExecution.steps_total;
            mockExecution.completed_at = new Date().toISOString();
            mockExecution.duration_seconds = workflow.estimated_duration_seconds;
            mockExecution.actions_taken.forEach(action => {
                action.status = 'success';
                action.completed_at = new Date().toISOString();
                action.result_message = 'Completed successfully';
            });
        }, 3000);

        return mockExecution;
    }, [workflows]);

    const categories: { value: WorkflowCategory | 'all'; label: string }[] = [
        { value: 'all', label: 'All Workflows' },
        { value: 'ransomware', label: '🔐 Ransomware' },
        { value: 'phishing', label: '🎣 Phishing' },
        { value: 'malware', label: '🦠 Malware' },
        { value: 'ddos', label: '💥 DDoS' },
        { value: 'insider_threat', label: '👤 Insider' },
        { value: 'custom', label: '⚙️ Custom' },
    ];

    return (
        <div className="min-h-full relative overflow-hidden" style={{
            background: 'radial-gradient(ellipse at center, #0a1628 0%, #020817 100%)'
        }}>
            {/* Animated Network Background */}
            <AnimatedBackground opacity={0.3} lineCount={6} nodeCount={10} starCount={40} />

            {/* Content */}
            <div className="relative z-10">
                {/* Header */}
                <div className="border-b border-blue-500/10" style={{
                    backgroundColor: 'rgba(37, 39, 39, 0.6)',
                    backdropFilter: 'blur(10px)'
                }}>
                    <div className="px-6 py-6">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="p-2 bg-gradient-to-br from-accent-teal/20 to-purple-500/20 rounded-lg">
                                        <WorkflowIcon size={24} className="text-accent-teal" />
                                    </div>
                                    <h1 className="text-3xl font-bold text-text-primary">
                                        Response Workflows
                                    </h1>
                                </div>
                                <p className="text-text-secondary">
                                    Automated incident response orchestration and execution
                                </p>
                            </div>
                        </div>

                        {/* Stats Cards */}
                        <div className="grid grid-cols-4 gap-4">
                            <div className="bg-dark-bg/50 rounded-xl p-4 border border-accent-teal/10">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-accent-teal/10 rounded-lg">
                                        <WorkflowIcon size={20} className="text-accent-teal" />
                                    </div>
                                    <div>
                                        <p className="text-text-secondary text-xs">Total Workflows</p>
                                        <p className="text-2xl font-bold text-text-primary">{stats.total}</p>
                                    </div>
                                </div>
                            </div>
                            <div className="bg-dark-bg/50 rounded-xl p-4 border border-accent-teal/10">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-green-500/10 rounded-lg">
                                        <Shield size={20} className="text-green-400" />
                                    </div>
                                    <div>
                                        <p className="text-text-secondary text-xs">Active</p>
                                        <p className="text-2xl font-bold text-green-400">{stats.active}</p>
                                    </div>
                                </div>
                            </div>
                            <div className="bg-dark-bg/50 rounded-xl p-4 border border-accent-teal/10">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-purple-500/10 rounded-lg">
                                        <TrendingUp size={20} className="text-purple-400" />
                                    </div>
                                    <div>
                                        <p className="text-text-secondary text-xs">Avg Success Rate</p>
                                        <p className="text-2xl font-bold text-purple-400">{stats.avgSuccessRate}%</p>
                                    </div>
                                </div>
                            </div>
                            <div className="bg-dark-bg/50 rounded-xl p-4 border border-accent-teal/10">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-orange-500/10 rounded-lg">
                                        <Activity size={20} className="text-orange-400" />
                                    </div>
                                    <div>
                                        <p className="text-text-secondary text-xs">Total Executions</p>
                                        <p className="text-2xl font-bold text-orange-400">{stats.totalExecutions.toLocaleString()}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Main Content */}
                <div className="p-6 max-w-7xl mx-auto">
                    {/* Category Filter */}
                    <div className="mb-8">
                        <div className="flex flex-wrap gap-2">
                            {categories.map(cat => (
                                <button
                                    key={cat.value}
                                    onClick={() => setCategoryFilter(cat.value)}
                                    className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${categoryFilter === cat.value
                                        ? 'bg-accent-teal text-dark-bg'
                                        : 'bg-dark-surface text-text-secondary hover:text-text-primary border border-accent-teal/10 hover:border-accent-teal/30'
                                        }`}
                                >
                                    {cat.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Workflows Grid */}
                    <div className="mb-12">
                        <h2 className="text-xl font-bold text-text-primary mb-6 flex items-center gap-2">
                            <Zap size={20} className="text-accent-teal" />
                            Available Workflows
                            <span className="text-text-secondary font-normal text-sm ml-2">
                                ({filteredWorkflows.length})
                            </span>
                        </h2>

                        {loading ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {[...Array(6)].map((_, i) => (
                                    <div key={i} className="h-64 bg-dark-surface rounded-xl animate-pulse" />
                                ))}
                            </div>
                        ) : filteredWorkflows.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {filteredWorkflows.map(workflow => (
                                    <WorkflowCard
                                        key={workflow.workflow_id}
                                        workflow={workflow}
                                        onSelect={setSelectedWorkflow}
                                    />
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-16 bg-dark-surface rounded-xl border border-accent-teal/10">
                                <AlertTriangle size={48} className="mx-auto text-text-secondary/30 mb-4" />
                                <p className="text-text-secondary text-lg">No workflows found</p>
                                <p className="text-text-secondary/60 text-sm mt-1">
                                    Try selecting a different category
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Recent Executions */}
                    <div>
                        <h2 className="text-xl font-bold text-text-primary mb-6 flex items-center gap-2">
                            <Activity size={20} className="text-accent-teal" />
                            Recent Executions
                        </h2>
                        <ExecutionHistory executions={executions} loading={false} />
                    </div>
                </div>

                {/* Workflow Detail Drawer */}
                {selectedWorkflow && (
                    <WorkflowDetail
                        workflow={selectedWorkflow}
                        onClose={() => setSelectedWorkflow(null)}
                        onExecute={handleExecuteWorkflow}
                    />
                )}
            </div>
        </div>
    );
};

export default WorkflowsPage;
