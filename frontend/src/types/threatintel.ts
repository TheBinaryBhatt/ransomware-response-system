// ============================================
// THREAT INTEL TYPES - Phase 3 Threat Intelligence
// ============================================

export interface IPReputation {
    ip_address: string;
    is_whitelisted: boolean;
    abuse_confidence_score: number; // 0-100
    total_reports: number;
    last_reported_at?: string;
    threat_types: string[];
    country_code: string;
    country_name: string;
    is_vpn: boolean;
    is_proxy: boolean;
    is_tor: boolean;
    is_datacenter: boolean;
    usage_type: string;
    isp_name: string;
    domain_name?: string;
}

export interface FileHash {
    file_hash: string;
    hash_type: 'MD5' | 'SHA1' | 'SHA256';
    sha256?: string;
    md5?: string;
    sha1?: string;
    file_name?: string;
    file_size?: number;
    file_type?: string;
    magic: string;
    threat_level: 'CLEAN' | 'SUSPICIOUS' | 'MALICIOUS';
    threat_score: number; // 0-100
    threat_names: string[];
    first_seen?: string;
    last_seen?: string;
    reporter_count: number;
    detections?: Array<{
        vendor: string;
        category: string;
        engine_name: string;
    }>;
}

export interface ThreatLookupResponse<T> {
    success: boolean;
    data: T;
    error?: string;
}

export type ThreatType = 'ip' | 'hash';
