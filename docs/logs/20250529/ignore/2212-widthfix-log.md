# Tool Result Display Width Fix Log

## Issue
Tool result displays (like the server log content) were breaking the chat layout by extending beyond the container width, causing horizontal truncation at the screen edge.

## Root Cause
The `ToolResultDisplay` component was using conflicting CSS classes:
- `whitespace-pre-wrap` (wraps lines)
- `break-all` (breaks words anywhere)
- `overflow-x-auto` (allows horizontal scroll)

This combination caused unpredictable width behavior.

## Solution
1. Added `max-w-full` to the outer container to respect parent width
2. Changed from `whitespace-pre-wrap` to `whitespace-pre` to preserve formatting
3. Removed `break-all` to prevent word breaking
4. Simplified overflow from separate x/y to unified `overflow-auto`

## Changes Made
- File: `src/components/coder/ToolResultDisplay.tsx`
- Added width constraint to outer container
- Adjusted whitespace and overflow handling for better scrolling behavior

## Result
Tool results now properly scroll horizontally within their container instead of breaking the layout.