#!/usr/bin/env python3
"""
Download SWE-Bench tasks from Hugging Face datasets.

This script downloads official SWE-Bench task data from the Hugging Face datasets hub
and saves each task as a JSON file matching the SWEBenchTask schema.
"""

import argparse
import json
import os
from datasets import load_dataset


def sanitize_filename(instance_id):
    """Sanitize instance_id to be a valid filename."""
    # Replace forward slashes and colons with double underscores
    return instance_id.replace("/", "__").replace(":", "__")


def main():
    parser = argparse.ArgumentParser(
        description="Download SWE-Bench tasks from Hugging Face."
    )
    parser.add_argument(
        "--dataset_name",
        type=str,
        default="princeton-nlp/SWE-bench_Lite",
        help="Name of the dataset on Hugging Face.",
    )
    parser.add_argument(
        "--split",
        type=str,
        default="test",
        help="Dataset split to download (e.g., 'test', 'dev', 'train').",
    )
    parser.add_argument(
        "--output_dir",
        type=str,
        default="assets/swe_bench_data",
        help="Directory to save task JSON files.",
    )
    parser.add_argument(
        "--max_tasks",
        type=int,
        default=None,
        help="Maximum number of tasks to download.",
    )

    args = parser.parse_args()

    print(f"Loading dataset {args.dataset_name}, split {args.split}...")
    try:
        dataset = load_dataset(args.dataset_name, split=args.split)
    except Exception as e:
        print(f"Error loading dataset: {e}")
        print(
            "Please ensure you have the 'datasets' library installed ('pip install datasets') "
            "and are authenticated with Hugging Face if necessary ('huggingface-cli login')."
        )
        return

    if not os.path.exists(args.output_dir):
        os.makedirs(args.output_dir)
        print(f"Created output directory: {args.output_dir}")

    count = 0
    skipped = 0
    
    for i, task in enumerate(dataset):
        if args.max_tasks is not None and count >= args.max_tasks:
            print(f"Reached max_tasks limit of {args.max_tasks}.")
            break

        instance_id = task.get("instance_id")
        if not instance_id:
            print(f"Skipping task at index {i} due to missing instance_id.")
            skipped += 1
            continue

        # Extract all fields from the task, ensuring they match SWEBenchTask schema
        task_data = {
            "instance_id": instance_id,
            "repo": task.get("repo"),
            "base_commit": task.get("base_commit"),
            "problem_statement": task.get("problem_statement"),
            "hints_text": task.get("hints_text") if task.get("hints_text") else None,
            "test_patch": task.get("test_patch"),
            "version": task.get("version"),
            "FAIL_TO_PASS": task.get("FAIL_TO_PASS") if task.get("FAIL_TO_PASS") is not None else [],
            "PASS_TO_PASS": task.get("PASS_TO_PASS") if task.get("PASS_TO_PASS") is not None else [],
            "patch": task.get("patch") if task.get("patch") else None,
        }

        # Filter out None values for optional fields to keep JSON clean
        task_data_cleaned = {k: v for k, v in task_data.items() if v is not None}

        # Ensure arrays are actually arrays
        if "FAIL_TO_PASS" not in task_data_cleaned:
            task_data_cleaned["FAIL_TO_PASS"] = []
        if "PASS_TO_PASS" not in task_data_cleaned:
            task_data_cleaned["PASS_TO_PASS"] = []

        # Use sanitized filename
        safe_filename = sanitize_filename(instance_id)
        file_path = os.path.join(args.output_dir, f"{safe_filename}.json")
        
        try:
            with open(file_path, "w") as f:
                json.dump(task_data_cleaned, f, indent=2)
            count += 1
            if count % 10 == 0:
                print(f"Saved {count} tasks...")
        except IOError as e:
            print(f"Error writing file {file_path}: {e}")
            skipped += 1

    print(f"\nDownload complete!")
    print(f"Successfully saved: {count} tasks")
    print(f"Skipped: {skipped} tasks")
    print(f"Output directory: {args.output_dir}")


if __name__ == "__main__":
    main()