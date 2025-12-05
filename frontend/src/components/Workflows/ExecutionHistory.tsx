// ============================================
// ExecutionHistory - Table of recent workflow executions
// ============================================

import React from 'react';
import { CheckCircle, AlertCircle, Loader2, Clock, AlertOctagon } from 'lucide-react';
import type { WorkflowExecution, ExecutionStatus } from '../../types/workflow';

interface ExecutionHistoryProps {
    executions: WorkflowExecution[];
    loading: boolean;
}

const statusConfig: Record<ExecutionStatus, { color: string; bgColor: string; icon: React.ElementType }> = {
    success: { color: 'text-green-400', bgColor: 'bg-green-500/10', icon: CheckCircle },
    failed: { color: 'text-red-400', bgColor: 'bg-red-500/10', icon: AlertCircle },
    running: { color: 'text-accent-teal', bgColor: 'bg-accent-teal/10', icon: Loader2 },
    pending: { color: 'text-text-secondary', bgColor: 'bg-dark-bg', icon: Clock },
    partial: { color: 'text-orange-400', bgColor: 'bg-orange-500/10', icon: AlertOctagon },
};

const ExecutionHistory: React.FC<ExecutionHistoryProps> = ({ executions, loading }) => {
    const formatTime = (timestamp: string) => {
        const date = new Date(timestamp);
        return date.toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    if (loading) {
        return (
            <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                    <div key={i} className="h-16 bg-dark-surface rounded-lg animate-pulse" />
                ))}
            </div>
        );
    }

    if (executions.length === 0) {
        return (
            <div className="text-center py-16 bg-dark-surface rounded-xl border border-accent-teal/10">
                <Clock size={48} className="mx-auto text-text-secondary/30 mb-4" />
                <p className="text-text-secondary text-lg font-medium">No executions yet</p>
                <p className="text-text-secondary/60 text-sm mt-1">
                    Execute a workflow to see the history here
                </p>
            </div>
        );
    }

    return (
        <div className="overflow-hidden rounded-xl border border-accent-teal/10">
            <table className="w-full">
                <thead>
                    <tr className="bg-dark-surface border-b border-accent-teal/10">
                        <th className="px-4 py-3 text-left text-text-secondary text-xs font-semibold uppercase tracking-wider">
                            Execution
                        </th>
                        <th className="px-4 py-3 text-left text-text-secondary text-xs font-semibold uppercase tracking-wider">
                            Workflow
                        </th>
                        <th className="px-4 py-3 text-left text-text-secondary text-xs font-semibold uppercase tracking-wider">
                            Incident
                        </th>
                        <th className="px-4 py-3 text-left text-text-secondary text-xs font-semibold uppercase tracking-wider">
                            Status
                        </th>
                        <th className="px-4 py-3 text-left text-text-secondary text-xs font-semibold uppercase tracking-wider">
                            Progress
                        </th>
                        <th className="px-4 py-3 text-left text-text-secondary text-xs font-semibold uppercase tracking-wider">
                            Duration
                        </th>
                        <th className="px-4 py-3 text-left text-text-secondary text-xs font-semibold uppercase tracking-wider">
                            Started
                        </th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-accent-teal/10">
                    {executions.map((execution) => {
                        const config = statusConfig[execution.status] || statusConfig.pending;
                        const Icon = config.icon;

                        return (
                            <tr
                                key={execution.execution_id}
                                className="hover:bg-dark-surface/50 transition-colors"
                            >
                                <td className="px-4 py-4">
                                    <span className="text-text-primary text-sm font-mono">
                                        #{execution.execution_id.slice(-8)}
                                    </span>
                                </td>
                                <td className="px-4 py-4">
                                    <span className="text-text-primary text-sm">
                                        {execution.workflow_name || execution.workflow_id.slice(-8)}
                                    </span>
                                </td>
                                <td className="px-4 py-4">
                                    <span className="text-accent-teal text-sm font-mono">
                                        #{execution.incident_id.slice(-8)}
                                    </span>
                                </td>
                                <td className="px-4 py-4">
                                    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full ${config.bgColor}`}>
                                        <Icon size={14} className={`${config.color} ${execution.status === 'running' ? 'animate-spin' : ''}`} />
                                        <span className={`text-xs font-semibold ${config.color}`}>
                                            {execution.status.toUpperCase()}
                                        </span>
                                    </div>
                                </td>
                                <td className="px-4 py-4">
                                    <div className="flex items-center gap-2">
                                        <div className="w-16 h-1.5 bg-dark-bg rounded-full overflow-hidden">
                                            <div
                                                className={`h-full rounded-full ${execution.status === 'success' ? 'bg-green-500' :
                                                        execution.status === 'failed' ? 'bg-red-500' :
                                                            'bg-accent-teal'
                                                    }`}
                                                style={{
                                                    width: `${execution.steps_total > 0
                                                        ? (execution.steps_completed / execution.steps_total) * 100
                                                        : 0}%`
                                                }}
                                            />
                                        </div>
                                        <span className="text-text-secondary text-xs">
                                            {execution.steps_completed}/{execution.steps_total}
                                        </span>
                                    </div>
                                </td>
                                <td className="px-4 py-4">
                                    <span className="text-text-primary text-sm">
                                        {execution.duration_seconds ? `${execution.duration_seconds}s` : '-'}
                                    </span>
                                </td>
                                <td className="px-4 py-4">
                                    <span className="text-text-secondary text-sm">
                                        {formatTime(execution.started_at)}
                                    </span>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
};

export default ExecutionHistory;
