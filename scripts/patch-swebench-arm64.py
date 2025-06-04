#!/usr/bin/env python3
"""
Patch SWE-bench to skip x86_64 builds on ARM64 machines
"""

import platform
import sys
from pathlib import Path

def patch_docker_build():
    """Patch the docker build to skip x86_64 on ARM64"""
    
    # Check if we're on ARM64
    if platform.machine() != 'arm64':
        print("Not on ARM64, no patching needed")
        return
        
    docker_build_file = Path("swebench/swebench/harness/docker_build.py")
    
    if not docker_build_file.exists():
        print(f"Error: {docker_build_file} not found")
        sys.exit(1)
        
    # Read the file
    content = docker_build_file.read_text()
    
    # Check if already patched
    if "# ARM64 PATCH" in content:
        print("Already patched!")
        return
        
    # Find the build_base_images function and add a check
    patch = '''
    for image_name, (dockerfile, platform) in base_images.items():
        # ARM64 PATCH: Skip x86_64 builds on ARM64 machines
        import platform as platform_module
        if platform_module.machine() == 'arm64' and platform == 'x86_64':
            print(f"[ARM64] Skipping x86_64 image: {image_name}")
            continue
        # END ARM64 PATCH
'''
    
    # Replace the line
    original = "\n    for image_name, (dockerfile, platform) in base_images.items():"
    
    if original in content:
        content = content.replace(original, patch)
        docker_build_file.write_text(content)
        print("✅ Patched docker_build.py to skip x86_64 builds on ARM64")
    else:
        print("❌ Could not find the line to patch")
        
if __name__ == "__main__":
    patch_docker_build()