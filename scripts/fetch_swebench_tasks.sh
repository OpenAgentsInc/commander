#!/bin/bash
# Fetch official SWE-bench tasks from Hugging Face datasets API

DATASET="princeton-nlp/SWE-bench_Lite"
OUTPUT_DIR="assets/swe_bench_data"
MAX_TASKS=${1:-5}

echo "Fetching $MAX_TASKS tasks from $DATASET..."

# Create output directory
mkdir -p "$OUTPUT_DIR"

# Fetch data from HF datasets server
curl -s "https://datasets-server.huggingface.co/first-rows?dataset=${DATASET}&config=default&split=test" | \
  jq -r ".rows[0:${MAX_TASKS}] | .[] | .row" | \
  jq -c '.' | \
  while IFS= read -r task; do
    instance_id=$(echo "$task" | jq -r '.instance_id' | sed 's/[\/:]/__/g')
    echo "Saving $instance_id.json"
    # Parse FAIL_TO_PASS and PASS_TO_PASS from JSON strings to arrays
    echo "$task" | jq '
      .FAIL_TO_PASS = (.FAIL_TO_PASS | fromjson) |
      .PASS_TO_PASS = (.PASS_TO_PASS | fromjson)
    ' > "$OUTPUT_DIR/${instance_id}.json"
  done

echo "Downloaded $(ls -1 "$OUTPUT_DIR"/*.json 2>/dev/null | wc -l | tr -d ' ') tasks to $OUTPUT_DIR"