#!/usr/bin/env python3
"""
Run evaluation on a subset of instances using the official SWE-bench harness
"""

import json
import sys
import os
import subprocess
import time
from pathlib import Path

# Add swebench to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../swebench'))

def main():
    # Load our predictions
    predictions_path = "./swebench-results/direct-50-1748985899981/predictions.json"
    with open(predictions_path) as f:
        all_predictions = json.load(f)
    
    # Take first 5 instances for testing
    test_predictions = all_predictions[:5]
    instance_ids = [p["instance_id"] for p in test_predictions]
    
    print(f"🚀 Running SWE-bench Evaluation on Subset")
    print(f"========================================")
    print(f"Testing {len(test_predictions)} instances:")
    for inst_id in instance_ids:
        print(f"  - {inst_id}")
    print()
    
    # Create a temporary predictions file for just these instances
    temp_predictions_file = f"temp_predictions_{int(time.time())}.json"
    with open(temp_predictions_file, 'w') as f:
        json.dump(test_predictions, f, indent=2)
    
    # Prepare the command
    run_id = f"subset-eval-{int(time.time())}"
    cmd = [
        "python", "-m", "swebench.harness.run_evaluation",
        "--dataset_name", "princeton-nlp/SWE-bench_Lite",
        "--predictions_path", temp_predictions_file,
        "--instance_ids", *instance_ids,
        "--run_id", run_id,
        "--max_workers", "1",
        "--timeout", "600",
        "--cache_level", "instance"
    ]
    
    print(f"📋 Command: {' '.join(cmd)}")
    print(f"\n🏃 Starting evaluation (this may take a while)...\n")
    
    try:
        # Run the evaluation
        result = subprocess.run(cmd, capture_output=False, text=True)
        
        if result.returncode == 0:
            print(f"\n✅ Evaluation completed successfully!")
            print(f"📂 Results saved in: logs/run_evaluation/{run_id}/")
            
            # Try to parse results
            results_dir = Path(f"logs/run_evaluation/{run_id}")
            if results_dir.exists():
                resolved_count = 0
                total_count = 0
                
                for report_file in results_dir.rglob("report.json"):
                    with open(report_file) as f:
                        report = json.load(f)
                        for instance_id, data in report.items():
                            total_count += 1
                            if data.get("resolved", False):
                                resolved_count += 1
                                print(f"  ✅ {instance_id}: PASSED")
                            else:
                                print(f"  ❌ {instance_id}: FAILED")
                
                if total_count > 0:
                    score = (resolved_count / total_count) * 100
                    print(f"\n📊 Results for {total_count} instances:")
                    print(f"   Resolved: {resolved_count}")
                    print(f"   Failed: {total_count - resolved_count}")
                    print(f"   Score: {score:.1f}%")
                    
                    # Extrapolate to 50 instances
                    projected_50 = int((resolved_count / total_count) * 50)
                    projected_score = (projected_50 / 50) * 100
                    print(f"\n📈 Projected for all 50 instances:")
                    print(f"   Expected: {projected_50}/50 ({projected_score:.1f}%)")
        else:
            print(f"\n❌ Evaluation failed with return code: {result.returncode}")
            
    except Exception as e:
        print(f"\n❌ Error running evaluation: {e}")
        import traceback
        traceback.print_exc()
    finally:
        # Clean up temp file
        if os.path.exists(temp_predictions_file):
            os.remove(temp_predictions_file)
            print(f"\n🧹 Cleaned up temporary file: {temp_predictions_file}")

if __name__ == "__main__":
    main()