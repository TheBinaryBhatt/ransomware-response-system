// ============================================
// ComplianceModal - Generate compliance reports
// ============================================

import React, { useState } from 'react';
import { X, FileText, Calendar, AlertTriangle, Check, Loader2 } from 'lucide-react';
import type { ComplianceReportType, ComplianceReport } from '../../types/auditlog';

interface ComplianceModalProps {
    onClose: () => void;
    onGenerate: (type: ComplianceReportType, startDate: string, endDate: string) => Promise<ComplianceReport | null>;
}

const reportTypes: { value: ComplianceReportType; label: string; description: string; icon: string }[] = [
    {
        value: 'SOC2',
        label: 'SOC 2 Type II',
        description: 'Service Organization Control 2 - Security, Availability, Processing Integrity',
        icon: '🛡️'
    },
    {
        value: 'HIPAA',
        label: 'HIPAA Compliance',
        description: 'Health Insurance Portability and Accountability Act requirements',
        icon: '🏥'
    },
    {
        value: 'ISO27001',
        label: 'ISO 27001',
        description: 'Information Security Management System international standard',
        icon: '🌐'
    },
];

const ComplianceModal: React.FC<ComplianceModalProps> = ({ onClose, onGenerate }) => {
    const [reportType, setReportType] = useState<ComplianceReportType>('SOC2');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [loading, setLoading] = useState(false);
    const [report, setReport] = useState<ComplianceReport | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Set default date range (last 30 days)
    React.useEffect(() => {
        const end = new Date();
        const start = new Date();
        start.setDate(start.getDate() - 30);
        setEndDate(end.toISOString().split('T')[0]);
        setStartDate(start.toISOString().split('T')[0]);
    }, []);

    const handleGenerate = async () => {
        if (!startDate || !endDate) {
            setError('Please select a date range');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const result = await onGenerate(reportType, startDate, endDate);
            if (result) {
                setReport(result);
            }
        } catch (err: any) {
            setError(err.message || 'Failed to generate report');
        } finally {
            setLoading(false);
        }
    };



    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-dark-surface rounded-2xl border border-accent-teal/20 z-50 overflow-hidden">
                {/* Header */}
                <div className="bg-gradient-to-r from-dark-surface to-dark-bg border-b border-accent-teal/10 px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-accent-teal/10 rounded-lg">
                                <FileText size={20} className="text-accent-teal" />
                            </div>
                            <h2 className="text-xl font-bold text-text-primary">
                                Compliance Report
                            </h2>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-dark-bg rounded-lg transition-colors"
                        >
                            <X size={20} className="text-text-secondary" />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="p-6 space-y-5">
                    {!report ? (
                        <>
                            {/* Report Type Selection */}
                            <div>
                                <label className="block text-text-secondary text-xs font-semibold mb-3 uppercase tracking-wider">
                                    Report Type
                                </label>
                                <div className="space-y-2">
                                    {reportTypes.map((type) => (
                                        <button
                                            key={type.value}
                                            onClick={() => setReportType(type.value)}
                                            className={`w-full text-left p-4 rounded-xl border transition-all ${reportType === type.value
                                                ? 'bg-accent-teal/10 border-accent-teal text-text-primary'
                                                : 'bg-dark-bg border-accent-teal/10 text-text-secondary hover:border-accent-teal/30'
                                                }`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <span className="text-2xl">{type.icon}</span>
                                                <div>
                                                    <p className="font-semibold">{type.label}</p>
                                                    <p className="text-xs opacity-70">{type.description}</p>
                                                </div>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Date Range */}
                            <div>
                                <label className="block text-text-secondary text-xs font-semibold mb-3 uppercase tracking-wider flex items-center gap-1.5">
                                    <Calendar size={14} />
                                    Report Period
                                </label>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-text-secondary text-xs mb-1">From</label>
                                        <input
                                            type="date"
                                            value={startDate}
                                            onChange={(e) => setStartDate(e.target.value)}
                                            className="w-full bg-dark-bg border border-accent-teal/20 rounded-lg px-3 py-2.5 text-text-primary text-sm focus:outline-none focus:border-accent-teal"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-text-secondary text-xs mb-1">To</label>
                                        <input
                                            type="date"
                                            value={endDate}
                                            onChange={(e) => setEndDate(e.target.value)}
                                            className="w-full bg-dark-bg border border-accent-teal/20 rounded-lg px-3 py-2.5 text-text-primary text-sm focus:outline-none focus:border-accent-teal"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Error */}
                            {error && (
                                <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
                                    <AlertTriangle size={16} />
                                    {error}
                                </div>
                            )}

                            {/* Buttons */}
                            <div className="flex gap-3 pt-2">
                                <button
                                    onClick={handleGenerate}
                                    disabled={loading}
                                    className="flex-1 px-4 py-3 bg-gradient-to-r from-accent-teal to-accent-teal/80 hover:from-accent-teal/90 hover:to-accent-teal/70 disabled:opacity-50 rounded-xl text-dark-bg font-bold transition-all flex items-center justify-center gap-2"
                                >
                                    {loading ? (
                                        <>
                                            <Loader2 size={18} className="animate-spin" />
                                            Generating...
                                        </>
                                    ) : (
                                        <>
                                            <FileText size={18} />
                                            Generate Report
                                        </>
                                    )}
                                </button>
                                <button
                                    onClick={onClose}
                                    className="px-6 py-3 border border-accent-teal/30 hover:bg-accent-teal/10 rounded-xl text-text-primary font-semibold transition-colors"
                                >
                                    Cancel
                                </button>
                            </div>
                        </>
                    ) : (
                        /* Report Results */
                        <div className="space-y-4">
                            <div className="flex items-center gap-3 p-4 bg-green-500/10 border border-green-500/30 rounded-xl">
                                <Check size={24} className="text-green-400" />
                                <div>
                                    <p className="text-green-400 font-bold">Report Generated Successfully</p>
                                    <p className="text-green-400/70 text-sm">{report.report_name}</p>
                                </div>
                            </div>

                            {/* Statistics */}
                            <div className="grid grid-cols-3 gap-3">
                                <div className="bg-dark-bg p-3 rounded-lg text-center">
                                    <p className="text-2xl font-bold text-text-primary">{report.statistics.total_events}</p>
                                    <p className="text-text-secondary text-xs">Total Events</p>
                                </div>
                                <div className="bg-dark-bg p-3 rounded-lg text-center">
                                    <p className="text-2xl font-bold text-accent-teal">{report.statistics.security_events}</p>
                                    <p className="text-text-secondary text-xs">Security Events</p>
                                </div>
                                <div className="bg-dark-bg p-3 rounded-lg text-center">
                                    <p className="text-2xl font-bold text-red-400">{report.statistics.failed_attempts}</p>
                                    <p className="text-text-secondary text-xs">Failed Attempts</p>
                                </div>
                            </div>

                            {/* Findings */}
                            {report.findings.length > 0 && (
                                <div>
                                    <p className="text-text-secondary text-xs font-semibold mb-2 uppercase">Findings</p>
                                    <div className="space-y-2">
                                        {report.findings.map((finding, i) => (
                                            <div
                                                key={i}
                                                className={`p-3 rounded-lg border ${finding.severity === 'critical' ? 'bg-red-500/10 border-red-500/30' :
                                                    finding.severity === 'warning' ? 'bg-yellow-500/10 border-yellow-500/30' :
                                                        'bg-blue-500/10 border-blue-500/30'
                                                    }`}
                                            >
                                                <p className="font-semibold text-text-primary text-sm">{finding.title}</p>
                                                <p className="text-text-secondary text-xs">{finding.description}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <button
                                onClick={onClose}
                                className="w-full px-4 py-3 bg-accent-teal hover:bg-accent-teal/80 rounded-xl text-dark-bg font-bold transition-colors"
                            >
                                Close
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
};

export default ComplianceModal;
