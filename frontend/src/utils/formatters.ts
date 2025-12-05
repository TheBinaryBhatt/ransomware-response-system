// ============================================
// DATE & TIME FORMATTERS
// ============================================

export const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    }).format(date);
};

export const formatDateTime = (dateString: string): string => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
    }).format(date);
};

export const formatTimeAgo = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}d ago`;
    const months = Math.floor(days / 30);
    if (months < 12) return `${months}mo ago`;
    const years = Math.floor(months / 12);
    return `${years}y ago`;
};

export const formatDuration = (seconds: number): string => {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    if (minutes < 60) {
        return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
};

// ============================================
// NUMBER FORMATTERS
// ============================================

export const formatNumber = (num: number): string => {
    return new Intl.NumberFormat('en-US').format(num);
};

export const formatPercentage = (value: number, decimals: number = 1): string => {
    return `${value.toFixed(decimals)}%`;
};

export const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// ============================================
// TEXT FORMATTERS
// ============================================

export const truncateText = (text: string, maxLength: number): string => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
};

export const formatIncidentId = (id: string): string => {
    // Truncate UUID for display: 3738fb31-f490-474a-9ce1-f01b5e932b59 → 3738fb31...
    if (id.length > 8) {
        return `${id.substring(0, 8)}...`;
    }
    return id;
};

export const capitalizeFirst = (str: string): string => {
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};

export const formatSeverity = (severity: string): string => {
    return severity.toUpperCase();
};

export const formatStatus = (status: string): string => {
    return status
        .split('_')
        .map(word => capitalizeFirst(word))
        .join(' ');
};
