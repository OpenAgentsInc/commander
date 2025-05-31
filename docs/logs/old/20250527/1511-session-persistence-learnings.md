# Coder Pane Session Persistence Issues - Learning Document

## Overview
This document captures the key learnings from attempting to fix session persistence in the Coder Pane component. The main issue was that chat sessions would disappear when toggling panes or refreshing the page.

## The Core Problem
When a user:
1. Opens coder mode (Cmd+1)
2. Selects a chat from history
3. Closes the pane (Cmd+1 again)
4. Reopens the pane
5. The chat session is gone

Additionally, after page refresh, pane positions were restored but chat sessions were not.

## Key Issues Discovered

### 1. Ref vs State for Tracking Loaded Sessions
**Problem**: Using refs to track which sessions have been loaded doesn't work well with React's lifecycle and re-renders.

```typescript
// BAD: This approach caused issues
const lastLoadedSessionIdRef = useRef<string | null>(null);

// The ref would persist across re-renders, preventing re-loading after refresh
if (sessionId === lastLoadedSessionIdRef.current) {
  return; // This would block loading after refresh!
}
```

**Learning**: React refs persist values across re-renders but don't trigger re-renders themselves. This made them unsuitable for tracking loading state that needs to be reactive.

### 2. UseEffect Dependency Arrays and Infinite Loops
**Problem**: Incorrect dependencies in useEffect hooks caused infinite re-render loops.

```typescript
// BAD: Including unstable objects in dependencies
useEffect(() => {
  // Loading logic
}, [messages, loadSessionMessages]); // loadSessionMessages changes every render!
```

**Learning**: 
- Functions defined in components are recreated on every render unless wrapped in useCallback
- Including state that the effect updates in dependencies causes loops
- Solution: Use stable references or carefully manage dependencies

### 3. Component State vs Global Store
**Problem**: All coder panes shared the same global Zustand store, causing state conflicts.

```typescript
// BAD: Global store shared by all instances
const coderChatStore = create<CoderChatStore>((set) => ({
  messages: [],
  // All panes would share these messages!
}));
```

**Learning**: When multiple instances of a component need independent state, use local React state instead of a global store.

### 4. Pane Content Persistence Strategy
**Problem**: Saving just positions wasn't enough - needed to save content too.

```typescript
// Evolution of the solution:
// 1. First: Just saved positions
closedPanePositions: Record<string, { x, y, width, height }>

// 2. Better: Added content field
closedPanePositions: Record<string, { 
  x, y, width, height, 
  content?: any 
}>

// 3. Final: Added shouldRestore flag
closedPanePositions: Record<string, { 
  x, y, width, height, 
  content?: any,
  shouldRestore?: boolean 
}>
```

**Learning**: Position persistence needs to be coupled with content persistence for a complete solution.

### 5. The Active vs Last Drag Issue
**Problem**: Drag handler only saved position when `active=true`, but the gesture library sets `active=false` when `last=true`.

```typescript
// BAD: Only checking active
if (active) {
  updatePanePositionAction(/* ... */);
}

// GOOD: Check both conditions
if (active || last) {
  updatePanePositionAction(/* ... */);
}
```

**Learning**: Always check library documentation for state transitions. The @use-gesture/react library has specific patterns for tracking gesture completion.

### 6. Loading State Management
**Problem**: Complex loading states when dealing with initial load vs subsequent loads.

```typescript
// The challenge: How to differentiate between:
// 1. Initial mount with no sessionId
// 2. Initial mount with a sessionId (from props)
// 3. Session change after mount
// 4. Re-mount after refresh with same sessionId
```

**Learning**: Need clear state management strategy:
- Use a combination of flags (hasLoadedMessages) and IDs (currentSessionId)
- Consider the component lifecycle carefully
- Test all scenarios: initial load, session switch, refresh, toggle

### 7. React.memo and Performance
**Problem**: Unnecessary re-renders causing performance issues and state conflicts.

```typescript
// Solution: Memoize expensive renders
{React.useMemo(() => 
  messages.map((msg, index) => (
    <ChatMessage key={index} message={msg} />
  )),
  [messages]
)}
```

**Learning**: When dealing with lists and complex state updates, memoization can prevent cascading re-renders.

## The Final Architecture Pattern

The solution required a multi-layered approach:

1. **Local State for Instance Data**: Each CoderPane maintains its own messages and session state
2. **Global Store for Positions**: Pane positions and metadata stored in Zustand
3. **Smart Toggle Logic**: Differentiate between toggle-close (Cmd+1) and permanent close (X button)
4. **Content Restoration**: When toggling open, restore both position AND content
5. **Database Integration**: Properly load messages from DB on mount when sessionId is provided

## Remaining Challenge

The last issue encountered was that after page refresh, the loading effect would run but messages wouldn't appear. The logs showed:
- Before refresh: "Loaded 2 messages from DB"
- After refresh: Loading effect runs but condition prevents actual load

This suggests the loading state management still needs refinement to handle the page refresh scenario properly.

## Key Takeaways

1. **State Management Complexity**: Managing state across component lifecycles, especially with persistence, requires careful planning
2. **React Lifecycle Understanding**: Deep understanding of useEffect, refs, and re-render triggers is crucial
3. **Testing All Scenarios**: Must test initial load, updates, unmount/remount, and page refresh
4. **Debugging Techniques**: Strategic console.logs at key points helped identify where the flow was breaking
5. **Iterative Problem Solving**: Each fix revealed new edge cases, requiring patience and systematic debugging

## Recommendations for Future Development

1. Consider a more robust session management system with explicit save/restore APIs
2. Add comprehensive tests for all user interaction patterns
3. Document the expected behavior for each scenario clearly
4. Consider using a state machine library for complex UI state management
5. Add development tools to visualize pane state and session data