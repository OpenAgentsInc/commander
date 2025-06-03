# SWE-bench Single Worker Test Log

## Date: 2025-06-02 18:45 UTC

## Configuration
- Workers: 1 (single worker to avoid memory issues)
- Instances: 2 (django__django-11099, django__django-11049)
- Timeout: 600s per instance
- Docker Scout: DISABLED

## Test Started: 18:45

### Pre-flight checks:
- Memory before start: Checking...
- Docker Scout disabled: YES
- Python environment: .venv/bin/python

---

## Live Log:

### Memory Analysis:
- Test completed successfully without memory explosion ✅
- Duration: 1 minute (much faster than before)
- Both instances evaluated properly
- No Docker Scout issues observed

### Key Differences from Failed Run:
1. **Single worker** instead of 2 parallel workers
2. **Only 2 instances** instead of 10
3. **No memory spike** - system remained responsive
4. **Clean completion** - no hanging processes

### Results:
- Both instances evaluated but not resolved (expected with empty patches)
- System stable throughout execution
- Ready for gradual scaling

## Conclusion:
Single worker mode successfully prevents memory issues. The system can now be gradually scaled up.
[Mon Jun  2 18:14:38 CDT 2025] Starting single worker test...
[18:14:48] 🧪 SWE-bench Lite Quick Test (SAFE MODE)
[18:14:48] ===========================================
[18:14:48] Instances: 2
[18:14:48] Max Workers: 1
[18:14:48] 
[18:14:48] Initializing Python bridge...
[18:14:50] ✅ Python bridge initialized
[18:14:50] 
[18:14:50] 📋 Testing with 2 instances:
[18:14:50] 
[18:14:50] - django__django-11099
[18:14:50] - django__django-11049
[18:14:50] 
[18:14:51] [Status] SWE-bench Python bridge starting...
[18:14:51] [Status] Loading dataset: princeton-nlp/SWE-bench_Lite
[18:14:53] [Status] Loaded 300 instances from dataset
[18:14:53] [Status] Filtered to 2 instances
[18:14:53] [Status] Loaded 2 predictions
[18:14:53] [Status] Starting evaluation of 2 instances
[18:14:53] [Status] Building environment images...
[18:15:13] 📊 Progress: 50.0% (1/2)
[18:15:33] 📊 Progress: 100.0% (2/2)
[18:15:48] [Status] Collecting evaluation results...
[18:15:48] 
[18:15:48] ============================================================
[18:15:48] 📊 QUICK TEST SUMMARY
[18:15:48] ============================================================
[18:15:48] Evaluated: 2/2
[18:15:48] Resolved: 0
[18:15:48] Success Rate: 0.00%
[18:15:48] Duration: 1.00 minutes
[18:15:48] Results: ./swebench-results/quick-test-1748906148649.json
[18:15:48] ============================================================
[18:15:48] 
[18:15:48] 📋 Individual Results:
[18:15:48] ❌ django__django-11099
[18:15:48] ❌ django__django-11049
