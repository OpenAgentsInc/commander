# Fix: Multiple Coder Pane Issues

## Problem 1: Multiple Panes Loading Same Session
When opening a new coder pane while another was loading, both panes would try to load the same session, causing:
- The first pane to get stuck with loading indicator
- Both input boxes to become unresponsive
- Race conditions between the panes

## Root Cause
The `toggleCoderPane` action was using `toggleAllCoderPanesAction` which:
1. Closes ALL coder panes if any exist
2. Restores ALL previously closed panes (with their old sessions) if none exist
3. This caused multiple panes to share the same session ID

## Solution 1: New Open Coder Pane Action
Created `openNewCoderPaneAction` that:
- Always opens a NEW coder pane with a unique session ID
- Offsets each new pane by 30 pixels from existing ones
- Generates unique pane ID and session ID using timestamp + random string
- Changed Cmd+1 to use this action instead of toggle all

## Solution 2: Prevent Concurrent Loading
Added loading state protection:
- Added `isLoadingRef` to track loading state across renders
- Check if already loading before starting new load
- This prevents multiple loads from interfering with each other

## Code Changes
1. Created `src/stores/panes/actions/openNewCoderPane.ts`
2. Updated `toggleCoderPane` in store to use `openNewCoderPaneAction`
3. Added loading ref check in `loadMessagesForSessionInternal`

## Result
- Cmd+1 now always opens a new coder pane with fresh session
- Multiple panes can coexist without conflicts
- Loading states are properly isolated
- Input boxes remain responsive