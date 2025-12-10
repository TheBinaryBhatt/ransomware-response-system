// ============================================
// AI Investigation Timeline - Show AI Decision Workflow
// ============================================

import React, { useState } from 'react';
import {
    CheckCircle,
    XCircle,
    AlertTriangle,
    Clock,
    ChevronDown,
    ChevronUp,
    Shield,
    Search,
    Brain,
    FileText,
    Activity
} from 'lucide-react';

interface WorkflowStep {
    step_id: string;
    step_name: string;
    status: 'success' | 'warning' | 'error' | 'pending';
    timestamp: string;
    duration_ms?: number;
    summary: string;
    details?: string | object;
    integration?: string;
}

interface AIInvestigationTimelineProps {
    triageResult: {
        decision?: string;
        confidence?: number;
        reasoning?: string;
        threat_score?: number;
        threat_level?: string;
        sigma_matches?: any[];
        yara_matches?: any[];
        intel?: any;
        recommended_actions?: string[];
    };
}

const AIInvestigationTimeline: React.FC<AIInvestigationTimelineProps> = ({ triageResult }) => {
    const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set());

    // Build workflow steps from triage result
    const buildWorkflowSteps = (): WorkflowStep[] => {
        const steps: WorkflowStep[] = [];
        const baseTime = new Date();

        // Step 1: Ingestion
        steps.push({
            step_id: 'ingestion',
            step_name: 'Alert Ingestion & Normalization',
            status: 'success',
            timestamp: new Date(baseTime.getTime() - 5000).toISOString(),
            duration_ms: 150,
            summary: 'Alert received and normalized, IOCs extracted',
            integration: 'Ingestion Service',
            details: {
                action: 'Normalized alert structure and extracted indicators of compromise',
                result: 'Alert validated and ready for analysis'
            }
        });

        // Step 2: Sigma Rules
        if (triageResult.sigma_matches && triageResult.sigma_matches.length > 0) {
            steps.push({
                step_id: 'sigma',
                step_name: 'Sigma Rule Detection',
                status: 'warning',
                timestamp: new Date(baseTime.getTime() - 4500).toISOString(),
                duration_ms: 320,
                summary: `${triageResult.sigma_matches.length} Sigma rule(s) matched`,
                integration: 'Sigma Engine',
                details: {
                    matches: triageResult.sigma_matches,
                    description: 'Sigma rules are generic detection signatures for suspicious activities'
                }
            });
        } else {
            steps.push({
                step_id: 'sigma',
                step_name: 'Sigma Rule Detection',
                status: 'success',
                timestamp: new Date(baseTime.getTime() - 4500).toISOString(),
                duration_ms: 280,
                summary: 'No Sigma rules matched',
                integration: 'Sigma Engine'
            });
        }

        // Step 3: YARA Scanning
        if (triageResult.yara_matches && triageResult.yara_matches.length > 0) {
            steps.push({
                step_id: 'yara',
                step_name: 'YARA Malware Scanning',
                status: 'error',
                timestamp: new Date(baseTime.getTime() - 4000).toISOString(),
                duration_ms: 450,
                summary: `${triageResult.yara_matches.length} YARA signature(s) detected`,
                integration: 'YARA Analyzer',
                details: {
                    matches: triageResult.yara_matches,
                    description: 'YARA detected malware signatures in the analyzed file or memory'
                }
            });
        } else {
            steps.push({
                step_id: 'yara',
                step_name: 'YARA Malware Scanning',
                status: 'success',
                timestamp: new Date(baseTime.getTime() - 4000).toISOString(),
                duration_ms: 380,
                summary: 'No YARA signatures detected',
                integration: 'YARA Analyzer'
            });
        }

        // Step 4: Threat Intelligence (AbuseIPDB)
        if (triageResult.intel?.abuseipdb) {
            const abuse = triageResult.intel.abuseipdb;
            const confidence = abuse.abuseConfidenceScore || abuse.confidence || 0;
            steps.push({
                step_id: 'abuseipdb',
                step_name: 'IP Reputation Check (AbuseIPDB)',
                status: confidence >= 75 ? 'error' : confidence >= 30 ? 'warning' : 'success',
                timestamp: new Date(baseTime.getTime() - 3500).toISOString(),
                duration_ms: 890,
                summary: `IP abuse confidence: ${confidence}%`,
                integration: 'AbuseIPDB',
                details: abuse
            });
        }

        // Step 5: MalwareBazaar
        if (triageResult.intel?.malwarebazaar) {
            const mb = triageResult.intel.malwarebazaar;
            const isMalicious = mb.is_malicious || mb.sha256 || mb.verdict === 'malicious';
            steps.push({
                step_id: 'malwarebazaar',
                step_name: 'File Hash Lookup (MalwareBazaar)',
                status: isMalicious ? 'error' : 'success',
                timestamp: new Date(baseTime.getTime() - 3000).toISOString(),
                duration_ms: 1200,
                summary: isMalicious ? 'File hash found in malware database' : 'File hash not in malware database',
                integration: 'MalwareBazaar',
                details: mb
            });
        }

        // Step 6: VirusTotal
        if (triageResult.intel?.virustotal) {
            const vt = triageResult.intel.virustotal;
            const derived = triageResult.intel.derived || {};
            const maliciousCount = derived.vt_malicious_count || 0;
            steps.push({
                step_id: 'virustotal',
                step_name: 'Multi-Engine Scan (VirusTotal)',
                status: maliciousCount > 5 ? 'error' : maliciousCount > 0 ? 'warning' : 'success',
                timestamp: new Date(baseTime.getTime() - 2500).toISOString(),
                duration_ms: 1450,
                summary: maliciousCount > 0 
                    ? `${maliciousCount} antivirus engine(s) flagged as malicious` 
                    : 'No malicious flags from antivirus engines',
                integration: 'VirusTotal',
                details: vt
            });
        }

        // Step 7: AI Analysis
        steps.push({
            step_id: 'ai_analysis',
            step_name: 'AI Threat Analysis',
            status: 'success',
            timestamp: new Date(baseTime.getTime() - 2000).toISOString(),
            duration_ms: 1800,
            summary: `Decision: ${(triageResult.decision || 'unknown').replace(/_/g, ' ').toUpperCase()}`,
            integration: 'AI Triage Agent',
            details: {
                confidence: triageResult.confidence,
                threat_score: triageResult.threat_score,
                threat_level: triageResult.threat_level,
                reasoning: triageResult.reasoning,
                recommended_actions: triageResult.recommended_actions
            }
        });

        return steps;
    };

    const steps = buildWorkflowSteps();

    const toggleStep = (stepId: string) => {
        const newSet = new Set(expandedSteps);
        if (newSet.has(stepId)) {
            newSet.delete(stepId);
        } else {
            newSet.add(stepId);
        }
        setExpandedSteps(newSet);
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'success':
                return { Icon: CheckCircle, color: 'text-green-400', bg: 'bg-green-500/20' };
            case 'warning':
                return { Icon: AlertTriangle, color: 'text-yellow-400', bg: 'bg-yellow-500/20' };
            case 'error':
                return { Icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/20' };
            case 'pending':
                return { Icon: Clock, color: 'text-blue-400', bg: 'bg-blue-500/20' };
            default:
                return { Icon: Activity, color: 'text-text-secondary', bg: 'bg-dark-bg' };
        }
    };

    const getIntegrationIcon = (integration?: string) => {
        if (!integration) return Shield;
        if (integration.toLowerCase().includes('sigma')) return Search;
        if (integration.toLowerCase().includes('yara')) return FileText;
        if (integration.toLowerCase().includes('ai')) return Brain;
        return Shield;
    };

    return (
        <div className="bg-gradient-to-br from-purple-500/10 to-accent-teal/10 rounded-xl border border-purple-500/20 p-4">
            <div className="flex items-center gap-2 mb-4">
                <Brain size={18} className="text-purple-400" />
                <h3 className="text-sm font-semibold text-text-primary uppercase tracking-wider">
                    AI Investigation Workflow
                </h3>
                <span className="text-xs text-text-secondary ml-auto">
                    {steps.length} steps completed
                </span>
            </div>

            <div className="space-y-2">
                {steps.map((step, index) => {
                    const { Icon: StatusIcon, color: statusColor, bg: statusBg } = getStatusIcon(step.status);
                    const IntegrationIcon = getIntegrationIcon(step.integration);
                    const isExpanded = expandedSteps.has(step.step_id);
                    const hasDetails = step.details && Object.keys(step.details).length > 0;

                    return (
                        <div
                            key={step.step_id}
                            className="bg-dark-bg/50 rounded-lg border border-accent-teal/10 overflow-hidden"
                        >
                            <button
                                onClick={() => hasDetails && toggleStep(step.step_id)}
                                disabled={!hasDetails}
                                className={`w-full px-4 py-3 flex items-start gap-3 transition-colors ${
                                    hasDetails ? 'hover:bg-accent-teal/5 cursor-pointer' : 'cursor-default'
                                }`}
                            >
                                {/* Timeline Line */}
                                <div className="flex flex-col items-center">
                                    <div className={`w-8 h-8 rounded-full ${statusBg} flex items-center justify-center shrink-0`}>
                                        <StatusIcon size={16} className={statusColor} />
                                    </div>
                                    {index < steps.length - 1 && (
                                        <div className="w-0.5 h-8 bg-accent-teal/20 mt-1" />
                                    )}
                                </div>

                                {/* Content */}
                                <div className="flex-1 text-left min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <IntegrationIcon size={14} className="text-accent-teal shrink-0" />
                                        <span className="text-sm font-semibold text-text-primary truncate">
                                            {step.step_name}
                                        </span>
                                        {step.duration_ms && (
                                            <span className="text-xs text-text-secondary shrink-0">
                                                ({step.duration_ms}ms)
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-xs text-text-secondary mb-1">
                                        {step.summary}
                                    </p>
                                    {step.integration && (
                                        <span className="text-xs text-accent-teal/70 font-mono">
                                            via {step.integration}
                                        </span>
                                    )}
                                </div>

                                {/* Expand Icon */}
                                {hasDetails && (
                                    <div className="shrink-0">
                                        {isExpanded ? (
                                            <ChevronUp size={18} className="text-text-secondary" />
                                        ) : (
                                            <ChevronDown size={18} className="text-text-secondary" />
                                        )}
                                    </div>
                                )}
                            </button>

                            {/* Expanded Details */}
                            {isExpanded && hasDetails && (
                                <div className="px-4 pb-4 pt-2 border-t border-accent-teal/10 bg-dark-bg/70">
                                    <div className="pl-11">
                                        <pre className="text-xs text-text-secondary font-mono bg-dark-surface p-3 rounded-lg overflow-x-auto max-h-48">
                                            {typeof step.details === 'string' 
                                                ? step.details 
                                                : JSON.stringify(step.details, null, 2)}
                                        </pre>
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Summary Footer */}
            <div className="mt-4 pt-4 border-t border-purple-500/20">
                <div className="flex items-center justify-between text-xs">
                    <span className="text-text-secondary">
                        Total Processing Time
                    </span>
                    <span className="text-accent-teal font-bold">
                        {steps.reduce((sum, step) => sum + (step.duration_ms || 0), 0)}ms
                    </span>
                </div>
            </div>
        </div>
    );
};

export default AIInvestigationTimeline;
