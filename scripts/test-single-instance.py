#!/usr/bin/env python3
"""
Test a single instance to verify Docker setup
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
except ImportError as e:
    print(f"❌ Failed to import SWE-bench: {e}")
    sys.exit(1)

def main():
    # Test with just one instance
    predictions_file = Path("swebench-results/direct-50-1748985899981/predictions.json")
    
    with open(predictions_file) as f:
        all_predictions = json.load(f)
    
    # Take just the first prediction
    test_prediction = [all_predictions[0]]
    
    print(f"🧪 Testing single instance: {test_prediction[0]['instance_id']}")
    
    # Create temp predictions file
    import tempfile
    with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as f:
        json.dump(test_prediction, f)
        temp_file = f.name
    
    try:
        # Try to run just one instance
        results = run_instances(
            predictions_file=temp_file,
            instances=[test_prediction[0]['instance_id']],
            max_workers=1,
            timeout=600,
            force_rebuild=False,
            cache_level="instance",
            clean=False,
            run_id="single-test"
        )
        
        if results:
            resolved = results[test_prediction[0]['instance_id']].get('resolved', False)
            print(f"✅ Instance {'PASSED' if resolved else 'FAILED'}")
            return resolved
        else:
            print("❌ No results returned")
            return False
            
    except Exception as e:
        print(f"❌ Error: {e}")
        return False
    finally:
        os.unlink(temp_file)

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)