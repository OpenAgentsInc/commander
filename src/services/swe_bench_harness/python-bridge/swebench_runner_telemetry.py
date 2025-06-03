#!/usr/bin/env python3
"""
Commander SWE-bench Bridge with Enhanced Telemetry
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
from datetime import datetime
import re

# Add swebench to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../../../../swebench'))

# Import after path setup
try:
    from swebench.harness.run_evaluation import run_instances
    from swebench.harness.utils import load_swebench_dataset, get_predictions_from_file
    from swebench.harness.docker_build import build_env_images
    import docker
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

def send_telemetry(category: str, action: str, label: str = None, value: Any = None, 
                   context: Dict[str, Any] = None, level: str = "info"):
    """Send telemetry event via stdout"""
    telemetry_event = {
        "type": "telemetry",
        "data": {
            "category": category,
            "action": action,
            "timestamp": int(time.time() * 1000),  # milliseconds
            "level": level
        }
    }
    
    if label:
        telemetry_event["data"]["label"] = label
    if value is not None:
        telemetry_event["data"]["value"] = value
    if context:
        telemetry_event["data"]["context"] = context
    
    print(json.dumps(telemetry_event), flush=True)

def monitor_logs_with_telemetry(run_id: str, total_instances: int, stop_event: threading.Event):
    """Monitor SWE-bench logs and send progress updates with telemetry"""
    log_dir = Path(f"logs/run_evaluation/{run_id}")
    last_completed = 0
    instances_status = {}  # Track status of each instance
    
    while not stop_event.is_set():
        try:
            # Check for log directory
            if log_dir.exists():
                # Look for instance-specific logs
                instance_logs = list(log_dir.glob("*/*.log"))
                
                for log_file in instance_logs:
                    instance_id = log_file.parent.name
                    
                    # Skip if we've already processed this instance
                    if instance_id in instances_status and instances_status[instance_id].get("completed"):
                        continue
                    
                    # Read log file
                    try:
                        with open(log_file, 'r') as f:
                            content = f.read()
                            
                        # Track instance start
                        if instance_id not in instances_status:
                            instances_status[instance_id] = {"started": True}
                            send_telemetry(
                                category="swebench_evaluation",
                                action="instance_evaluation_start",
                                label=instance_id,
                                context={"run_id": run_id}
                            )
                        
                        # Look for Docker build progress
                        if "Building Docker image" in content:
                            send_telemetry(
                                category="swebench_evaluation",
                                action="docker_build_start",
                                label=instance_id,
                                context={"run_id": run_id}
                            )
                        
                        # Look for test execution
                        test_matches = re.findall(r"Running test: (\S+)", content)
                        if test_matches:
                            for test in test_matches:
                                send_telemetry(
                                    category="swebench_evaluation",
                                    action="test_execution",
                                    label=instance_id,
                                    context={
                                        "run_id": run_id,
                                        "test": test
                                    }
                                )
                        
                        # Look for completion markers
                        if "EVALUATION COMPLETE" in content or "ERROR" in content:
                            instances_status[instance_id]["completed"] = True
                            
                            # Check if resolved
                            resolved = "RESOLVED: True" in content
                            send_telemetry(
                                category="swebench_evaluation",
                                action="instance_evaluation_complete",
                                label=instance_id,
                                context={
                                    "run_id": run_id,
                                    "resolved": resolved,
                                    "success": "ERROR" not in content
                                },
                                level="info" if resolved else "warn"
                            )
                    
                    except Exception as e:
                        # Log error but continue
                        send_telemetry(
                            category="swebench_evaluation",
                            action="log_read_error",
                            label=instance_id,
                            context={"error": str(e)},
                            level="error"
                        )
                
                # Count completed instances
                completed = sum(1 for status in instances_status.values() if status.get("completed"))
                
                if completed > last_completed:
                    last_completed = completed
                    percentage = (completed / total_instances * 100) if total_instances > 0 else 0
                    
                    send_message("progress", {
                        "completed": completed,
                        "total": total_instances,
                        "percentage": percentage
                    })
                    
                    send_telemetry(
                        category="swebench_evaluation",
                        action="progress_update",
                        label=run_id,
                        value=percentage,
                        context={
                            "completed": completed,
                            "total": total_instances
                        }
                    )
            
            time.sleep(1)  # Check every second
            
        except Exception as e:
            send_telemetry(
                category="swebench_evaluation",
                action="monitoring_error",
                context={"error": str(e)},
                level="error"
            )
            time.sleep(5)  # Wait longer on error

def process_command(command: Dict[str, Any]):
    """Process a command from the TypeScript side"""
    cmd_type = command.get("command")
    
    if cmd_type == "run_evaluation":
        predictions = command.get("predictions", [])
        options = command.get("options", {})
        
        send_message("status", {"message": "Starting SWE-bench evaluation..."})
        send_telemetry(
            category="swebench_evaluation",
            action="evaluation_start",
            label=options.get("run_id", "unknown"),
            context={
                "total_predictions": len(predictions),
                "dataset": options.get("dataset_name", "unknown"),
                "max_workers": options.get("max_workers", 1)
            }
        )
        
        # Create temp file for predictions
        with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as f:
            json.dump(predictions, f)
            predictions_file = f.name
        
        try:
            # Log configuration
            send_message("status", {"message": f"Configuration received", "predictions": len(predictions)})
            
            # Extract options
            dataset_name = options.get("dataset_name", "princeton-nlp/SWE-bench_Lite")
            max_workers = options.get("max_workers", 1)
            timeout = options.get("timeout", 1800)
            run_id = options.get("run_id", f"run_{int(time.time())}")
            instance_ids = options.get("instance_ids", None)
            namespace = options.get("namespace", None)
            
            # Load dataset
            send_message("status", {"message": f"Loading dataset: {dataset_name}"})
            send_telemetry(
                category="swebench_evaluation",
                action="dataset_loading",
                label=dataset_name
            )
            
            try:
                dataset = load_swebench_dataset(dataset_name)
                all_instances = [item["instance_id"] for item in dataset]
                send_message("status", {"message": f"Loaded {len(all_instances)} instances from dataset"})
            except Exception as e:
                send_telemetry(
                    category="swebench_evaluation",
                    action="dataset_load_error",
                    context={"error": str(e)},
                    level="error"
                )
                raise
            
            # Filter instances if specified
            if instance_ids:
                eval_instances = [i for i in instance_ids if i in all_instances]
                send_message("status", {"message": f"Filtered to {len(eval_instances)} instances"})
            else:
                # Get instance IDs from predictions
                pred_instance_ids = [p["instance_id"] for p in predictions]
                eval_instances = [i for i in pred_instance_ids if i in all_instances]
                
            send_message("status", {"message": f"Loaded {len(predictions)} predictions"})
            
            # Log evaluation configuration
            send_telemetry(
                category="swebench_evaluation",
                action="configuration",
                label=run_id,
                context={
                    "instances": len(eval_instances),
                    "max_workers": max_workers,
                    "timeout": timeout,
                    "namespace": namespace
                }
            )
            
            # Start monitoring thread
            stop_event = threading.Event()
            monitor_thread = threading.Thread(
                target=monitor_logs_with_telemetry,
                args=(run_id, len(eval_instances), stop_event)
            )
            monitor_thread.start()
            
            # Start evaluation
            send_message("status", {"message": f"Starting evaluation of {len(eval_instances)} instances"})
            
            # Build environment images if needed
            if namespace is None or namespace == "none":
                send_message("status", {"message": "Building environment images..."})
                send_telemetry(
                    category="swebench_evaluation",
                    action="docker_build_start",
                    label=run_id,
                    context={"instances": len(eval_instances)}
                )
                
                try:
                    # Get unique repos/versions from dataset
                    instances_to_build = [item for item in dataset if item["instance_id"] in eval_instances]
                    build_env_images(instances_to_build, max_workers=max_workers)
                    
                    send_telemetry(
                        category="swebench_evaluation",
                        action="docker_build_complete",
                        label=run_id
                    )
                except Exception as e:
                    send_telemetry(
                        category="swebench_evaluation",
                        action="docker_build_error",
                        label=run_id,
                        context={"error": str(e)},
                        level="error"
                    )
                    raise
            
            # Run the evaluation
            result = run_instances(
                predictions_file=predictions_file,
                instances=eval_instances,
                max_workers=max_workers,
                timeout=timeout,
                force_rebuild=False,
                cache_level="instance",
                clean=False,
                run_id=run_id,
                namespace=namespace
            )
            
            # Stop monitoring
            stop_event.set()
            monitor_thread.join(timeout=5)
            
            # Process results
            if result:
                # Count resolved instances
                resolved = sum(1 for r in result.values() if r.get("resolved", False))
                evaluated = len(result)
                success_rate = (resolved / evaluated * 100) if evaluated > 0 else 0
                percentage_complete = (resolved / len(eval_instances) * 100) if len(eval_instances) > 0 else 0
                
                summary = {
                    "total_instances": len(eval_instances),
                    "evaluated": evaluated,
                    "resolved": resolved,
                    "success_rate": success_rate,
                    "percentage_complete": percentage_complete
                }
                
                send_message("status", {"message": "Collecting evaluation results..."})
                send_telemetry(
                    category="swebench_evaluation",
                    action="evaluation_complete",
                    label=run_id,
                    context=summary
                )
                
                send_message("complete", {
                    "run_id": run_id,
                    "results": result,
                    "summary": summary
                })
            else:
                send_message("error", {"message": "Evaluation returned no results"})
                send_telemetry(
                    category="swebench_evaluation",
                    action="evaluation_error",
                    label=run_id,
                    context={"error": "No results returned"},
                    level="error"
                )
                
        except Exception as e:
            error_msg = f"Evaluation failed: {str(e)}\n{traceback.format_exc()}"
            send_message("error", {"message": error_msg})
            send_telemetry(
                category="swebench_evaluation",
                action="evaluation_error",
                label=options.get("run_id", "unknown"),
                context={"error": str(e), "traceback": traceback.format_exc()},
                level="error"
            )
        finally:
            # Cleanup
            if os.path.exists(predictions_file):
                os.remove(predictions_file)
    
    elif cmd_type == "ping":
        send_message("pong", {"message": "Python bridge is running"})
        send_telemetry(
            category="swebench_evaluation",
            action="ping",
            context={"status": "healthy"}
        )
    
    else:
        send_message("error", {"message": f"Unknown command: {cmd_type}"})

def main():
    """Main entry point - reads commands from stdin"""
    send_message("status", {"message": "SWE-bench Python bridge starting..."})
    send_telemetry(
        category="swebench_evaluation",
        action="bridge_start",
        context={"python_version": sys.version}
    )
    
    for line in sys.stdin:
        try:
            command = json.loads(line.strip())
            process_command(command)
        except json.JSONDecodeError as e:
            send_message("error", {"message": f"Invalid JSON: {str(e)}"})
            send_telemetry(
                category="swebench_evaluation",
                action="json_decode_error",
                context={"error": str(e)},
                level="error"
            )
        except Exception as e:
            send_message("error", {"message": f"Command processing error: {str(e)}"})
            send_telemetry(
                category="swebench_evaluation",
                action="command_error",
                context={"error": str(e), "traceback": traceback.format_exc()},
                level="error"
            )

if __name__ == "__main__":
    main()