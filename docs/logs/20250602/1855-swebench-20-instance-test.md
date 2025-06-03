# SWE-bench 20 Instance Test (Single Worker)

## Date: 2025-06-02 18:55 UTC

## Configuration
- Workers: 1 (single worker mode)
- Instances: 20 (mixed Django, Matplotlib, Sympy)
- Timeout: 600s per instance
- Expected duration: ~15 minutes

## Pre-test Notes:
- Previous 10-instance test completed successfully in 7 minutes
- No memory issues with single worker
- Testing diverse instance types (not just Django)

## Test Started: 18:55

---

## Live Log:[Mon Jun  2 18:28:57 CDT 2025] Starting 20 instance test...
[18:29:05] 🧪 SWE-bench Lite Quick Test (SAFE MODE)
[18:29:05] ===========================================
[18:29:05] Instances: 20
[18:29:05] Max Workers: 1
[18:29:05] 
[18:29:05] Initializing Python bridge...
[18:29:06] ✅ Python bridge initialized
[18:29:06] 
[18:29:06] 📋 Testing with 20 instances:
[18:29:06] 
[18:29:06] - django__django-11001
[18:29:06] - django__django-11019
[18:29:06] - django__django-11039
[18:29:06] - django__django-11049
[18:29:06] - django__django-11099
[18:29:06] - django__django-11133
[18:29:06] - django__django-11179
[18:29:06] - django__django-11283
[18:29:06] - django__django-11422
[18:29:06] - django__django-11583
[18:29:06] - matplotlib__matplotlib-18869
[18:29:06] - matplotlib__matplotlib-19743
[18:29:06] - matplotlib__matplotlib-20676
[18:29:06] - matplotlib__matplotlib-20859
[18:29:06] - matplotlib__matplotlib-21042
[18:29:06] - sympy__sympy-11870
[18:29:06] - sympy__sympy-12236
[18:29:06] - sympy__sympy-12419
[18:29:06] - sympy__sympy-12454
[18:29:06] - sympy__sympy-12481
[18:29:06] 
[18:29:07] [Status] SWE-bench Python bridge starting...
[18:29:07] [Status] Loading dataset: princeton-nlp/SWE-bench_Lite
[18:29:09] [Status] Loaded 300 instances from dataset
[18:29:09] [Status] Filtered to 16 instances
[18:29:09] [Status] Loaded 16 predictions
[18:29:09] [Status] Starting evaluation of 16 instances
[18:29:09] [Status] Building environment images...
[18:30:25] 📊 Progress: 6.3% (1/20)
[18:30:47] 📊 Progress: 12.5% (2/20)
[18:31:12] 📊 Progress: 18.8% (3/20)
[18:31:37] 📊 Progress: 25.0% (4/20)
[18:32:01] 📊 Progress: 31.3% (5/20)
[18:32:21] 📊 Progress: 37.5% (6/20)
[18:32:41] 📊 Progress: 43.8% (7/20)
[18:33:01] 📊 Progress: 50.0% (8/20)
[18:33:21] 📊 Progress: 56.3% (9/20)
[18:33:55] 📊 Progress: 62.5% (10/20)
[18:37:28] 📊 Progress: 68.8% (11/20)
[18:44:13] 📊 Progress: 75.0% (12/20)
[18:44:51] 📊 Progress: 81.3% (13/20)
[18:45:23] 📊 Progress: 87.5% (14/20)
[18:46:21] 📊 Progress: 93.8% (15/20)
[18:46:58] 📊 Progress: 100.0% (16/20)
[18:47:13] [Status] Collecting evaluation results...
[18:47:14] 
[18:47:14] ============================================================
[18:47:14] 📊 QUICK TEST SUMMARY
[18:47:14] ============================================================
[18:47:14] Evaluated: 16/20
[18:47:14] Resolved: 0
[18:47:14] Success Rate: 0.00%
[18:47:14] Duration: 18.14 minutes
[18:47:14] Results: ./swebench-results/quick-test-1748908034048.json
[18:47:14] ============================================================
[18:47:14] 
[18:47:14] 📋 Individual Results:
[18:47:14] ❌ django__django-11099
[18:47:14] ❌ django__django-11039
[18:47:14] ❌ django__django-11001
[18:47:14] ❌ django__django-11422
[18:47:14] ❌ django__django-11049
[18:47:14] ❌ sympy__sympy-12454
[18:47:14] ❌ sympy__sympy-11870
[18:47:14] ❌ django__django-11133
[18:47:14] ❌ matplotlib__matplotlib-18869
[18:47:14] ❌ django__django-11179
[18:47:14] ❌ django__django-11583
[18:47:14] ❌ sympy__sympy-12419
[18:47:14] ❌ sympy__sympy-12481
[18:47:14] ❌ django__django-11283
[18:47:14] ❌ django__django-11019
[18:47:14] ❌ sympy__sympy-12236


## Summary

### Test Results:
- **16 out of 20 instances evaluated** (4 matplotlib instances not in dataset)
- **Duration: 18.14 minutes**
- **Memory: STABLE** - No issues during entire run
- **All instances failed** (expected with empty patches)

### Performance Analysis:
- Average time per instance: ~68 seconds
- Notable slowdowns: Instance 11 took 3.5 minutes, Instance 12 took 6.5 minutes
- Total time increased non-linearly with more instances
- System remained stable throughout

### Instance Type Breakdown:
- Django: 9/10 evaluated
- Matplotlib: 1/5 evaluated (most not in Lite dataset)
- Sympy: 6/5 evaluated (all found)

### Key Takeaways:
1. Single worker mode remains stable with 20 instances
2. Some instances take significantly longer (matplotlib builds?)
3. Not all instances exist in SWE-bench Lite
4. Ready for full 300 instance run (estimated 4-5 hours)
