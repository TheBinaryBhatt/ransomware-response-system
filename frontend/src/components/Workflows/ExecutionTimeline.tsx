// ============================================
// ExecutionTimeline - Display execution steps progress
// ============================================

import React from 'react';
import { CheckCircle, AlertCircle, Clock, Loader2 } from 'lucide-react';
import type { WorkflowExecution, WorkflowAction } from '../../types/workflow';

interface ExecutionTimelineProps {
    execution: WorkflowExecution;
}

const statusConfig = {
    success: { color: 'text-green-400', bgColor: 'bg-green-500/10', borderColor: 'border-green-500/30', icon: CheckCircle },
    failed: { color: 'text-red-400', bgColor: 'bg-red-500/10', borderColor: 'border-red-500/30', icon: AlertCircle },
    running: { color: 'text-accent-teal', bgColor: 'bg-accent-teal/10', borderColor: 'border-accent-teal/30', icon: Loader2 },
    pending: { color: 'text-text-secondary', bgColor: 'bg-dark-bg', borderColor: 'border-accent-teal/10', icon: Clock },
};

const ExecutionTimeline: React.FC<ExecutionTimelineProps> = ({ execution }) => {
    const formatTime = (timestamp: string) => {
        return new Date(timestamp).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
        });
    };

    const getActionDuration = (action: WorkflowAction): string => {
        if (!action.completed_at) return '-';
        const duration = Math.round(
            (new Date(action.completed_at).getTime() - new Date(action.started_at).getTime()) / 1000
        );
        return `${duration}s`;
    };

    const progressPercent = execution.steps_total > 0
        ? Math.round((execution.steps_completed / execution.steps_total) * 100)
        : 0;

    return (
        <div className="space-y-6">
            {/* Overall Status Header */}
            <div className={`p-4 rounded-lg border ${statusConfig[execution.status]?.borderColor || statusConfig.pending.borderColor} ${statusConfig[execution.status]?.bgColor || statusConfig.pending.bgColor}`}>
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        {(() => {
                            const config = statusConfig[execution.status] || statusConfig.pending;
                            const Icon = config.icon;
                            return (
                                <Icon size={24} className={`${config.color} ${execution.status === 'running' ? 'animate-spin' : ''}`} />
                            );
                        })()}
                        <div>
                            <p className="text-text-primary font-bold text-lg">
                                {execution.status.toUpperCase()}
                            </p>
                            <p className="text-text-secondary text-sm">
                                {execution.steps_completed} of {execution.steps_total} steps completed
                            </p>
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="text-3xl font-bold text-text-primary">{progressPercent}%</p>
                    </div>
                </div>

                {/* Progress Bar */}
                <div className="h-2 bg-dark-bg rounded-full overflow-hidden">
                    <div
                        className={`h-full rounded-full transition-all duration-500 ${execution.status === 'success' ? 'bg-green-500' :
                                execution.status === 'failed' ? 'bg-red-500' :
                                    'bg-accent-teal'
                            }`}
                        style={{ width: `${progressPercent}%` }}
                    />
                </div>
            </div>

            {/* Actions Timeline */}
            {execution.actions_taken.length > 0 && (
                <div className="relative">
                    {execution.actions_taken.map((action, index) => {
                        const config = statusConfig[action.status] || statusConfig.pending;
                        const Icon = config.icon;
                        const isLast = index === execution.actions_taken.length - 1;

                        return (
                            <div key={action.action_id} className="flex gap-4">
                                {/* Timeline connector */}
                                <div className="flex flex-col items-center">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${config.bgColor} border ${config.borderColor}`}>
                                        <Icon size={18} className={`${config.color} ${action.status === 'running' ? 'animate-spin' : ''}`} />
                                    </div>
                                    {!isLast && (
                                        <div className="w-0.5 h-16 bg-accent-teal/20" />
                                    )}
                                </div>

                                {/* Action content */}
                                <div className={`flex-1 ${!isLast ? 'pb-6' : ''}`}>
                                    <div className="bg-dark-bg rounded-lg border border-accent-teal/10 p-4">
                                        <div className="flex items-start justify-between mb-2">
                                            <div>
                                                <p className="font-semibold text-text-primary">
                                                    {action.step_name}
                                                </p>
                                                <p className="text-text-secondary text-sm">
                                                    {action.action_type} → {action.target_system}
                                                </p>
                                            </div>
                                            <span className={`text-xs font-semibold px-2 py-1 rounded ${config.bgColor} ${config.color}`}>
                                                {action.status.toUpperCase()}
                                            </span>
                                        </div>

                                        <p className="text-text-secondary text-sm mb-3">
                                            {action.result_message}
                                        </p>

                                        <div className="flex items-center justify-between text-xs text-text-secondary">
                                            <span>Started: {formatTime(action.started_at)}</span>
                                            <span>Duration: {getActionDuration(action)}</span>
                                        </div>

                                        {action.error_details && (
                                            <div className="mt-3 p-2 bg-red-500/10 border border-red-500/30 rounded text-red-400 text-xs">
                                                {action.error_details}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Summary Footer */}
            <div className="grid grid-cols-3 gap-4 p-4 bg-dark-bg rounded-lg border border-accent-teal/10">
                <div>
                    <p className="text-text-secondary text-xs mb-1">Started</p>
                    <p className="text-text-primary font-mono text-sm">{formatTime(execution.started_at)}</p>
                </div>
                <div>
                    <p className="text-text-secondary text-xs mb-1">Completed</p>
                    <p className="text-text-primary font-mono text-sm">
                        {execution.completed_at ? formatTime(execution.completed_at) : '-'}
                    </p>
                </div>
                <div>
                    <p className="text-text-secondary text-xs mb-1">Duration</p>
                    <p className="text-text-primary font-mono text-sm">
                        {execution.duration_seconds ? `${execution.duration_seconds}s` : '-'}
                    </p>
                </div>
            </div>

            {/* Error Message */}
            {execution.error_message && (
                <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
                    <p className="text-red-400 text-sm font-semibold mb-1">Execution Error</p>
                    <p className="text-red-400/80 text-sm">{execution.error_message}</p>
                </div>
            )}
        </div>
    );
};

export default ExecutionTimeline;
