# Cursor Focus Fix Log - 2025-05-29 12:33

## Problem
When multiple coder panes are open, their input fields fight for focus, causing the cursor to jump between different panes' inputs.

## Root Cause
The `CoderProseMirrorInput` component was auto-focusing on mount and when `focusKey` changed, without checking if its pane was the active one. This caused all coder pane inputs to try to grab focus simultaneously.

## Solution
Modified the focus behavior to only focus the input if the pane is the active one:

1. **Pass paneId to CoderProseMirrorInput**: Modified `CoderPane` to pass its `paneId` to the input component
2. **Check active pane state**: In `AutoFocusEditor`, added logic to check if the current pane is active using `usePaneStore`
3. **Conditional focus**: Only auto-focus if:
   - The pane is active (`paneId === activePaneId`)
   - The input is not disabled
   - For focusKey changes, also check if pane is active
4. **Focus on pane activation**: Added an effect in `CoderPane` that increments `localFocusKey` when the pane becomes active, triggering a focus

## Changes Made

### `/src/components/coder/CoderPane.tsx`
- Added `activePaneId` from pane store
- Added effect to increment `localFocusKey` when pane becomes active
- Pass `paneId` prop to `CoderProseMirrorInput`

### `/src/components/coder/CoderProseMirrorInput.tsx`
- Added `paneId` prop to interface
- Import `usePaneStore` to access active pane state
- Added `isThisPaneActive` check in `AutoFocusEditor`
- Modified both auto-focus effects to only focus when pane is active

## Result
Now only the active (topmost) coder pane's input will be focused, preventing cursor fighting between multiple panes.