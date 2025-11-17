import requests
import logging
import time
from typing import Dict, Optional, List
import os

logger = logging.getLogger(__name__)

class VirusTotalClient:
    def __init__(self):
        self.api_key = os.getenv("VIRUSTOTAL_API_KEY")
        self.base_url = "https://www.virustotal.com/api/v3"
        self.headers = {
            "x-apikey": self.api_key,
            "User-Agent": "Ransomware-Response-System/1.0"
        }
        self.rate_limit_delay = 15  #seconds between requests
    
    def is_configured(self) -> bool:
        """Check if VirusTotal API key is configured"""
        return bool(self.api_key and self.api_key != "your-virustotal-api-key")
    
    def get_ip_report(self, ip: str) -> Optional[Dict]:
        """Get VirusTotal report for IP address"""
        if not self.is_configured():
            logger.warning("VirusTotal API key not configured")
            return None
        
        try:
            url = f"{self.base_url}/ip_addresses/{ip}"
            response = requests.get(url, headers=self.headers, timeout=10)
            
            if response.status_code == 200:
                return response.json()
            elif response.status_code == 404:
                logger.warning(f"IP {ip} not found in VirusTotal")
            elif response.status_code == 429:
                logger.warning("VirusTotal rate limit exceeded")
            else:
                logger.error(f"VirusTotal API error: {response.status_code}")
            
            return None
        except Exception as e:
            logger.error(f"VirusTotal IP lookup failed: {e}")
            return None
    
    def get_file_report(self, file_hash: str) -> Optional[Dict]:
        """Get VirusTotal report for file hash"""
        if not self.is_configured():
            logger.warning("VirusTotal API key not configured")
            return None
        
        try:
            url = f"{self.base_url}/files/{file_hash}"
            response = requests.get(url, headers=self.headers, timeout=10)
            
            if response.status_code == 200:
                return response.json()
            elif response.status_code == 404:
                logger.warning(f"File hash {file_hash} not found in VirusTotal")
            elif response.status_code == 429:
                logger.warning("VirusTotal rate limit exceeded")
            else:
                logger.error(f"VirusTotal file API error: {response.status_code}")
            
            return None
        except Exception as e:
            logger.error(f"VirusTotal file lookup failed: {e}")
            return None
    
    def get_domain_report(self, domain: str) -> Optional[Dict]:
        """Get VirusTotal report for domain"""
        if not self.is_configured():
            logger.warning("VirusTotal API key not configured")
            return None
        
        try:
            url = f"{self.base_url}/domains/{domain}"
            response = requests.get(url, headers=self.headers, timeout=10)
            
            if response.status_code == 200:
                return response.json()
            elif response.status_code == 404:
                logger.warning(f"Domain {domain} not found in VirusTotal")
            elif response.status_code == 429:
                logger.warning("VirusTotal rate limit exceeded")
            else:
                logger.error(f"VirusTotal domain API error: {response.status_code}")
            
            return None
        except Exception as e:
            logger.error(f"VirusTotal domain lookup failed: {e}")
            return None
    
    def analyze_ip_reputation(self, ip: str) -> Dict:
        """Analyze IP reputation and return threat score"""
        report = self.get_ip_report(ip)
        
        if not report:
            return {
                "ip": ip,
                "reputation_score": 0,
                "malicious_vendors": 0,
                "suspicious_vendors": 0,
                "total_vendors": 0,
                "threat_level": "unknown",
                "analysis_time": time.time()
            }
        
        try:
            attributes = report.get('data', {}).get('attributes', {})
            last_analysis_stats = attributes.get('last_analysis_stats', {})
            
            malicious = last_analysis_stats.get('malicious', 0)
            suspicious = last_analysis_stats.get('suspicious', 0)
            total = last_analysis_stats.get('harmless', 0) + malicious + suspicious + last_analysis_stats.get('undetected', 0)
            
            # Calculate threat score (0-100)
            if total > 0:
                threat_score = (malicious * 100 + suspicious * 50) / total
            else:
                threat_score = 0
            
            # Determine threat level
            if malicious >= 5:
                threat_level = "high"
            elif malicious >= 2:
                threat_level = "medium"
            elif malicious >= 1:
                threat_level = "low"
            else:
                threat_level = "clean"
            
            return {
                "ip": ip,
                "reputation_score": attributes.get('reputation', 0),
                "malicious_vendors": malicious,
                "suspicious_vendors": suspicious,
                "total_vendors": total,
                "threat_score": min(100, threat_score),
                "threat_level": threat_level,
                "country": attributes.get('country'),
                "as_owner": attributes.get('as_owner'),
                "analysis_time": time.time()
            }
            
        except Exception as e:
            logger.error(f"Error analyzing IP reputation: {e}")
            return {
                "ip": ip,
                "reputation_score": 0,
                "malicious_vendors": 0,
                "threat_level": "unknown",
                "analysis_time": time.time()
            }

# Global instance
virustotal_client = VirusTotalClient()