# SWE-Bench Fixes Summary - June 1, 2025

## Fixes Applied

### 1. Fixed errors in fuck3 folder (astropy, pydata/xarray, scikit-learn tasks)

Updated `scripts/run_swe_bench_docker.ts` to handle these issues:

#### Docker Build Fixes:
- Pre-install numpy in Docker images (fixes scikit-learn setup errors)
- Update pip, setuptools, and wheel to latest versions to avoid compatibility issues

#### Repository-Specific Dependency Fixes:
- **astropy**: Pin setuptools to version <60 to fix `ModuleNotFoundError: No module named 'setuptools.dep_util'`
- **pydata/xarray**: Pin numpy to version <2.0 to fix `AttributeError: np.unicode_ was removed in NumPy 2.0`

#### Test Format Handling:
- Added special handling for pydata/xarray and astropy repositories that use pytest with `module::test` format
- Convert `::` to `/` for proper test path resolution
- Fallback to `-k` flag if path-based execution fails

### 2. Fixed ENOENT errors for missing summary.json

Updated `src/main.ts` handler for `SWE_BENCH_GET_RESULT_SUMMARY_CHANNEL`:
- Check if summary.json file exists before trying to read it
- Return null gracefully instead of throwing ENOENT error
- Prevents UI crashes when trying to view results from incomplete or non-existent runs

## Test Command

To test the fixes on the problematic tasks:

```bash
tsx scripts/run_swe_bench_docker.ts --instance_ids "astropy__astropy-13734,scikit-learn__scikit-learn-13472,pydata__xarray-6971" --output_dir fuck3-fixed
```

## Summary

These fixes address:
1. Python package compatibility issues during Docker builds
2. Test discovery and execution format differences across repositories  
3. UI stability when viewing evaluation results

The Docker script now handles repository-specific quirks more robustly, and the UI won't crash when trying to view incomplete evaluation runs.