# Coder Pane Session Persistence Fix

## Date: 2025-05-27 15:11 PST

## Summary
Fixed multiple critical issues with the Coder pane's session persistence and state management. The main problems were:
1. Sessions not persisting when toggling panes with Cmd+1
2. Messages clearing when clicking between panes
3. Infinite re-render loops
4. Sessions not loading on page refresh or when opening from history with Cmd+click

## Issues Identified

### 1. Session Content Not Persisting on Toggle
**Problem**: When users loaded a chat session from history and then toggled the pane closed/open with Cmd+1, the chat messages would disappear.

**Root Cause**: The `toggleAllCoderPanes` action was not properly saving or restoring the pane's content (which includes the sessionId).

**Fix**: 
- Updated `closedPanePositions` type to include `content` field
- Modified `removePane` and `togglePane` actions to save content when closing
- Updated `toggleAllCoderPanes` to restore content when reopening

### 2. Messages Clearing When Clicking Between Panes
**Problem**: When multiple coder panes were open, clicking from one to another would clear the messages in the original pane.

**Root Cause**: 
- All coder panes were sharing the same global state (coderChatStore)
- The component was re-rendering and re-loading sessions unnecessarily

**Fix**:
- Removed global `coderChatStore` 
- Made each CoderPane use local React state
- Added React.memo to prevent unnecessary re-renders
- Used per-pane refs for menu state isolation

### 3. Infinite Re-render Loop
**Problem**: The CoderPane component was re-rendering continuously, causing performance issues and preventing proper functionality.

**Root Causes**:
- Modifying state during render (initializing sessionIdRef outside useEffect)
- Subscribing to entire `panes` array causing re-renders on any pane change
- Unstable dependencies in useEffect hooks

**Fix**:
- Moved sessionId initialization into useEffect
- Removed unnecessary subscription to `panes` array
- Stabilized useEffect dependencies
- Fixed React.memo comparison to include all props

### 4. Sessions Not Loading After Toggle/Refresh
**Problem**: Even when the sessionId was correctly restored, the messages weren't loading from the database.

**Root Causes**:
- The loading effect was using a boolean flag that prevented re-loading
- Runtime reinitialization was cancelling in-flight database queries
- Effect dependencies were causing the loading state to be lost

**Fix**:
- Changed from boolean `hasLoadedSession` to tracking `lastLoadedSessionIdRef`
- Only load when sessionId differs from last loaded
- Increased delay to 500ms to ensure runtime is ready
- Added proper error handling and logging

### 5. Pane Content Not Updating
**Problem**: When selecting a different chat session from history, the pane's stored content wasn't updating, causing the wrong session to restore on toggle.

**Root Cause**: No mechanism to update pane content after initial creation.

**Fix**:
- Created `updatePaneContent` action
- Call it whenever loading a new session
- Pass `paneId` prop to CoderPane for content updates

## Technical Implementation Details

### State Management Architecture
```typescript
// Updated closedPanePositions type
closedPanePositions: Record<string, {
  x: number;
  y: number;
  width: number;
  height: number;
  content?: any; // Added to store sessionId
  shouldRestore?: boolean; // Differentiates toggle vs manual close
}>
```

### Component State Isolation
Each CoderPane now maintains completely independent state:
- Local message state via useState
- Session tracking via useRef
- No shared global stores between instances

### Loading Logic Flow
1. Component mounts with initialSessionId prop
2. Check if sessionId differs from lastLoadedSessionIdRef
3. If different, update ref and load messages after 500ms delay
4. Update pane content in store for persistence
5. On unmount/remount, refs reset enabling reload

### Critical Discoveries

1. **Effect Runtime Timing**: The Effect runtime reinitializes after component mount during wallet setup, which can cancel in-flight database queries. Solution: Increased delay and added runtime to dependencies.

2. **React Strict Mode**: Double rendering in development exposed state management issues. Solution: Use refs for mount tracking instead of state.

3. **Zustand Store Updates**: Subscribing to store slices can cause cascading re-renders. Solution: Use minimal subscriptions and React.memo.

4. **Persistence Version Bumping**: Changed storage key from v4 to v5 to ensure clean migration when data structure changed.

## Lessons Learned

1. **Refs vs State for Mount Tracking**: Use refs when tracking if something has happened once per mount, as they don't cause re-renders and persist across strict mode double-renders.

2. **Component Isolation**: For multi-instance components (like multiple coder panes), always use local state rather than global stores to ensure true independence.

3. **Effect Dependencies**: Be extremely careful with effect dependencies. Including functions can cause infinite loops if they're recreated on each render.

4. **Async Operation Timing**: When dealing with external systems (like Effect runtime), always account for initialization timing with appropriate delays or retry logic.

5. **Debug Logging**: Systematic logging at each step of the data flow is crucial for debugging complex state management issues.

## Final Solution
The working solution combines:
- Local component state for messages
- Refs for tracking loaded sessions
- Store actions for content persistence  
- Proper effect dependencies
- Timing delays for runtime initialization
- React.memo for performance

This ensures that coder panes maintain their session state across all user interactions: toggling, clicking between panes, refreshing the page, and opening new instances.