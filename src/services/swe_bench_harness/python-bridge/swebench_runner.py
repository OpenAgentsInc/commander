#!/usr/bin/env python3
"""
Commander SWE-bench Bridge
Integrates official SWE-bench with Commander's TypeScript services
"""

import json
import sys
import os
import tempfile
import threading
import time
import traceback
from pathlib import Path
from typing import Dict, Any, List, Optional

# Add swebench to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../../../../swebench'))

# Import after path setup
try:
    from swebench.harness.run_evaluation import run_instances
    from swebench.harness.utils import load_swebench_dataset, get_predictions
    from swebench.harness.test_spec import make_test_spec
except ImportError as e:
    print(json.dumps({
        "type": "error",
        "data": {
            "message": f"Failed to import SWE-bench: {str(e)}. Make sure to run pip install -r requirements.txt",
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

def monitor_logs(run_id: str, total_instances: int, stop_event: threading.Event):
    """Monitor SWE-bench logs and send progress updates"""
    log_dir = Path(f"logs/run_evaluation/{run_id}")
    last_completed = 0
    
    while not stop_event.is_set():
        if log_dir.exists():
            # Count completed evaluations by looking for report.json files
            completed = 0
            for report_file in log_dir.rglob("report.json"):
                completed += 1
            
            if completed != last_completed:
                last_completed = completed
                percentage = (completed / total_instances * 100) if total_instances > 0 else 0
                send_message("progress", {
                    "completed": completed,
                    "total": total_instances,
                    "percentage": round(percentage, 2),
                    "run_id": run_id
                })
        time.sleep(1)

def format_predictions_for_swebench(predictions: List[Dict[str, Any]]) -> List[Dict[str, str]]:
    """Convert Commander predictions to SWE-bench format"""
    formatted = []
    for pred in predictions:
        formatted.append({
            "instance_id": pred["instance_id"],
            "model_name_or_path": pred.get("model_name_or_path", "commander-claude-code"),
            "model_patch": pred.get("model_patch", "")
        })
    return formatted

def main():
    """Main entry point for Commander integration"""
    send_message("status", {"message": "SWE-bench Python bridge starting..."})
    
    try:
        # Read configuration from stdin
        config_str = sys.stdin.readline()
        if not config_str:
            send_message("error", {"message": "No configuration received", "type": "ConfigError"})
            sys.exit(1)
            
        config = json.loads(config_str)
        send_message("status", {"message": "Configuration received", "config": config})
        
        # Extract configuration
        predictions = config.get("predictions", [])
        run_id = config.get("run_id", f"run_{int(time.time())}")
        dataset_name = config.get("dataset_name", "princeton-nlp/SWE-bench")
        max_workers = config.get("max_workers", 1)
        timeout = config.get("timeout", 1800)
        instance_ids = config.get("instance_ids", None)
        
        # Create temporary predictions file
        predictions_file = Path(tempfile.mktemp(suffix=".json"))
        formatted_predictions = format_predictions_for_swebench(predictions)
        predictions_file.write_text(json.dumps(formatted_predictions, indent=2))
        
        send_message("status", {
            "message": f"Loading dataset: {dataset_name}",
            "predictions_count": len(predictions)
        })
        
        # Load dataset instances
        try:
            instances = load_swebench_dataset(dataset_name)
            send_message("status", {
                "message": f"Loaded {len(instances)} instances from dataset"
            })
        except Exception as e:
            send_message("error", {
                "message": f"Failed to load dataset: {str(e)}",
                "type": "DatasetError"
            })
            predictions_file.unlink()
            sys.exit(1)
        
        # Filter instances if specific IDs provided
        if instance_ids:
            instances = [i for i in instances if i["instance_id"] in instance_ids]
            send_message("status", {
                "message": f"Filtered to {len(instances)} instances"
            })
        
        # Create a mapping of predictions by instance_id for quick lookup
        pred_map = {p["instance_id"]: p for p in formatted_predictions}
        
        # Filter predictions to only include instances we have
        instance_ids_set = {i["instance_id"] for i in instances}
        filtered_predictions = [p for p in formatted_predictions if p["instance_id"] in instance_ids_set]
        
        # Re-save filtered predictions
        predictions_file.write_text(json.dumps(filtered_predictions, indent=2))
        
        # Load predictions using SWE-bench utility
        predictions_dict = get_predictions(str(predictions_file), instance_ids_set)
        
        # Start progress monitor thread
        stop_event = threading.Event()
        monitor_thread = threading.Thread(
            target=monitor_logs,
            args=(run_id, len(predictions_dict), stop_event)
        )
        monitor_thread.start()
        
        send_message("status", {
            "message": f"Starting evaluation of {len(predictions_dict)} instances",
            "run_id": run_id,
            "max_workers": max_workers
        })
        
        # Run evaluation using official SWE-bench
        try:
            run_instances(
                predictions=predictions_dict,
                instances=instances,
                run_id=run_id,
                max_workers=max_workers,
                timeout=timeout,
                cache_level="instance",
                clean=True,
                force_rebuild=False
            )
        except Exception as e:
            send_message("error", {
                "message": f"Evaluation failed: {str(e)}",
                "type": "EvaluationError",
                "traceback": traceback.format_exc()
            })
            stop_event.set()
            monitor_thread.join()
            predictions_file.unlink()
            sys.exit(1)
        
        # Stop monitoring
        stop_event.set()
        monitor_thread.join()
        
        # Collect results
        send_message("status", {"message": "Collecting evaluation results..."})
        
        results_dir = Path(f"evaluation_results/{run_id}")
        log_dir = Path(f"logs/run_evaluation/{run_id}")
        results = {}
        
        # First try evaluation_results directory (newer format)
        if results_dir.exists():
            for result_file in results_dir.rglob("*.json"):
                if result_file.name != "report.json":  # Skip summary files
                    continue
                    
                with open(result_file) as f:
                    instance_result = json.load(f)
                    if isinstance(instance_result, dict) and len(instance_result) == 1:
                        # Extract the single key-value pair
                        instance_id = list(instance_result.keys())[0]
                        results[instance_id] = instance_result[instance_id]
        
        # Also check logs directory for report.json files
        if log_dir.exists():
            for report_file in log_dir.rglob("report.json"):
                with open(report_file) as f:
                    report_data = json.load(f)
                    if isinstance(report_data, dict):
                        # Could be single instance or multiple
                        for key, value in report_data.items():
                            if isinstance(value, dict) and "instance_id" in value:
                                results[key] = value
                            elif key not in results:  # Don't overwrite from evaluation_results
                                results[key] = report_data
        
        # Calculate summary statistics
        total_instances = len(predictions_dict)
        resolved_count = sum(1 for r in results.values() if r.get("resolved", False))
        success_rate = (resolved_count / total_instances * 100) if total_instances > 0 else 0
        
        send_message("complete", {
            "run_id": run_id,
            "results": results,
            "summary": {
                "total_instances": total_instances,
                "evaluated": len(results),
                "resolved": resolved_count,
                "success_rate": round(success_rate, 2),
                "percentage_complete": round((len(results) / total_instances * 100), 2) if total_instances > 0 else 0
            }
        })
        
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
    finally:
        # Cleanup
        if 'predictions_file' in locals() and predictions_file.exists():
            predictions_file.unlink()

if __name__ == "__main__":
    main()