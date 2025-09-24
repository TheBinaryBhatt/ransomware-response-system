import sys
from pathlib import Path
import os

def setup_paths():
    """Setup Python paths for the project - Docker compatible version"""
    # Get the current directory
    current_dir = Path(__file__).parent
    
    # Add various paths to sys.path
    paths_to_add = [
        current_dir.parent,  # /app (backend root)
        current_dir.parent / "shared_lib" / "src",  # Shared library
        current_dir,  # Core directory
    ]
    
    # Add service-specific paths based on SERVICE_NAME environment variable
    service_name = os.getenv("SERVICE_NAME", "").lower()
    if service_name and service_name != "gateway":
        service_path = current_dir.parent / f"{service_name}_service"
        if service_path.exists():
            paths_to_add.append(service_path)
    
    # Add all paths to sys.path if they're not already there
    for path in paths_to_add:
        path_str = str(path)
        if path_str not in sys.path:
            sys.path.insert(0, path_str)