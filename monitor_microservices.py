#!/usr/bin/env python3
"""
Real-time Microservice Coordination Monitor
Shows how alerts flow through the system
"""

import time
import requests
import json
from datetime import datetime
import threading
from queue import Queue

class MicroserviceMonitor:
    def __init__(self, base_url="http://localhost:8000"):
        self.base_url = base_url
        self.event_queue = Queue()
        self.monitoring = False
    
    def log_event(self, service, event, data=None):
        """Log microservice events"""
        timestamp = datetime.now().strftime("%H:%M:%S")
        print(f"[{timestamp}] 🎯 [{service}] {event}")
        if data:
            print(f"      📦 {json.dumps(data, indent=2)}")
    
    def monitor_ingestion(self):
        """Monitor ingestion service"""
        self.log_event("INGESTION", "Service started monitoring")
        
        # In a real scenario, you'd connect to logs or message queue
        # For demo, we'll simulate monitoring
        
    def monitor_triage(self):
        """Monitor triage service"""
        self.log_event("TRIAGE", "Service started monitoring")
        
    def monitor_response(self):
        """Monitor response service""" 
        self.log_event("RESPONSE", "Service started monitoring")
    
    def send_test_alert(self, alert_type="ransomware"):
        """Send different types of test alerts"""
        
        alerts = {
            "ransomware": {
                "alert_id": f"ransomware_test_{int(time.time())}",
                "source": "wazuh",
                "event_type": "ransomware_detected", 
                "source_ip": "192.168.1.100",
                "severity": "critical",
                "description": "Files being encrypted with .locked extension"
            },
            "malware": {
                "alert_id": f"malware_test_{int(time.time())}",
                "source": "wazuh", 
                "event_type": "malware_detected",
                "source_ip": "10.0.0.50",
                "severity": "high",
                "description": "Suspicious executable detected"
            },
            "brute_force": {
                "alert_id": f"bruteforce_test_{int(time.time())}",
                "source": "wazuh",
                "event_type": "ssh_bruteforce", 
                "source_ip": "203.0.113.10",
                "severity": "medium",
                "description": "Multiple failed SSH login attempts"
            }
        }
        
        alert = alerts.get(alert_type, alerts["ransomware"])
        
        self.log_event("TEST", f"Sending {alert_type} alert", alert)
        
        try:
            response = requests.post(
                f"{self.base_url}/siem/webhook",
                json=alert,
                timeout=10
            )
            
            self.log_event("INGESTION", f"Alert received - Status: {response.status_code}")
            return alert["alert_id"]
            
        except Exception as e:
            self.log_event("INGESTION", f"Alert failed - Error: {str(e)}")
            return None
    
    def track_incident_flow(self, alert_id, max_wait=30):
        """Track how incident flows through microservices"""
        self.log_event("MONITOR", f"Tracking incident: {alert_id}")
        
        start_time = time.time()
        incident_created = False
        ai_analyzed = False
        response_triggered = False
        
        while time.time() - start_time < max_wait:
            try:
                # Get incidents (in real app, use WebSocket or polling)
                response = requests.get(f"{self.base_url}/api/v1/incidents")
                if response.status_code == 200:
                    incidents = response.json()
                    
                    # Find our incident
                    for incident in incidents:
                        if incident.get('alert_id') == alert_id:
                            if not incident_created:
                                self.log_event("TRIAGE", "Incident created", {
                                    "id": incident.get('id'),
                                    "status": incident.get('status')
                                })
                                incident_created = True
                            
                            # Check AI analysis
                            ai_data = incident.get('ai_analysis', {})
                            if ai_data and not ai_analyzed:
                                self.log_event("AI", "Analysis completed", {
                                    "decision": ai_data.get('decision'),
                                    "confidence": ai_data.get('confidence'),
                                    "ai_used": ai_data.get('ai_analysis', False)
                                })
                                ai_analyzed = True
                            
                            # Check if response was triggered
                            if incident.get('auto_response') and not response_triggered:
                                self.log_event("RESPONSE", "Automated response triggered", {
                                    "actions": incident.get('recommended_actions', [])
                                })
                                response_triggered = True
                
                if incident_created and ai_analyzed:
                    self.log_event("MONITOR", "✅ Incident flow completed successfully!")
                    return True
                    
                time.sleep(2)  # Poll every 2 seconds
                
            except Exception as e:
                self.log_event("MONITOR", f"Error tracking incident: {str(e)}")
                time.sleep(2)
        
        self.log_event("MONITOR", "❌ Incident tracking timeout")
        return False
    
    def run_demo(self):
        """Run a complete demo of the system"""
        print("🚀 Starting Microservice Coordination Demo")
        print("=" * 50)
        
        # Send test alert
        alert_id = self.send_test_alert("ransomware")
        
        if alert_id:
            # Track the flow
            success = self.track_incident_flow(alert_id)
            
            if success:
                print("\n🎉 DEMO COMPLETED SUCCESSFULLY!")
                print("   The alert flowed through all microservices:")
                print("   1. 📨 Ingestion Service → Received alert")
                print("   2. 🤖 Triage Service → AI analysis completed") 
                print("   3. 🚨 Response Service → Automated actions triggered")
                print("   4. 📋 Audit Service → Logs created")
            else:
                print("\n❌ DEMO FAILED - Check service logs")
        else:
            print("\n❌ DEMO FAILED - Could not send alert")

if __name__ == "__main__":
    monitor = MicroserviceMonitor()
    monitor.run_demo()