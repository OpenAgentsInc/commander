# Pane System Fix - Part 3

## Issue Analysis

After implementing the previous fixes, the drag issue still persists, particularly when starting to drag a non-active pane. The pane either stops after a short movement or doesn't move smoothly.

The root cause appears to be a subtle race condition or state desynchronization between React's rendering cycle and `@use-gesture`'s event handling when the pane's `isActive` status changes during drag initiation. This happens because:

1. The initial drag gesture uses the pane's position at the time the drag starts
2. When we activate a non-active pane, the state updates may reset or interfere with the drag tracking
3. The `@use-gesture` library's internal state (offset calculations) gets confused when React re-renders components

## Implementation Plan

1. Refine the drag logic in `Pane.tsx` to use a more robust approach for tracking position changes
2. Introduce a ref to track drag start coordinates for both pointer and pane position
3. Manually calculate position changes based on pointer movement deltas
4. Verify that the store actions are properly optimized
5. Update the `useResizeHandlers` hook for better state handling

## Implementation

### 1. Add Drag Start Ref to Pane Component

Added a ref to track both the mouse/pointer coordinates and the pane's position at the exact moment a drag operation starts:

```typescript
// Ref for drag start coordinates (pointer and pane)
const dragStartRef = useRef<{ x: number, y: number, paneX: number, paneY: number } | null>(null);
```

This ref acts as a stable reference point throughout the entire drag operation, unaffected by React re-renders or state changes.

### 2. Replace the Drag Handler Logic

Completely overhauled the `bindDrag` implementation to:

1. Use the `xy` parameter instead of `offset` from `@use-gesture`
2. Calculate position changes manually based on pointer movement relative to the initial position
3. Track the initial position more reliably
4. Properly clean up the ref state

```typescript
const bindDrag = useDrag(
  ({ active, xy: [pointerX, pointerY], first, last, event }) => {
    setIsDragging(active);
    event.stopPropagation();

    if (first) {
      // Record the starting positions for the drag
      dragStartRef.current = { 
        x: pointerX, 
        y: pointerY, 
        paneX: position.x, 
        paneY: position.y 
      };
    }

    if (active && dragStartRef.current) {
      // Calculate delta from initial pointer position
      const deltaX = pointerX - dragStartRef.current.x;
      const deltaY = pointerY - dragStartRef.current.y;

      // Apply delta to initial pane position
      let newX = dragStartRef.current.paneX + deltaX;
      let newY = dragStartRef.current.paneY + deltaY;

      // Apply bounds
      newX = Math.max(bounds.left, Math.min(newX, bounds.right));
      newY = Math.max(bounds.top, Math.min(newY, bounds.bottom));

      setPosition({ x: newX, y: newY });

      if (last) {
        updatePanePosition(id, newX, newY);
        dragStartRef.current = null;
      }
    } else if (!active && dragStartRef.current) { 
      // Cleanup if drag ends unexpectedly
      dragStartRef.current = null;
    }
  },
  {
    // No `from` needed here as we manually calculate offset
  }
);
```

The key difference is that we now rely on the absolute pointer coordinates (`xy`) rather than the gesture library's calculated offsets, making the drag operation more stable during React state changes.

### 3. Improved useResizeHandlers Hook

Updated the `useEffect` hooks in `useResizeHandlers` to add additional checks that prevent redundant state updates:

```typescript
useEffect(() => {
  if (!isCurrentlyInteracting) {
    if (initialPosition.x !== prevPositionRef.current.x || initialPosition.y !== prevPositionRef.current.y) {
      // Only call setPosition if the current position is different from initialPosition
      if (initialPosition.x !== position.x || initialPosition.y !== position.y) {
        setPosition(initialPosition);
      }
      prevPositionRef.current = initialPosition;
    }
  }
}, [initialPosition.x, initialPosition.y, isCurrentlyInteracting, position.x, position.y]);
```

Similar changes were made to the size effect. This prevents unnecessary state updates that could interfere with ongoing gestures.

### 4. Enhanced Store Actions

Further optimized the `bringPaneToFrontAction` to minimize state changes:

1. Added more precise checks for when updates to `lastPanePosition` are truly needed
2. Added tracking for when pane objects actually need to be recreated
3. Added a special case for when only activation changes but not order
4. Improved state preservation when no changes are needed

Key improvements:

```typescript
// Reuse objects when possible
let panesArrayIdentityChanged = false;
const newPanesArrayWithActivation = state.panes.map(pane => {
  const shouldBeActive = pane.id === idToBringToFront;
  if (pane.isActive !== shouldBeActive) {
    panesArrayIdentityChanged = true;
    return { ...pane, isActive: shouldBeActive };
  }
  return pane; // Keep original reference
});

// Special case for activation-only changes
if (panesArrayIdentityChanged && !needsReordering) {
   return {
      panes: newPanesArrayWithActivation,
      activePaneId: idToBringToFront,
      lastPanePosition: { /* ... */ }
   };
}
```

### 5. Simplified Activation Logic

Removed the dependency on `setActivePane` since `bringPaneToFront` now handles both activation and z-index ordering efficiently. This helps prevent multiple state updates that could interfere with drag operations.

### 6. Improved Type Safety

Added a proper type definition for the resize handler parameters instead of using `any`:

```typescript
type ResizeHandlerParams = {
  active: boolean;
  movement: [number, number];
  first: boolean;
  last: boolean;
  memo: typeof resizeStartRef.current | null;
};

const makeResizeHandler = (corner: ResizeCorner) => {
  return ({ active, movement: [deltaX, deltaY], first, last, memo }: ResizeHandlerParams) => {
    // ...
  };
};
```

This improves type safety and makes the code more maintainable.

## Result

The changes implemented provide a much more stable dragging experience by:

1. Using absolute pointer coordinates instead of relative offsets
2. Maintaining stable reference points throughout the drag operation
3. Manually calculating position changes based on these stable references
4. Minimizing unnecessary React state updates during interaction
5. Preventing object recreation when not needed
6. Improving type safety with proper TypeScript types

This approach is more resistant to the race conditions and state synchronization issues that were causing the dragging problems, particularly when activating a non-active pane during drag initiation.