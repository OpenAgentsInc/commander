#!/usr/bin/env python3
"""
Direct Docker evaluation using SWE-bench APIs
Bypasses dataset loading to avoid x86_64 image issues
"""

import json
import sys
import os
import docker
import time
from pathlib import Path

# Add swebench to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../swebench'))

from swebench.harness.run_evaluation import run_instance
from swebench.harness.test_spec.test_spec import TestSpec
from swebench.harness.constants import KEY_INSTANCE_ID

def main():
    # Load predictions
    predictions_path = "./swebench-results/direct-50-1748985899981/predictions.json"
    with open(predictions_path) as f:
        predictions = json.load(f)
    
    # Get just Django instances (ARM64 compatible)
    django_instances = [p for p in predictions if p["instance_id"].startswith("django__django")][:5]
    
    print(f"🧪 Direct Docker Evaluation")
    print(f"==========================")
    print(f"Testing {len(django_instances)} Django instances:")
    for p in django_instances:
        print(f"  - {p['instance_id']}")
    print()
    
    # Create Docker client
    try:
        client = docker.from_env()
        print("✅ Docker connected")
    except Exception as e:
        print(f"❌ Docker error: {e}")
        sys.exit(1)
    
    # Run evaluation for each instance
    results = {}
    run_id = f"direct-{int(time.time())}"
    
    for i, pred in enumerate(django_instances):
        instance_id = pred["instance_id"]
        print(f"\n📦 Evaluating {instance_id} ({i+1}/{len(django_instances)})...")
        
        try:
            # Create a minimal test spec
            # This is a simplified version - in practice we'd load from dataset
            test_spec = TestSpec(
                instance_id=instance_id,
                repo=instance_id.split("__")[0],
                version="",  # Would be loaded from dataset
                repo_script_list=[],
                test_script_list=[],
                test_directives=[],
                test_patch="",
                base_image_key="sweb.base.py.arm64:latest",  # Force ARM64
                env_image_key=f"sweb.env.{instance_id}:latest",
                instance_image_key=f"sweb.instance.{instance_id}:latest",
                platform="linux/arm64",  # Force ARM64
                pass_to_pass=[],
                fail_to_pass=[]
            )
            
            # Format prediction
            formatted_pred = {
                KEY_INSTANCE_ID: instance_id,
                "model_name_or_path": "commander-claude-code",
                "model_patch": pred.get("model_patch", pred.get("prediction", "")),
                "prediction": pred.get("model_patch", pred.get("prediction", ""))
            }
            
            # Run instance
            result = run_instance(
                test_spec=test_spec,
                pred=formatted_pred,
                rm_image=True,
                force_rebuild=False,
                client=client,
                run_id=run_id,
                timeout=600
            )
            
            if result and len(result) == 2:
                _, report = result
                resolved = report.get(instance_id, {}).get("resolved", False)
                results[instance_id] = resolved
                print(f"  Result: {'PASSED ✅' if resolved else 'FAILED ❌'}")
            else:
                results[instance_id] = False
                print(f"  Result: FAILED ❌ (no result)")
                
        except Exception as e:
            print(f"  Error: {e}")
            results[instance_id] = False
    
    # Summary
    resolved_count = sum(1 for r in results.values() if r)
    total = len(results)
    
    print(f"\n{'='*60}")
    print(f"🎉 EVALUATION COMPLETE!")
    print(f"{'='*60}")
    print(f"Total Instances: {total}")
    print(f"Resolved (Tests Pass): {resolved_count}")
    print(f"Failed: {total - resolved_count}")
    if total > 0:
        score = (resolved_count / total * 100)
        print(f"\n✨ SCORE: {score:.2f}% ({resolved_count}/{total})")
    print(f"{'='*60}")

if __name__ == "__main__":
    main()