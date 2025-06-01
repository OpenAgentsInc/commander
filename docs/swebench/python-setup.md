# SWE-Bench Python Setup

The SWE-Bench dataset downloader requires Python 3.7 or later and the `datasets` library from Hugging Face.

## Prerequisites

1. **Python 3.7+**: Make sure Python 3 is installed and available in your PATH
   ```bash
   python3 --version
   ```

2. **Install required dependencies**:
   ```bash
   pip install datasets
   ```

## Troubleshooting

### "Python 3 is not installed or not in PATH"
- Install Python from https://www.python.org/downloads/
- Make sure to add Python to your PATH during installation
- On macOS, you can also use Homebrew: `brew install python3`

### "Missing required Python packages: datasets"
- Run: `pip install datasets`
- If you have multiple Python versions, try: `python3 -m pip install datasets`

### "Failed to load dataset" errors
- This might be a network issue or require authentication
- Try running the download script manually to see detailed errors:
  ```bash
  python3 scripts/download_swe_bench_tasks.py
  ```

## Manual Dataset Download

If the automatic download isn't working, you can download tasks manually:

```bash
# From the commander directory
python3 scripts/download_swe_bench_tasks.py \
  --dataset_name princeton-nlp/SWE-bench \
  --split test \
  --output_dir ./assets/swe_bench_data \
  --max_tasks 10  # Optional: limit for testing
```