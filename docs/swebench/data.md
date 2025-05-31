The SWE-bench data JSON files are **not stored directly in this GitHub repository**, except for small sample files used for testing (like `tests/test_data/pvlib.jsonl`).

The primary way the codebase loads the SWE-bench data is by **downloading it from the Hugging Face Hub** using the `datasets` library.

Here's a breakdown of how it works:

1.  **Hugging Face Hub as the Source:**
    The main SWE-bench datasets (e.g., `SWE-bench`, `SWE-bench_Lite`, `SWE-bench_Verified`) are hosted on the Hugging Face Hub. You can see this mentioned in the `README.md`:
    *   Lines 48-51:
        ```python
        from datasets import load_dataset
        swebench = load_dataset('princeton-nlp/SWE-bench', split='test')
        ```
    *   Lines 120-127 list various datasets with links to their Hugging Face pages (e.g., `https://huggingface.co/datasets/SWE-bench/SWE-bench`).
    *   The `docs/index.md` (lines 50-53, 80-86) and `docs/guides/datasets.md` also reiterate this.

2.  **`datasets` Library:**
    The `pyproject.toml` file lists `datasets` as a dependency (line 26). This library is a standard tool for accessing and working with datasets, especially those on the Hugging Face Hub.

3.  **Loading Mechanism in the Code:**
    *   The core evaluation script `swebench/harness/run_evaluation.py` uses a utility function `load_swebench_dataset` (defined in `swebench/harness/utils.py`) to load the data.
    *   The `load_swebench_dataset` function (in `swebench/harness/utils.py`, lines 124-169) primarily uses `datasets.load_dataset(name, split=split)`. It has logic to map user-friendly names like "swe-bench" to the full Hugging Face path like `SWE-bench/SWE-bench`.
    *   This function also supports loading from a local path if the `dataset_name_or_path` argument points to a local directory (created by `save_to_disk`) or a `.json`/`.jsonl` file. However, for standard benchmark usage, it pulls from the Hub.

4.  **Data Collection vs. Data Loading:**
    *   The `swebench/collect/` directory contains scripts like `get_tasks_pipeline.py` and `build_dataset.py`. These are for **creating new SWE-bench task instances** from GitHub repositories, not for loading the established benchmark datasets for evaluation.
    *   Similarly, `swebench/inference/make_datasets/` contains tools to **transform or prepare datasets** for specific model training or inference setups (e.g., for RAG). These tools might load an existing SWE-bench dataset (from Hugging Face or locally) as their input.

5.  **`.gitignore`:**
    The `.gitignore` file includes `*.jsonl` and `*.jsonl.*` (lines 166-167). This indicates that large dataset files are intentionally excluded from being committed to the Git repository. The file `tests/test_data/pvlib.jsonl` is a small, specific exception for testing the collection/parsing logic.

**In summary:**

When you run evaluations using this codebase, for instance with `python -m swebench.harness.run_evaluation --dataset_name princeton-nlp/SWE-bench_Lite ...`, the `swebench` library fetches the `princeton-nlp/SWE-bench_Lite` dataset from the Hugging Face Hub. The JSON files themselves are not part of the `SWE-bench` GitHub repository.
