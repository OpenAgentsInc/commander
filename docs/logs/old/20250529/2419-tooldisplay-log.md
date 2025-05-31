# Tool Display UI Enhancement Log

## Objective
Update the ToolCallDisplay and ToolResultDisplay components to show a more compact, expandable format:
- Tool calls show as: "⏺ ToolName(parameters)..."
- Tool results show collapsed with expand option: "⎿ Read 36 lines (ctrl+r to expand)"

## Progress

### Step 1: Examine current components

Current state:
- ToolCallDisplay: Shows tool name with parameters in a bordered box with Terminal icon
- ToolResultDisplay: Shows full result in a pre-formatted box with overflow scrolling

Need to update:
1. ToolCallDisplay to show "⏺" instead of Terminal icon
2. ToolResultDisplay to show collapsed view with line count and expand option

### Step 2: Update ToolCallDisplay

✓ Removed Terminal icon import and replaced with ⏺ symbol
✓ Simplified styling - removed border and background
✓ Shows "..." when no parameters are available

### Step 3: Update ToolResultDisplay

✓ Added collapsed/expanded state with useState
✓ Shows summary like "Read 36 lines (ctrl+r to expand)"
✓ Uses "⏿" symbol for the collapsed indicator
✓ Provides context-aware summaries for different tool types
✓ Maintains the detailed view when expanded
✓ Added Ctrl+R keyboard shortcut to toggle expand/collapse

### Step 4: Summary of changes

The tool display components now show:
- Tool calls: "⏺ ToolName(parameters)..." with optional spinner when loading
- Tool results: "⏿ Read 36 lines (ctrl+r to expand)" with collapsible detailed view

This provides a cleaner, more compact display that matches the requested format while maintaining full functionality.