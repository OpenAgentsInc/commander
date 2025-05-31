# Fix: Auto-scroll and Infinite Loop Issues

## Problem
Messages weren't auto-scrolling to the bottom when new messages arrived in the CoderPane.

## Root Cause
The message container was using `flex-col-reverse` which inverts the normal scroll behavior. With this CSS class:
- Messages appear from bottom to top
- The scroll position logic is inverted
- The auto-scroll hook wasn't working correctly with the reversed layout

## Solution
1. Removed `flex-col-reverse` from the message container
2. Messages now flow normally from top to bottom
3. Added initial scroll to bottom on component mount
4. Added scroll to bottom after loading messages from database

### Code Changes
- Changed container class from `flex flex-col-reverse` to just `flex`
- Added `useEffect` to scroll on mount:
  ```typescript
  useEffect(() => {
    const timer = setTimeout(() => {
      scrollToBottom();
    }, 100);
    return () => clearTimeout(timer);
  }, []);
  ```
- Added scroll after loading messages in `loadMessagesForSessionInternal`

## Result
- Messages now auto-scroll to bottom when new messages arrive
- Chat stays at bottom when receiving streaming responses
- Users can still scroll up to view history (auto-scroll pauses)
- Scrolling back to near bottom re-enables auto-scroll

## Infinite Loop Fix

### Problem
After the auto-scroll fix, sessions were loading in an infinite loop, showing repeated "Loaded 2 messages from DB" logs.

### Root Cause
The useEffect for loading sessions had too many dependencies, including:
- `loadMessagesForSessionInternal` (a useCallback function)
- `messages.length`
- Other functions that change frequently

When these dependencies changed, it would trigger the effect again, causing infinite reloading.

### Solution
Reduced the useEffect dependencies to only the essential ones:
- `[initialSessionId, paneId]` for the session loading effect
- `[paneId, runtime]` for the loadMessagesForSessionInternal callback

This prevents the effect from re-running unnecessarily while still responding to actual prop changes.

### Result
- No more infinite loading loops
- Sessions load only once when needed
- Performance is improved with fewer re-renders