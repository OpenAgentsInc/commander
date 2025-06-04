#!/usr/bin/env python3
"""
Run evaluation using the full SWE-bench dataset
"""

import json
import sys
import os
import subprocess
import time
from pathlib import Path

def main():
    # Load our predictions
    predictions_path = "./swebench-results/direct-50-1748985899981/predictions.json"
    with open(predictions_path) as f:
        all_predictions = json.load(f)
    
    # Take first 3 instances for testing (fewer to avoid ARM64 issues)
    test_predictions = all_predictions[:3]
    instance_ids = [p["instance_id"] for p in test_predictions]
    
    print(f"🚀 Running SWE-bench Evaluation (Full Dataset)")
    print(f"============================================")
    print(f"Testing {len(test_predictions)} instances:")
    for inst_id in instance_ids:
        print(f"  - {inst_id}")
    print()
    
    # Create a temporary predictions file
    temp_predictions_file = f"temp_predictions_{int(time.time())}.json"
    with open(temp_predictions_file, 'w') as f:
        json.dump(test_predictions, f, indent=2)
    
    # Prepare the command - using full dataset
    run_id = f"full-eval-{int(time.time())}"
    cmd = [
        "python", "-m", "swebench.harness.run_evaluation",
        "--dataset_name", "princeton-nlp/SWE-bench",  # Full dataset
        "--predictions_path", temp_predictions_file,
        "--instance_ids", *instance_ids,
        "--run_id", run_id,
        "--max_workers", "1",
        "--timeout", "900",  # 15 minutes per instance
        "--cache_level", "instance"
    ]
    
    print(f"📋 Using full SWE-bench dataset")
    print(f"⏱️  Timeout: 15 minutes per instance")
    print(f"\n🏃 Starting evaluation...\n")
    
    try:
        # Run with live output
        result = subprocess.run(cmd, text=True)
        
        if result.returncode == 0:
            print(f"\n✅ Evaluation completed!")
            
            # Parse results
            results_dir = Path(f"logs/run_evaluation/{run_id}")
            if results_dir.exists():
                resolved_count = 0
                total_count = 0
                instance_results = {}
                
                for report_file in results_dir.rglob("report.json"):
                    with open(report_file) as f:
                        report = json.load(f)
                        for instance_id, data in report.items():
                            total_count += 1
                            resolved = data.get("resolved", False)
                            instance_results[instance_id] = resolved
                            if resolved:
                                resolved_count += 1
                
                print(f"\n📊 RESULTS:")
                print(f"{'='*50}")
                for inst_id, resolved in instance_results.items():
                    status = "✅ PASSED" if resolved else "❌ FAILED"
                    print(f"{inst_id}: {status}")
                
                if total_count > 0:
                    score = (resolved_count / total_count) * 100
                    print(f"\nSummary for {total_count} instances:")
                    print(f"  Passed: {resolved_count}")
                    print(f"  Failed: {total_count - resolved_count}")
                    print(f"  Score: {score:.1f}%")
                    
                    # Extrapolate to all 50
                    if total_count >= 3:  # Need at least 3 for reasonable estimate
                        projected_50 = round((resolved_count / total_count) * 50)
                        projected_score = (projected_50 / 50) * 100
                        print(f"\n🎯 PROJECTED SCORE FOR ALL 50 INSTANCES:")
                        print(f"{'='*50}")
                        print(f"Expected: {projected_50}/50 patches passing")
                        print(f"SCORE: {projected_score:.1f}%")
                        print(f"{'='*50}")
                        
                        print(f"\n📈 This is {'within' if 30 <= projected_score <= 45 else 'outside'} the typical")
                        print(f"   30-45% range for Claude Code v4 models")
        else:
            print(f"\n❌ Evaluation failed with return code: {result.returncode}")
            
    except KeyboardInterrupt:
        print("\n\n⚠️  Evaluation interrupted by user")
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        # Clean up
        if os.path.exists(temp_predictions_file):
            os.remove(temp_predictions_file)
            print(f"\n🧹 Cleaned up temporary file")

if __name__ == "__main__":
    main()