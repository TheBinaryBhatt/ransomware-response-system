// ============================================
// WorkflowCard - Display workflow in card format
// ============================================

import React from 'react';
import { ChevronRight, Zap, Clock, TrendingUp } from 'lucide-react';
import type { Workflow, WorkflowCategory } from '../../types/workflow';

interface WorkflowCardProps {
    workflow: Workflow;
    onSelect: (workflow: Workflow) => void;
}

// Category configuration
const categoryConfig: Record<WorkflowCategory, { color: string; icon: string; label: string }> = {
    ransomware: { color: 'bg-red-500/20 text-red-400 border-red-500/30', icon: '🔐', label: 'RANSOMWARE' },
    phishing: { color: 'bg-orange-400/20 text-orange-400 border-orange-400/30', icon: '🎣', label: 'PHISHING' },
    malware: { color: 'bg-purple-500/20 text-purple-400 border-purple-500/30', icon: '🦠', label: 'MALWARE' },
    ddos: { color: 'bg-blue-500/20 text-blue-400 border-blue-500/30', icon: '💥', label: 'DDoS' },
    insider_threat: { color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30', icon: '👤', label: 'INSIDER' },
    custom: { color: 'bg-accent-teal/20 text-accent-teal border-accent-teal/30', icon: '⚙️', label: 'CUSTOM' },
};

const WorkflowCard: React.FC<WorkflowCardProps> = ({ workflow, onSelect }) => {
    const config = categoryConfig[workflow.category] || categoryConfig.custom;

    return (
        <button
            onClick={() => onSelect(workflow)}
            className="bg-dark-surface rounded-xl border border-accent-teal/10 p-6 hover:border-accent-teal/30 hover:shadow-lg hover:shadow-accent-teal/5 transition-all text-left group"
        >
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
                <div className="flex-1 pr-4">
                    <h3 className="text-lg font-bold text-text-primary mb-1 group-hover:text-accent-teal transition-colors">
                        {workflow.name}
                    </h3>
                    <p className="text-text-secondary text-sm line-clamp-2">
                        {workflow.description}
                    </p>
                </div>
                <ChevronRight size={20} className="text-text-secondary group-hover:text-accent-teal transition-colors mt-1 shrink-0" />
            </div>

            {/* Category Badge */}
            <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border mb-4 ${config.color}`}>
                <span>{config.icon}</span>
                <span>{config.label}</span>
            </div>

            {/* Stats Grid */}
            <div className="space-y-3 mb-4">
                {/* Success Rate */}
                <div className="flex items-center justify-between">
                    <span className="text-text-secondary text-sm flex items-center gap-1.5">
                        <TrendingUp size={14} />
                        Success Rate
                    </span>
                    <div className="flex items-center gap-2">
                        <div className="w-24 h-2 bg-dark-bg rounded-full overflow-hidden">
                            <div
                                className={`h-full rounded-full transition-all ${workflow.success_rate >= 80 ? 'bg-green-500' :
                                        workflow.success_rate >= 50 ? 'bg-accent-teal' :
                                            workflow.success_rate >= 30 ? 'bg-orange-500' : 'bg-red-500'
                                    }`}
                                style={{ width: `${workflow.success_rate}%` }}
                            />
                        </div>
                        <span className={`text-sm font-bold w-10 text-right ${workflow.success_rate >= 80 ? 'text-green-400' :
                                workflow.success_rate >= 50 ? 'text-accent-teal' :
                                    workflow.success_rate >= 30 ? 'text-orange-400' : 'text-red-400'
                            }`}>
                            {workflow.success_rate}%
                        </span>
                    </div>
                </div>

                {/* Executions */}
                <div className="flex items-center justify-between text-sm">
                    <span className="text-text-secondary flex items-center gap-1.5">
                        <Zap size={14} />
                        Executions
                    </span>
                    <span className="text-text-primary font-semibold">
                        {workflow.execution_count.toLocaleString()}
                    </span>
                </div>

                {/* Duration */}
                <div className="flex items-center justify-between text-sm">
                    <span className="text-text-secondary flex items-center gap-1.5">
                        <Clock size={14} />
                        Est. Duration
                    </span>
                    <span className="text-text-primary font-semibold">
                        {workflow.estimated_duration_seconds < 60
                            ? `${workflow.estimated_duration_seconds}s`
                            : `${Math.round(workflow.estimated_duration_seconds / 60)}m`}
                    </span>
                </div>
            </div>

            {/* Footer */}
            <div className="pt-4 border-t border-accent-teal/10 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${workflow.is_active ? 'bg-green-500' : 'bg-text-secondary/30'}`} />
                    <span className={`text-xs font-semibold ${workflow.is_active ? 'text-green-400' : 'text-text-secondary'}`}>
                        {workflow.is_active ? 'Active' : 'Inactive'}
                    </span>
                </div>
                <span className="text-text-secondary text-xs">
                    {workflow.steps.length} steps
                </span>
            </div>
        </button>
    );
};

export default WorkflowCard;
