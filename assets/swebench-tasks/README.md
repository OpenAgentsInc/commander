# SWE-Bench Example Tasks

This directory contains example SWE-bench tasks for testing the evaluation harness.

## Task Files

1. **simple-python-fix.json** - A basic SymPy bug fix task
   - Issue: `Sum(1, (n, a, b))` should return `b - a + 1`
   - Repository: sympy/sympy
   - Difficulty: Easy

2. **django-framework.json** - A Django security fix
   - Issue: UsernameValidator allows trailing newlines
   - Repository: django/django
   - Difficulty: Medium

3. **numpy-computation.json** - A NumPy array dimension bug
   - Issue: AxisError when reducing 0-dimensional arrays
   - Repository: numpy/numpy
   - Difficulty: Medium

## Patches Directory

The `patches/` subdirectory contains example solutions for each task:
- `simple-python-fix.patch`
- `django-framework.patch`

## Usage

Run a task with its corresponding patch:
```bash
pnpm tsx scripts/run-swebench-task.ts --task assets/swebench-tasks/simple-python-fix.json --patch assets/swebench-tasks/patches/simple-python-fix.patch
```

Run without a patch to see baseline failures:
```bash
pnpm tsx scripts/run-swebench-task.ts --task assets/swebench-tasks/django-framework.json --no-patch
```

## Creating Your Own Tasks

To create custom tasks, follow the schema in `src/services/swe_bench_harness/types.ts`. Essential fields:
- `instance_id`: Unique identifier
- `repo`: GitHub repository (owner/name)
- `base_commit`: Git commit SHA to base the task on
- `problem_statement`: Description of the issue
- `test_patch`: Patch containing test cases
- `FAIL_TO_PASS`: Tests that should fail before fix and pass after
- `PASS_TO_PASS`: Tests that should always pass