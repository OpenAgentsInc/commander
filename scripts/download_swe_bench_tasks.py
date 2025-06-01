#!/usr/bin/env python3
"""
Download SWE-Bench tasks from Hugging Face datasets.

This script downloads official SWE-Bench task data from the Hugging Face datasets hub
and saves each task as a JSON file matching the SWEBenchTask schema.
"""

import argparse
import json
import os
import sys
from typing import Optional


def sanitize_filename(instance_id):
    """Sanitize instance_id to be a valid filename."""
    # Replace forward slashes and colons with double underscores
    return instance_id.replace("/", "__").replace(":", "__")


def download_tasks(
    dataset_name: str = "princeton-nlp/SWE-bench",
    split: str = "test",
    output_dir: str = "./assets/swe_bench_data",
    max_tasks: Optional[int] = None
):
    """Download SWE-Bench tasks from Hugging Face."""
    
    try:
        # Import datasets library (will fail if not installed)
        from datasets import load_dataset
    except ImportError:
        print(json.dumps({
            "type": "error",
            "message": "Please install datasets library: pip install datasets"
        }))
        sys.exit(1)
    
    # Create output directory if it doesn't exist
    os.makedirs(output_dir, exist_ok=True)
    
    print(json.dumps({
        "type": "progress",
        "message": f"Loading dataset {dataset_name} (split: {split})...",
        "progress": 0
    }))
    
    try:
        # Load the dataset
        dataset = load_dataset(dataset_name, split=split, trust_remote_code=True)
    except Exception as e:
        print(json.dumps({
            "type": "error",
            "message": f"Failed to load dataset: {str(e)}"
        }))
        sys.exit(1)
    
    # Determine how many tasks to download
    total_tasks = len(dataset)
    tasks_to_download = min(max_tasks, total_tasks) if max_tasks else total_tasks
    
    print(json.dumps({
        "type": "progress",
        "message": f"Found {total_tasks} tasks. Downloading {tasks_to_download}...",
        "progress": 5
    }))
    
    count = 0
    skipped = 0
    
    # Download and save each task
    for i, task in enumerate(dataset):
        if max_tasks and count >= max_tasks:
            break
            
        instance_id = task.get("instance_id")
        if not instance_id:
            print(json.dumps({
                "type": "error",
                "message": f"Skipping task at index {i} due to missing instance_id"
            }))
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
        file_path = os.path.join(output_dir, f"{safe_filename}.json")
        
        try:
            with open(file_path, "w") as f:
                json.dump(task_data_cleaned, f, indent=2)
            count += 1
        except IOError as e:
            print(json.dumps({
                "type": "error",
                "message": f"Error writing file {file_path}: {e}"
            }))
            skipped += 1
            continue
        
        # Report progress
        progress = int(5 + (count) / tasks_to_download * 90)
        if count % 10 == 0 or count == tasks_to_download:
            print(json.dumps({
                "type": "progress",
                "message": f"Downloaded {count}/{tasks_to_download} tasks",
                "progress": progress
            }))
    
    # Complete
    print(json.dumps({
        "type": "complete",
        "message": f"Successfully downloaded {count} tasks to {output_dir}",
        "taskCount": count
    }))


def main():
    parser = argparse.ArgumentParser(
        description="Download SWE-Bench tasks from Hugging Face."
    )
    parser.add_argument(
        "--dataset_name",
        type=str,
        default="princeton-nlp/SWE-bench",
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
    
    download_tasks(
        dataset_name=args.dataset_name,
        split=args.split,
        output_dir=args.output_dir,
        max_tasks=args.max_tasks
    )


if __name__ == "__main__":
    main()