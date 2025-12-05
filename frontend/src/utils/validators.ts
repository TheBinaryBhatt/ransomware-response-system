// ============================================
// INPUT VALIDATORS
// ============================================

export const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};

export const isValidIP = (ip: string): boolean => {
    const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (!ipv4Regex.test(ip)) return false;

    const parts = ip.split('.');
    return parts.every(part => {
        const num = parseInt(part, 10);
        return num >= 0 && num <= 255;
    });
};

export const isValidHash = (hash: string): boolean => {
    // MD5: 32 chars, SHA1: 40 chars, SHA256: 64 chars
    const md5Regex = /^[a-fA-F0-9]{32}$/;
    const sha1Regex = /^[a-fA-F0-9]{40}$/;
    const sha256Regex = /^[a-fA-F0-9]{64}$/;

    return md5Regex.test(hash) || sha1Regex.test(hash) || sha256Regex.test(hash);
};

export const isValidDomain = (domain: string): boolean => {
    const domainRegex = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9][a-z0-9-]{0,61}[a-z0-9]$/i;
    return domainRegex.test(domain);
};

export const isValidUsername = (username: string): boolean => {
    // 3-64 characters, alphanumeric and underscores only
    const usernameRegex = /^[a-zA-Z0-9_]{3,64}$/;
    return usernameRegex.test(username);
};

export const isValidPassword = (password: string): boolean => {
    // Minimum 8 characters
    return password.length >= 8;
};

export const isEmpty = (value: any): boolean => {
    if (value === null || value === undefined) return true;
    if (typeof value === 'string') return value.trim().length === 0;
    if (Array.isArray(value)) return value.length === 0;
    if (typeof value === 'object') return Object.keys(value).length === 0;
    return false;
};
