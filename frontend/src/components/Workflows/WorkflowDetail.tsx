// ============================================
// WorkflowDetail - Drawer showing workflow details and execution
// ============================================

import React, { useState } from 'react';
import { X, Play, ChevronDown, ChevronUp, Shield, Target, Clock, Zap } from 'lucide-react';
import type { Workflow, WorkflowExecution, WorkflowStep } from '../../types/workflow';
import ExecutionTimeline from './ExecutionTimeline';

interface WorkflowDetailProps {
    workflow: Workflow;
    onClose: () => void;
    onExecute: (workflowId: string, incidentId: string) => Promise<WorkflowExecution | null>;
}

// Action type icons
const actionIcons: Record<string, string> = {
    quarantine: '🔒',
    block: '🚫',
    isolate: '🔌',
    notify: '📧',
    collect: '📦',
    analyze: '🔍',
};

const WorkflowDetail: React.FC<WorkflowDetailProps> = ({ workflow, onClose, onExecute }) => {
    const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set());
    const [showExecuteForm, setShowExecuteForm] = useState(false);
    const [incidentId, setIncidentId] = useState('');
    const [executing, setExecuting] = useState(false);
    const [execution, setExecution] = useState<WorkflowExecution | null>(null);
    const [error, setError] = useState<string | null>(null);

    const toggleStep = (stepId: string) => {
        const newSet = new Set(expandedSteps);
        if (newSet.has(stepId)) {
            newSet.delete(stepId);
        } else {
            newSet.add(stepId);
        }
        setExpandedSteps(newSet);
    };

    const handleExecute = async () => {
        if (!incidentId.trim()) {
            setError('Please enter an incident ID');
            return;
        }

        setExecuting(true);
        setError(null);

        try {
            const result = await onExecute(workflow.workflow_id, incidentId.trim());
            if (result) {
                setExecution(result);
                setShowExecuteForm(false);
            }
        } catch (err: any) {
            setError(err.message || 'Failed to execute workflow');
        } finally {
            setExecuting(false);
        }
    };

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
                onClick={onClose}
            />

            {/* Drawer */}
            <div className="fixed right-0 top-0 bottom-0 w-full max-w-2xl bg-dark-surface border-l border-accent-teal/20 z-50 overflow-hidden flex flex-col">
                {/* Header */}
                <div className="shrink-0 bg-gradient-to-r from-dark-surface to-dark-bg border-b border-accent-teal/10 px-6 py-4">
                    <div className="flex items-start justify-between">
                        <div>
                            <h2 className="text-2xl font-bold text-text-primary mb-1">
                                {workflow.name}
                            </h2>
                            <p className="text-text-secondary text-sm">
                                {workflow.category.replace('_', ' ').toUpperCase()} Response Workflow
                            </p>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-dark-bg rounded-lg transition-colors"
                        >
                            <X size={20} className="text-text-secondary" />
                        </button>
                    </div>
                </div>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
                    {/* Description */}
                    <div className="bg-dark-bg/50 rounded-lg p-4 border border-accent-teal/10">
                        <p className="text-text-secondary leading-relaxed">
                            {workflow.description}
                        </p>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-4 gap-3">
                        <div className="bg-dark-bg rounded-lg p-3 border border-accent-teal/10 text-center">
                            <Shield size={20} className="mx-auto text-green-400 mb-1" />
                            <p className="text-xl font-bold text-green-400">{workflow.success_rate}%</p>
                            <p className="text-text-secondary text-xs">Success</p>
                        </div>
                        <div className="bg-dark-bg rounded-lg p-3 border border-accent-teal/10 text-center">
                            <Zap size={20} className="mx-auto text-accent-teal mb-1" />
                            <p className="text-xl font-bold text-accent-teal">{workflow.execution_count}</p>
                            <p className="text-text-secondary text-xs">Runs</p>
                        </div>
                        <div className="bg-dark-bg rounded-lg p-3 border border-accent-teal/10 text-center">
                            <Target size={20} className="mx-auto text-purple-400 mb-1" />
                            <p className="text-xl font-bold text-purple-400">{workflow.steps.length}</p>
                            <p className="text-text-secondary text-xs">Steps</p>
                        </div>
                        <div className="bg-dark-bg rounded-lg p-3 border border-accent-teal/10 text-center">
                            <Clock size={20} className="mx-auto text-orange-400 mb-1" />
                            <p className="text-xl font-bold text-orange-400">{workflow.estimated_duration_seconds}s</p>
                            <p className="text-text-secondary text-xs">Duration</p>
                        </div>
                    </div>

                    {/* Workflow Steps */}
                    <div>
                        <h3 className="text-lg font-bold text-text-primary mb-4 flex items-center gap-2">
                            <Target size={18} className="text-accent-teal" />
                            Workflow Steps
                        </h3>
                        <div className="space-y-2">
                            {workflow.steps.map((step: WorkflowStep, index: number) => (
                                <div
                                    key={step.step_id}
                                    className="bg-dark-bg rounded-lg border border-accent-teal/10 overflow-hidden"
                                >
                                    <button
                                        onClick={() => toggleStep(step.step_id)}
                                        className="w-full px-4 py-3 flex items-center justify-between hover:bg-accent-teal/5 transition-colors"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-accent-teal/20 text-accent-teal flex items-center justify-center text-sm font-bold">
                                                {index + 1}
                                            </div>
                                            <div className="text-left">
                                                <p className="font-semibold text-text-primary flex items-center gap-2">
                                                    <span>{actionIcons[step.action_type] || '⚡'}</span>
                                                    {step.name}
                                                </p>
                                                <p className="text-text-secondary text-sm capitalize">
                                                    {step.action_type}
                                                </p>
                                            </div>
                                        </div>
                                        {expandedSteps.has(step.step_id) ? (
                                            <ChevronUp size={18} className="text-text-secondary" />
                                        ) : (
                                            <ChevronDown size={18} className="text-text-secondary" />
                                        )}
                                    </button>

                                    {expandedSteps.has(step.step_id) && (
                                        <div className="px-4 py-3 bg-dark-bg/50 border-t border-accent-teal/10 space-y-3">
                                            <p className="text-text-secondary text-sm">
                                                {step.description}
                                            </p>
                                            <div>
                                                <p className="text-text-secondary text-xs font-semibold mb-2">
                                                    Target Systems:
                                                </p>
                                                <div className="flex flex-wrap gap-1.5">
                                                    {step.target_systems.map((system) => (
                                                        <span
                                                            key={system}
                                                            className="px-2 py-1 bg-accent-teal/10 text-accent-teal rounded text-xs font-medium"
                                                        >
                                                            {system}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                            <div className="flex gap-4 text-xs text-text-secondary">
                                                {step.timeout_seconds && (
                                                    <span>Timeout: {step.timeout_seconds}s</span>
                                                )}
                                                {step.retry_count && (
                                                    <span>Retries: {step.retry_count}</span>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Execution Section */}
                    {execution ? (
                        <div>
                            <h3 className="text-lg font-bold text-text-primary mb-4 flex items-center gap-2">
                                <Zap size={18} className="text-accent-teal" />
                                Execution Progress
                            </h3>
                            <ExecutionTimeline execution={execution} />
                        </div>
                    ) : showExecuteForm ? (
                        <div className="bg-dark-bg rounded-lg border border-accent-teal/20 p-4 space-y-4">
                            <h3 className="text-lg font-bold text-text-primary">Execute Workflow</h3>

                            <div>
                                <label className="block text-text-secondary text-sm mb-2">
                                    Incident ID
                                </label>
                                <input
                                    type="text"
                                    placeholder="Enter incident ID (e.g., INC-001)"
                                    value={incidentId}
                                    onChange={(e) => setIncidentId(e.target.value)}
                                    className="w-full bg-dark-surface border border-accent-teal/20 rounded-lg px-4 py-3 text-text-primary placeholder-text-secondary/50 focus:outline-none focus:border-accent-teal"
                                />
                            </div>

                            {error && (
                                <p className="text-red-400 text-sm">{error}</p>
                            )}

                            <div className="flex gap-3">
                                <button
                                    onClick={handleExecute}
                                    disabled={executing || !incidentId.trim()}
                                    className="flex-1 px-4 py-3 bg-accent-teal hover:bg-accent-teal/80 disabled:opacity-50 rounded-lg text-dark-bg font-bold transition-colors flex items-center justify-center gap-2"
                                >
                                    {executing ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-dark-bg/30 border-t-dark-bg rounded-full animate-spin" />
                                            Executing...
                                        </>
                                    ) : (
                                        <>
                                            <Play size={18} />
                                            Execute
                                        </>
                                    )}
                                </button>
                                <button
                                    onClick={() => {
                                        setShowExecuteForm(false);
                                        setError(null);
                                    }}
                                    className="px-4 py-3 border border-accent-teal/30 hover:bg-accent-teal/10 rounded-lg text-text-primary font-semibold transition-colors"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    ) : null}
                </div>

                {/* Footer Actions */}
                {!execution && !showExecuteForm && (
                    <div className="shrink-0 border-t border-accent-teal/10 px-6 py-4 bg-dark-surface">
                        <button
                            onClick={() => setShowExecuteForm(true)}
                            disabled={!workflow.is_active}
                            className="w-full px-4 py-3 bg-gradient-to-r from-accent-teal to-accent-teal/80 hover:from-accent-teal/90 hover:to-accent-teal/70 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-dark-bg font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-accent-teal/20"
                        >
                            <Play size={20} />
                            Execute Workflow
                        </button>
                        {!workflow.is_active && (
                            <p className="text-text-secondary text-xs text-center mt-2">
                                This workflow is currently inactive
                            </p>
                        )}
                    </div>
                )}
            </div>
        </>
    );
};

export default WorkflowDetail;
