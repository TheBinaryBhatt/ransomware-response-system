import subprocess
import sys
import os
from pathlib import Path
import time

def run_service(service_name, port):
    """Run a service using uvicorn"""
    # Use underscores in the module path (Python doesn't support hyphens in module names)
    service_path = f"backend.{service_name}.main:app"
    cmd = [
        sys.executable, "-m", "uvicorn",
        service_path,
        "--host", "0.0.0.0",
        "--port", str(port),
        "--reload"
    ]
    
    # Set the working directory to the project root and add it to Python path
    project_root = Path(__file__).parent
    env = os.environ.copy()
    env["PYTHONPATH"] = str(project_root)
    
    return subprocess.Popen(cmd, cwd=project_root, env=env)

def main():
    services = {
        "gateway": 8000,
        "ingestion_service": 8001,  # Changed from ingestion-service
        "triage_service": 8002,     # Changed from triage-service
        "response_service": 8003,   # Changed from response-service
        "audit_service": 8004       # Changed from audit-service
    }
    
    processes = []
    
    try:
        for service, port in services.items():
            print(f"Starting {service} on port {port}...")
            processes.append(run_service(service, port))
            # Add a small delay between starting services
            time.sleep(2)
        
        print("All services started. Press Ctrl+C to stop.")
        # Keep the script running
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("Stopping all services...")
        for process in processes:
            process.terminate()
        for process in processes:
            process.wait()

if __name__ == "__main__":
    main()