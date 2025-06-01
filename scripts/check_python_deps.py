#!/usr/bin/env python3
"""Check if required dependencies are installed."""

import json
import sys
import subprocess

def check_dependencies():
    """Check if required dependencies are installed."""
    missing_deps = []
    
    # Check for datasets library
    try:
        import datasets
    except ImportError:
        missing_deps.append("datasets")
    
    # Check for requests (usually comes with datasets)
    try:
        import requests
    except ImportError:
        missing_deps.append("requests")
    
    if missing_deps:
        print(json.dumps({
            "type": "error",
            "message": f"Missing required Python packages: {', '.join(missing_deps)}. Please install with: pip install {' '.join(missing_deps)}"
        }))
        return False
    
    return True

def install_dependencies():
    """Try to install missing dependencies."""
    try:
        subprocess.check_call([sys.executable, "-m", "pip", "install", "datasets"], 
                            stdout=subprocess.DEVNULL, 
                            stderr=subprocess.DEVNULL)
        return True
    except subprocess.CalledProcessError:
        return False

if __name__ == "__main__":
    if not check_dependencies():
        print(json.dumps({
            "type": "progress",
            "message": "Installing required dependencies...",
            "progress": 0
        }))
        
        if install_dependencies():
            print(json.dumps({
                "type": "progress",
                "message": "Dependencies installed successfully!",
                "progress": 100
            }))
        else:
            print(json.dumps({
                "type": "error",
                "message": "Failed to install dependencies. Please run manually: pip install datasets"
            }))
            sys.exit(1)
    else:
        print(json.dumps({
            "type": "success",
            "message": "All dependencies are installed"
        }))