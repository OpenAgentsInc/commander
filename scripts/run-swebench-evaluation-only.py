#!/usr/bin/env python3
"""
Run SWE-bench evaluation using existing predictions
"""

import json
import sys
import os
from pathlib import Path

# Add swebench to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'swebench'))

try:
    from swebench.harness.run_evaluation import run_instances
    from swebench.harness.utils import load_swebench_dataset
    print("✅ SWE-bench modules loaded successfully")
except ImportError as e:
    print(f"❌ Failed to import SWE-bench: {e}")
    print("Make sure you're in the virtual environment: source .venv/bin/activate")
    sys.exit(1)

def main():
    # Configuration
    predictions_file = Path("swebench-results/direct-50-1748985899981/predictions.json")
    dataset_name = "princeton-nlp/SWE-bench_Lite"
    run_id = "evaluation-only-1748989200"
    
    print("🚀 SWE-bench Evaluation (Using Existing Patches)")
    print("=" * 50)
    
    # Load predictions
    if not predictions_file.exists():
        print(f"❌ Predictions file not found: {predictions_file}")
        sys.exit(1)
    
    with open(predictions_file) as f:
        predictions = json.load(f)
    print(f"📋 Loaded {len(predictions)} predictions")
    
    # Load dataset
    print(f"📚 Loading dataset: {dataset_name}")
    dataset = load_swebench_dataset(dataset_name)
    all_instances = [item["instance_id"] for item in dataset]
    
    # Get instances to evaluate
    instance_ids = [p["instance_id"] for p in predictions]
    eval_instances = [i for i in instance_ids if i in all_instances]
    print(f"🎯 Will evaluate {len(eval_instances)} instances")
    
    # Save predictions to temp file for harness
    import tempfile
    with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as f:
        json.dump(predictions, f)
        temp_predictions = f.name
    
    try:
        print("\n🐳 Starting Docker-based evaluation...")
        print("This may take a while. Check logs/ directory for progress.\n")
        
        # Run evaluation
        results = run_instances(
            predictions_file=temp_predictions,
            instances=eval_instances,
            max_workers=4,
            timeout=1800,
            force_rebuild=False,
            cache_level="instance",
            clean=False,
            run_id=run_id
        )
        
        if results:
            # Calculate score
            resolved = sum(1 for r in results.values() if r.get("resolved", False))
            total = len(results)
            score = (resolved / total * 100) if total > 0 else 0
            
            print("\n" + "=" * 60)
            print("🎉 EVALUATION COMPLETE!")
            print("=" * 60)
            print(f"Total Evaluated: {total}")
            print(f"Resolved (Tests Pass): {resolved}")
            print(f"Failed: {total - resolved}")
            print("=" * 60)
            print(f"\n✨ SWE-BENCH SCORE: {score:.2f}%")
            print("=" * 60)
            
            # Save results
            output_dir = Path("swebench-results/direct-50-1748985899981")
            with open(output_dir / "evaluation-results.json", "w") as f:
                json.dump(results, f, indent=2)
            
            with open(output_dir / "final-score.json", "w") as f:
                json.dump({
                    "run_id": run_id,
                    "total_instances": len(predictions),
                    "evaluated": total,
                    "resolved": resolved,
                    "failed": total - resolved,
                    "swe_bench_score": f"{score:.2f}%",
                    "individual_results": results
                }, f, indent=2)
            
            print(f"\n📁 Results saved to: {output_dir}")
            
        else:
            print("❌ Evaluation returned no results")
            
    finally:
        # Cleanup
        if os.path.exists(temp_predictions):
            os.remove(temp_predictions)

if __name__ == "__main__":
    main()