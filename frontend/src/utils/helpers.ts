// ============================================
// HELPER UTILITIES
// ============================================

import { COLORS } from './constants';

export const generateId = (): string => {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
};

export const sleep = (ms: number): Promise<void> => {
    return new Promise(resolve => setTimeout(resolve, ms));
};

export const debounce = <T extends (...args: any[]) => any>(
    func: T,
    wait: number
): ((...args: Parameters<T>) => void) => {
    let timeout: NodeJS.Timeout | null = null;

    return (...args: Parameters<T>) => {
        if (timeout) clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), wait);
    };
};

export const getSeverityColor = (severity: string): string => {
    switch (severity.toUpperCase()) {
        case 'CRITICAL':
            return COLORS.STATUS_CRITICAL;
        case 'HIGH':
            return COLORS.STATUS_CRITICAL;
        case 'MEDIUM':
            return COLORS.STATUS_WARNING;
        case 'LOW':
            return COLORS.STATUS_SUCCESS;
        case 'INFO':
            return COLORS.STATUS_INFO;
        default:
            return COLORS.TEXT_SECONDARY;
    }
};

export const getStatusColor = (status: string): string => {
    switch (status.toUpperCase()) {
        case 'NEW':
        case 'PENDING':
            return COLORS.STATUS_INFO;
        case 'INVESTIGATING':
            return COLORS.STATUS_WARNING;
        case 'RESOLVED':
        case 'COMPLETED':
            return COLORS.STATUS_SUCCESS;
        case 'ESCALATED':
        case 'FAILED':
            return COLORS.STATUS_CRITICAL;
        default:
            return COLORS.TEXT_SECONDARY;
    }
};

export const getResponseTimeColor = (seconds: number): string => {
    if (seconds < 60) return COLORS.STATUS_SUCCESS;
    if (seconds < 120) return COLORS.STATUS_WARNING;
    return COLORS.STATUS_CRITICAL;
};

export const copyToClipboard = async (text: string): Promise<boolean> => {
    try {
        await navigator.clipboard.writeText(text);
        return true;
    } catch (err) {
        console.error('Failed to copy to clipboard:', err);
        return false;
    }
};

export const downloadFile = (content: string, filename: string, type: string = 'text/plain') => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};

export const classNames = (...classes: (string | boolean | undefined | null)[]): string => {
    return classes.filter(Boolean).join(' ');
};
