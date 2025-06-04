#!/usr/bin/env python3
"""
Targeted SWE-bench runner that only builds images for specific instances
"""

import json
import sys
import os
import tempfile
import time
import traceback
from pathlib import Path
from typing import Dict, Any, List, Optional

# Add swebench to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../../../../swebench'))

# Import after path setup
try:
    from swebench.harness.run_evaluation import run_instance, make_run_report
    from swebench.harness.utils import load_swebench_dataset, get_predictions_from_file
    from swebench.harness.docker_build import build_env_images, build_instance_image
    from swebench.harness.test_spec.test_spec import make_test_spec
    from swebench.harness.constants import (
        KEY_INSTANCE_ID,
        KEY_MODEL,
        KEY_PREDICTION,
        RUN_EVALUATION_LOG_DIR
    )
    import docker
except ImportError as e:
    print(json.dumps({
        "type": "error",
        "data": {
            "message": f"Failed to import SWE-bench: {str(e)}",
            "type": "ImportError"
        }
    }), flush=True)
    sys.exit(1)

def send_message(msg_type: str, data: Any):
    """Send JSON message to parent process via stdout"""
    message = {
        "type": msg_type,
        "timestamp": time.time(),
        "data": data
    }
    print(json.dumps(message), flush=True)

def format_predictions_for_swebench(predictions: List[Dict[str, Any]]) -> List[Dict[str, str]]:
    """Convert Commander predictions to SWE-bench format"""
    formatted = []
    for pred in predictions:
        patch_key = "model_patch" if "model_patch" in pred else "prediction"
        formatted.append({
            "instance_id": pred["instance_id"],
            "model_name_or_path": pred.get("model_name_or_path", "commander-claude-code"),
            "model_patch": pred.get(patch_key, ""),
            "prediction": pred.get(patch_key, "")
        })
    return formatted

def run_targeted_evaluation(predictions: List[Dict], config: Dict):
    """Run evaluation for specific instances only"""
    
    run_id = config.get("run_id", f"run_{int(time.time())}")
    dataset_name = config.get("dataset_name", "princeton-nlp/SWE-bench")
    max_workers = config.get("max_workers", 1)
    timeout = config.get("timeout", 1800)
    instance_ids = config.get("instance_ids", [p["instance_id"] for p in predictions])
    
    send_message("status", {
        "message": f"Starting targeted evaluation for {len(instance_ids)} instances",
        "instance_ids": instance_ids
    })
    
    # Load only the specific instances we need
    try:
        all_instances = load_swebench_dataset(dataset_name)
        instances = [i for i in all_instances if i["instance_id"] in instance_ids]
        send_message("status", {
            "message": f"Loaded {len(instances)} specific instances from dataset"
        })
    except Exception as e:
        send_message("error", {
            "message": f"Failed to load dataset: {str(e)}",
            "type": "DatasetError"
        })
        return
    
    # Create Docker client
    try:
        client = docker.from_env()
    except Exception as e:
        send_message("error", {
            "message": f"Failed to connect to Docker: {str(e)}",
            "type": "DockerError"
        })
        return
    
    # Create test specs for our specific instances
    test_specs = []
    for instance in instances:
        test_spec = make_test_spec(instance, namespace=None)
        # Skip x86_64 specs on ARM64
        import platform
        if platform.machine() == 'arm64' and test_spec.platform == 'x86_64':
            send_message("warning", {
                "message": f"Skipping x86_64 instance on ARM64: {instance['instance_id']}"
            })
            continue
        test_specs.append(test_spec)
    
    send_message("status", {
        "message": f"Created {len(test_specs)} test specs (ARM64 compatible)"
    })
    
    # Build only the environment images we need
    unique_env_images = list(set(spec.env_image_key for spec in test_specs))
    send_message("status", {
        "message": f"Building {len(unique_env_images)} required environment images"
    })
    
    # Build base images first (only for our instances)
    unique_base_images = list(set(spec.base_image_key for spec in test_specs))
    for base_image in unique_base_images:
        try:
            client.images.get(base_image)
            send_message("status", {"message": f"Base image {base_image} already exists"})
        except docker.errors.ImageNotFound:
            send_message("status", {"message": f"Building base image {base_image}"})
            # This will be ARM64 compatible
            # The build process will handle it correctly
    
    # Now build environment images
    try:
        successful, failed = build_env_images(
            client=client,
            dataset=instances,  # Only our specific instances
            force_rebuild=False,
            max_workers=max_workers
        )
        if failed:
            send_message("warning", {
                "message": f"{len(failed)} environment images failed to build",
                "failed": failed
            })
    except Exception as e:
        send_message("error", {
            "message": f"Failed to build environment images: {str(e)}",
            "type": "BuildError",
            "traceback": traceback.format_exc()
        })
        return
    
    # Format predictions
    predictions_dict = {p["instance_id"]: p for p in format_predictions_for_swebench(predictions)}
    
    # Run evaluation for each instance
    results = {}
    completed = 0
    
    for i, test_spec in enumerate(test_specs):
        instance_id = test_spec.instance_id
        if instance_id not in predictions_dict:
            continue
            
        send_message("status", {
            "message": f"Evaluating {instance_id} ({i+1}/{len(test_specs)})"
        })
        
        try:
            # Run single instance evaluation
            result = run_instance(
                test_spec=test_spec,
                pred=predictions_dict[instance_id],
                rm_image=True,
                force_rebuild=False,
                client=client,
                run_id=run_id,
                timeout=timeout
            )
            
            if result and len(result) == 2:
                instance_id, report = result
                results[instance_id] = report.get(instance_id, {})
                completed += 1
                
                send_message("progress", {
                    "completed": completed,
                    "total": len(test_specs),
                    "percentage": (completed / len(test_specs) * 100),
                    "run_id": run_id
                })
        except Exception as e:
            send_message("error", {
                "message": f"Failed to evaluate {instance_id}: {str(e)}",
                "instance_id": instance_id
            })
    
    # Calculate summary
    resolved_count = sum(1 for r in results.values() if r.get("resolved", False))
    success_rate = (resolved_count / len(results) * 100) if len(results) > 0 else 0
    
    send_message("complete", {
        "run_id": run_id,
        "results": results,
        "summary": {
            "total_instances": len(predictions_dict),
            "evaluated": len(results),
            "resolved": resolved_count,
            "success_rate": round(success_rate, 2),
            "percentage_complete": round((len(results) / len(predictions_dict) * 100), 2) if len(predictions_dict) > 0 else 0
        }
    })

def main():
    """Main entry point for targeted evaluation"""
    send_message("status", {"message": "SWE-bench targeted runner starting..."})
    
    try:
        # Read configuration from stdin
        config_str = sys.stdin.readline()
        if not config_str:
            send_message("error", {"message": "No configuration received", "type": "ConfigError"})
            sys.exit(1)
            
        config = json.loads(config_str)
        predictions = config.get("predictions", [])
        
        # Run targeted evaluation
        run_targeted_evaluation(predictions, config)
        
    except json.JSONDecodeError as e:
        send_message("error", {
            "message": f"Invalid JSON configuration: {str(e)}",
            "type": "JSONDecodeError"
        })
        sys.exit(1)
    except Exception as e:
        send_message("error", {
            "message": str(e),
            "type": type(e).__name__,
            "traceback": traceback.format_exc()
        })
        sys.exit(1)

if __name__ == "__main__":
    main()