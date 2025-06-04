#!/usr/bin/env python3
"""
Manual evaluation that loads test specs from SWE-bench data files
"""

import json
import sys
import os
import docker
import time
import requests
from pathlib import Path

# Add swebench to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../swebench'))

from swebench.harness.run_evaluation import run_instance
from swebench.harness.test_spec.test_spec import make_test_spec
from swebench.harness.constants import KEY_INSTANCE_ID

def download_swebench_lite_data():
    """Download SWE-bench Lite dataset if not present"""
    data_path = Path("swebench_lite_data.json")
    if not data_path.exists():
        print("📥 Downloading SWE-bench Lite dataset...")
        url = "https://raw.githubusercontent.com/princeton-nlp/SWE-bench/main/swebench_lite.json"
        response = requests.get(url)
        response.raise_for_status()
        with open(data_path, 'w') as f:
            json.dump(response.json(), f)
        print("✅ Dataset downloaded")
    return data_path

def main():
    # Load predictions
    predictions_path = "./swebench-results/direct-50-1748985899981/predictions.json"
    with open(predictions_path) as f:
        all_predictions = json.load(f)
    
    # Download dataset
    data_path = download_swebench_lite_data()
    with open(data_path) as f:
        dataset = json.load(f)
    
    # Create instance map
    instance_map = {item["instance_id"]: item for item in dataset}
    
    # Get Django instances that exist in both predictions and dataset
    django_predictions = []
    for pred in all_predictions:
        if pred["instance_id"].startswith("django__django") and pred["instance_id"] in instance_map:
            django_predictions.append(pred)
            if len(django_predictions) >= 5:
                break
    
    print(f"🧪 Manual SWE-bench Evaluation")
    print(f"==============================")
    print(f"Testing {len(django_predictions)} Django instances:")
    for p in django_predictions:
        print(f"  - {p['instance_id']}")
    print()
    
    # Create Docker client
    try:
        client = docker.from_env()
        print("✅ Docker connected")
    except Exception as e:
        print(f"❌ Docker error: {e}")
        sys.exit(1)
    
    # Run evaluation
    results = {}
    run_id = f"manual-{int(time.time())}"
    
    for i, pred in enumerate(django_predictions):
        instance_id = pred["instance_id"]
        print(f"\n📦 Evaluating {instance_id} ({i+1}/{len(django_predictions)})...")
        
        try:
            # Get instance data
            instance_data = instance_map[instance_id]
            
            # Create test spec with ARM64 platform override
            test_spec = make_test_spec(instance_data)
            # Force ARM64
            test_spec.platform = "linux/arm64"
            if "x86_64" in test_spec.base_image_key:
                test_spec.base_image_key = test_spec.base_image_key.replace("x86_64", "arm64")
            if "x86_64" in test_spec.env_image_key:
                test_spec.env_image_key = test_spec.env_image_key.replace("x86_64", "arm64")
            if "x86_64" in test_spec.instance_image_key:
                test_spec.instance_image_key = test_spec.instance_image_key.replace("x86_64", "arm64")
            
            print(f"  Base image: {test_spec.base_image_key}")
            print(f"  Platform: {test_spec.platform}")
            
            # Format prediction
            formatted_pred = {
                KEY_INSTANCE_ID: instance_id,
                "model_name_or_path": "commander-claude-code",
                "model_patch": pred.get("model_patch", pred.get("prediction", "")),
                "prediction": pred.get("model_patch", pred.get("prediction", ""))
            }
            
            # Check if we have the patch
            if not formatted_pred["model_patch"]:
                print(f"  ⚠️  No patch found, skipping")
                continue
            
            print(f"  Patch size: {len(formatted_pred['model_patch'])} chars")
            
            # Run instance evaluation
            start_time = time.time()
            result = run_instance(
                test_spec=test_spec,
                pred=formatted_pred,
                rm_image=True,
                force_rebuild=False,
                client=client,
                run_id=run_id,
                timeout=600,
                rewrite_reports=False
            )
            elapsed = time.time() - start_time
            
            if result and len(result) == 2:
                inst_id, report = result
                if inst_id and report and inst_id in report:
                    resolved = report[inst_id].get("resolved", False)
                    results[instance_id] = resolved
                    print(f"  Result: {'PASSED ✅' if resolved else 'FAILED ❌'} ({elapsed:.1f}s)")
                else:
                    results[instance_id] = False
                    print(f"  Result: FAILED ❌ (invalid report) ({elapsed:.1f}s)")
            else:
                results[instance_id] = False
                print(f"  Result: FAILED ❌ (no result) ({elapsed:.1f}s)")
                
        except Exception as e:
            print(f"  Error: {e}")
            import traceback
            traceback.print_exc()
            results[instance_id] = False
    
    # Summary
    if results:
        resolved_count = sum(1 for r in results.values() if r)
        total = len(results)
        
        print(f"\n{'='*60}")
        print(f"🎉 EVALUATION COMPLETE!")
        print(f"{'='*60}")
        print(f"Total Instances: {total}")
        print(f"Resolved (Tests Pass): {resolved_count}")
        print(f"Failed: {total - resolved_count}")
        score = (resolved_count / total * 100) if total > 0 else 0
        print(f"\n✨ SCORE: {score:.2f}% ({resolved_count}/{total})")
        
        # Extrapolate to 50 instances
        if total > 0:
            projected_50 = round((resolved_count / total) * 50)
            projected_score = (projected_50 / 50 * 100)
            print(f"\n📊 Projected for 50 instances: {projected_score:.2f}% ({projected_50}/50)")
            print(f"\n📈 Reference: Claude Code v4 models typically score 30-45% on SWE-bench")
        
        print(f"{'='*60}")
        
        # Save results
        results_file = f"manual-eval-results-{int(time.time())}.json"
        with open(results_file, 'w') as f:
            json.dump({
                "results": results,
                "summary": {
                    "total": total,
                    "resolved": resolved_count,
                    "score": score,
                    "instances": list(results.keys())
                }
            }, f, indent=2)
        print(f"\n💾 Results saved to {results_file}")
    else:
        print("\n❌ No results obtained")

if __name__ == "__main__":
    main()