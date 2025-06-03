# SWE-bench 10 Instance Test (Single Worker)

## Date: 2025-06-02 18:50 UTC

## Configuration
- Workers: 1 (single worker confirmed safe)
- Instances: 10 Django instances
- Timeout: 600s per instance
- Expected duration: ~10 minutes

## Test Started: 18:50

---

## Live Log:[18:16:44] 🧪 SWE-bench Lite Quick Test (SAFE MODE)
[18:16:44] ===========================================
[18:16:44] Instances: 10
[18:16:44] Max Workers: 1
[18:16:44] 
[18:16:44] Initializing Python bridge...
[18:16:45] ✅ Python bridge initialized
[18:16:45] 
[18:16:45] 📋 Testing with 10 instances:
[18:16:45] 
[18:16:45] - django__django-11099
[18:16:45] - django__django-11049
[18:16:45] - django__django-11019
[18:16:45] - django__django-11039
[18:16:45] - django__django-11001
[18:16:45] - django__django-11133
[18:16:45] - django__django-11179
[18:16:45] - django__django-11283
[18:16:45] - django__django-11422
[18:16:45] - django__django-11517
[18:16:45] 
[18:16:46] [Status] SWE-bench Python bridge starting...
[18:16:46] [Status] Loading dataset: princeton-nlp/SWE-bench_Lite
[18:16:47] [Status] Loaded 300 instances from dataset
[18:16:47] [Status] Filtered to 9 instances
[18:16:47] [Status] Loaded 9 predictions
[18:16:47] [Status] Starting evaluation of 9 instances
[18:16:47] [Status] Building environment images...
[18:16:56] 📊 Progress: 11.1% (1/10)
[18:17:18] 📊 Progress: 22.2% (2/10)
[18:17:39] 📊 Progress: 33.3% (3/10)
[18:17:59] 📊 Progress: 44.4% (4/10)
[18:18:19] 📊 Progress: 55.6% (5/10)
[18:19:00] 📊 Progress: 66.7% (6/10)
[18:19:59] 📊 Progress: 77.8% (7/10)
[18:22:07] 📊 Progress: 88.9% (8/10)
[18:23:23] 📊 Progress: 100.0% (9/10)
[18:23:38] [Status] Collecting evaluation results...
[18:23:39] 
[18:23:39] ============================================================
[18:23:39] 📊 QUICK TEST SUMMARY
[18:23:39] ============================================================
[18:23:39] Evaluated: 9/10
[18:23:39] Resolved: 0
[18:23:39] Success Rate: 0.00%
[18:23:39] Duration: 6.92 minutes
[18:23:39] Results: ./swebench-results/quick-test-1748906619796.json
[18:23:39] ============================================================
[18:23:39] 
[18:23:39] 📋 Individual Results:
[18:23:39] ❌ django__django-11099
[18:23:39] ❌ django__django-11039
[18:23:39] ❌ django__django-11001
[18:23:39] ❌ django__django-11422
[18:23:39] ❌ django__django-11049
[18:23:39] ❌ django__django-11133
[18:23:39] ❌ django__django-11179
[18:23:39] ❌ django__django-11283
[18:23:39] ❌ django__django-11019


## Summary

### Test Results:
- **9 out of 10 instances evaluated** (one instance not found in dataset)
- **Duration: 6.92 minutes** (reasonable for single worker)
- **Memory: STABLE** - No memory issues observed
- **All instances failed** (expected with empty patches)

### Performance Analysis:
- Average time per instance: ~46 seconds
- Some instances took longer (2+ minutes for instance 8)
- System remained responsive throughout
- No Docker Scout issues

### Key Observations:
1. Single worker mode is stable even with 10 instances
2. Processing time varies significantly between instances
3. One instance (django__django-11517) wasn't in the dataset
4. Ready to scale up to full evaluation
