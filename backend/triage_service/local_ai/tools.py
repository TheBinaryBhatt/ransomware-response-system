def lookup_threat_ip(ip: str) -> str:
    """Threat IP reputation checker - dummy implementation"""
    return f"Threat check for IP {ip}: No known threats found"


def recommend_actions(decision: str) -> list:
    """Map decision to recommended actions"""
    mapping = {
        "confirmed_ransomware": ["isolate_host", "block_ips", "notify_soc"],
        "suspicious_activity": ["monitor_closely", "escalate_to_analyst"],
        "escalate_human": ["escalate_to_analyst"],
        "benign": ["no_action"]
    }
    return mapping.get(decision, ["escalate_to_analyst"])