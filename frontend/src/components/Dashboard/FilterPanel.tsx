import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';

interface FilterPanelProps {
    onStatusChange: (statuses: string[]) => void;
    onThreatTypeChange: (types: string[]) => void;
    onSearchChange: (query: string) => void;
}

const FilterPanel: React.FC<FilterPanelProps> = ({
    onStatusChange,
    onThreatTypeChange,
    onSearchChange,
}) => {
    const [expandedSections, setExpandedSections] = useState({
        search: true,
        status: true,
        threatType: true,
    });

    const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
    const [selectedThreatTypes, setSelectedThreatTypes] = useState<string[]>([]);
    const [searchQuery, setSearchQuery] = useState('');

    const statusOptions = [
        'STATUS',
        'PENDING',
        'RESOLVED',
        'INVESTIGATING',
        'ESCALATED',
        'CRITICAL',
        'HIGH',
        'LOW',
        'INFO',
    ];

    const threatTypeOptions = [
        'Ransomware',
        'Phishing',
        'Malware',
        'DDoS',
        'Insider Threat',
        'Unknown',
    ];

    const toggleSection = (section: keyof typeof expandedSections) => {
        setExpandedSections(prev => ({
            ...prev,
            [section]: !prev[section],
        }));
    };

    const handleStatusChange = (status: string) => {
        const updated = selectedStatuses.includes(status)
            ? selectedStatuses.filter(s => s !== status)
            : [...selectedStatuses, status];
        setSelectedStatuses(updated);
        onStatusChange(updated);
    };

    const handleThreatTypeChange = (type: string) => {
        const updated = selectedThreatTypes.includes(type)
            ? selectedThreatTypes.filter(t => t !== type)
            : [...selectedThreatTypes, type];
        setSelectedThreatTypes(updated);
        onThreatTypeChange(updated);
    };

    const handleSearchChange = (value: string) => {
        setSearchQuery(value);
        onSearchChange(value);
    };

    return (
        <div className="bg-dark-surface rounded-lg border border-accent-teal/10 p-6 shadow-lg h-fit">
            <h3 className="text-lg font-bold text-text-primary mb-6">Filters</h3>

            {/* Search Section */}
            <div className="mb-6">
                <button
                    onClick={() => toggleSection('search')}
                    className="flex items-center justify-between w-full mb-3 text-text-primary hover:text-accent-teal transition-colors"
                >
                    <span className="font-medium text-sm">Search</span>
                    <ChevronDown
                        size={18}
                        className={`transform transition-transform ${expandedSections.search ? 'rotate-180' : ''
                            }`}
                    />
                </button>
                {expandedSections.search && (
                    <input
                        type="text"
                        placeholder="Search Address or ID..."
                        value={searchQuery}
                        onChange={e => handleSearchChange(e.target.value)}
                        className="w-full px-3 py-2 bg-dark-bg border border-accent-teal/20 rounded-lg text-text-primary placeholder-text-secondary text-sm focus:outline-none focus:border-accent-teal/50"
                    />
                )}
            </div>

            {/* Status Section */}
            <div className="mb-6">
                <button
                    onClick={() => toggleSection('status')}
                    className="flex items-center justify-between w-full mb-3 text-text-primary hover:text-accent-teal transition-colors"
                >
                    <span className="font-medium text-sm">Status</span>
                    <ChevronDown
                        size={18}
                        className={`transform transition-transform ${expandedSections.status ? 'rotate-180' : ''
                            }`}
                    />
                </button>
                {expandedSections.status && (
                    <div className="space-y-2">
                        {statusOptions.map(status => (
                            <label
                                key={status}
                                className="flex items-center gap-2 cursor-pointer group"
                            >
                                <input
                                    type="checkbox"
                                    checked={selectedStatuses.includes(status)}
                                    onChange={() => handleStatusChange(status)}
                                    className="w-4 h-4 rounded border-accent-teal/30 bg-dark-bg text-accent-teal cursor-pointer accent-accent-teal"
                                />
                                <span className="text-sm text-text-secondary group-hover:text-text-primary transition-colors">
                                    {status}
                                </span>
                            </label>
                        ))}
                    </div>
                )}
            </div>

            {/* Threat Type Section */}
            <div>
                <button
                    onClick={() => toggleSection('threatType')}
                    className="flex items-center justify-between w-full mb-3 text-text-primary hover:text-accent-teal transition-colors"
                >
                    <span className="font-medium text-sm">Threat Type</span>
                    <ChevronDown
                        size={18}
                        className={`transform transition-transform ${expandedSections.threatType ? 'rotate-180' : ''
                            }`}
                    />
                </button>
                {expandedSections.threatType && (
                    <div className="space-y-2">
                        {threatTypeOptions.map(type => (
                            <label
                                key={type}
                                className="flex items-center gap-2 cursor-pointer group"
                            >
                                <input
                                    type="checkbox"
                                    checked={selectedThreatTypes.includes(type)}
                                    onChange={() => handleThreatTypeChange(type)}
                                    className="w-4 h-4 rounded border-accent-teal/30 bg-dark-bg text-accent-teal cursor-pointer accent-accent-teal"
                                />
                                <span className="text-sm text-text-secondary group-hover:text-text-primary transition-colors">
                                    {type}
                                </span>
                            </label>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default FilterPanel;
