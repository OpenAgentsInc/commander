#!/bin/bash
# Script to analyze SWE-bench results

if [ -z "$1" ]; then
    echo "Usage: $0 <results-directory>"
    echo "Example: $0 ./swebench-results/claude-code-test-20240531-1500"
    exit 1
fi

RESULTS_DIR="$1"

if [ ! -d "$RESULTS_DIR" ]; then
    echo "Error: Directory $RESULTS_DIR does not exist"
    exit 1
fi

echo "=== SWE-bench Results Analysis ==="
echo "Results Directory: $RESULTS_DIR"
echo ""

# Check if summary.json exists
if [ -f "$RESULTS_DIR/summary.json" ]; then
    echo "## Summary:"
    cat "$RESULTS_DIR/summary.json" | jq '.'
    echo ""
fi

# Count result files
TOTAL_FILES=$(ls -1 "$RESULTS_DIR"/*_eval_result.json 2>/dev/null | wc -l)
echo "## Total evaluation files: $TOTAL_FILES"
echo ""

# Analyze each result
echo "## Individual Task Results:"
for result_file in "$RESULTS_DIR"/*_eval_result.json; do
    if [ -f "$result_file" ]; then
        echo ""
        echo "### $(basename "$result_file" _eval_result.json)"
        
        # Extract key information
        instance_id=$(jq -r '.instance_id // "N/A"' "$result_file")
        resolved=$(jq -r '.report.resolved // false' "$result_file")
        patch_applied=$(jq -r '.report.patch_applied_successfully // false' "$result_file")
        tests_passed=$(jq -r '.report.tests_passed // []' "$result_file")
        tests_failed=$(jq -r '.report.tests_failed // []' "$result_file")
        patch_source=$(jq -r '.patch_source_type // "unknown"' "$result_file")
        error=$(jq -r '.error_message // "none"' "$result_file")
        duration=$(jq -r '.duration_ms // 0' "$result_file")
        
        echo "- Instance ID: $instance_id"
        echo "- Patch Source: $patch_source"
        echo "- Resolved: $resolved"
        echo "- Patch Applied: $patch_applied"
        echo "- Duration: $((duration / 1000))s"
        
        if [ "$error" != "none" ] && [ "$error" != "null" ]; then
            echo "- ERROR: $error"
        fi
        
        # Count tests
        n_passed=$(echo "$tests_passed" | jq 'length // 0')
        n_failed=$(echo "$tests_failed" | jq 'length // 0')
        echo "- Tests: $n_passed passed, $n_failed failed"
        
        # Show generated patch preview if agent-generated
        if [ "$patch_source" == "agent_generated" ]; then
            patch_preview=$(jq -r '.generated_patch_content // ""' "$result_file" | head -n 10)
            if [ -n "$patch_preview" ]; then
                echo "- Patch Preview (first 10 lines):"
                echo "$patch_preview" | sed 's/^/    /'
            fi
        fi
    fi
done

echo ""
echo "=== Analysis Complete ==="